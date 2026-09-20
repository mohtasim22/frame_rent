import { prisma } from "../../lib/prisma";
import { BLOCKING_BOOKING_STATUSES } from "@shared/types/domain";
import type { DateRange } from "./overlap";
import { findFreeUnitId, unavailableDays } from "./availability";
import { addDays, eachDay, padRange } from "./dates";

/**
 * Prisma returns a @db.Date column as a Date at UTC midnight.
 * Slicing the ISO string is therefore exact — and timezone-proof.
 */
export function toDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
}
type UnitWithRanges = { id: string; ranges: DateRange[] };

/**
 * Every bookable unit of a product, with the ranges that make it busy in
 * [from, to] — bookings (widened by the turnaround buffer) plus maintenance holds.
 */
async function loadUnitRanges(
    productId: string,
    from: string,
    to: string,
): Promise<UnitWithRanges[]> {
    const [product, units] = await Promise.all([
        prisma.product.findUnique({ where: { id: productId }, select: { bufferDays: true } }),
        prisma.gearUnit.findMany({
            where: { productId, status: "AVAILABLE" },
            select: { id: true },
            orderBy: { serialNumber: "asc" },
        }),
    ]);

    if (units.length === 0) return [];

    const bufferDays = product?.bufferDays ?? 0;
    const unitIds = units.map((unit) => unit.id);
    const windowStart = new Date(`${addDays(from, -bufferDays)}T00:00:00Z`);
    const windowEnd = new Date(`${addDays(to, bufferDays)}T00:00:00Z`);

    const [items, holds] = await Promise.all([
        prisma.bookingItem.findMany({
            where: {
                gearUnitId: { in: unitIds },
                booking: {
                    status: { in: [...BLOCKING_BOOKING_STATUSES] },
                    startDate: { lte: windowEnd },
                    endDate: { gte: windowStart },
                },
            },
            select: {
                gearUnitId: true,
                booking: { select: { startDate: true, endDate: true } },
            },
        }),
        prisma.maintenanceHold.findMany({
            where: {
                gearUnitId: { in: unitIds },
                startDate: { lte: windowEnd },
                endDate: { gte: windowStart },
            },
            select: { gearUnitId: true, startDate: true, endDate: true },
        }),
    ]);

    const byUnit = new Map<string, DateRange[]>(units.map((unit) => [unit.id, []]));

    for (const item of items) {
        byUnit.get(item.gearUnitId)?.push(
            padRange(
                {
                    start: toDateString(item.booking.startDate),
                    end: toDateString(item.booking.endDate),
                },
                bufferDays,
            ),
        );
    }

    // Holds are NOT padded: a maintenance hold already is the servicing window.
    for (const hold of holds) {
        byUnit.get(hold.gearUnitId)?.push({
            start: toDateString(hold.startDate),
            end: toDateString(hold.endDate),
        });
    }

    return units.map((unit) => ({ id: unit.id, ranges: byUnit.get(unit.id) ?? [] }));
}


export const availabilityService = {
    async getBookedRanges(gearUnitId: string): Promise<DateRange[]> {
        const items = await prisma.bookingItem.findMany({
            where: {
                gearUnitId,
                booking: { status: { in: [...BLOCKING_BOOKING_STATUSES] } },
            },
            select: {
                booking: { select: { startDate: true, endDate: true } },
            },
            orderBy: { booking: { startDate: "asc" } },
        });

        return items.map((item) => ({
            start: toDateString(item.booking.startDate),
            end: toDateString(item.booking.endDate),
        }));
    },

    async getUnavailableDates(productId: string, from: string, to: string): Promise<string[]> {
        const units = await loadUnitRanges(productId, from, to);
        if (units.length === 0) return eachDay(from, to);

        return unavailableDays(units.map((unit) => unit.ranges), from, to);
    },

    /**
     * ADVISORY ONLY. By the time the caller acts on this, another request may have
     * taken the unit — F5 re-checks inside the booking transaction.
     */
    async findAvailableUnit(productId: string, start: string, end: string): Promise<string | null> {
        const units = await loadUnitRanges(productId, start, end);
        return findFreeUnitId(units, { start, end });
    },


};
