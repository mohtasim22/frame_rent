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
 * Anything that can run these four queries: the global client, or a transaction
 * client handed out by `$transaction`. Structural, so neither one has to know
 * about the other.
 */
export type AvailabilityDb = Pick<
    typeof prisma,
    "product" | "gearUnit" | "bookingItem" | "maintenanceHold"
>;

/**
 * Every bookable unit of a product, with the ranges that make it busy in
 * [from, to] — bookings (widened by the turnaround buffer) plus maintenance holds.
 */
async function loadUnitRanges(
    db: AvailabilityDb,
    productId: string,
    from: string,
    to: string,
): Promise<UnitWithRanges[]> {
    const [product, units] = await Promise.all([
        db.product.findUnique({ where: { id: productId }, select: { bufferDays: true } }),
        db.gearUnit.findMany({
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
        db.bookingItem.findMany({
            where: {
                gearUnitId: { in: unitIds },
                startDate: { lte: windowEnd },
                endDate: { gte: windowStart },
                booking: { status: { in: [...BLOCKING_BOOKING_STATUSES] } },
            },
            select: { gearUnitId: true, startDate: true, endDate: true },
        }),
        db.maintenanceHold.findMany({
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
                { start: toDateString(item.startDate), end: toDateString(item.endDate) },
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
            select: { startDate: true, endDate: true },
            orderBy: { startDate: "asc" },
        });

        return items.map((item) => ({
            start: toDateString(item.startDate),
            end: toDateString(item.endDate),
        }));
    },

    async getUnavailableDates(productId: string, from: string, to: string): Promise<string[]> {
        const units = await loadUnitRanges(prisma, productId, from, to);
        if (units.length === 0) return eachDay(from, to);

        return unavailableDays(units.map((unit) => unit.ranges), from, to);
    },

    /**
     * Advisory when called with the global client: by the time the caller acts on
     * the answer, another request may have taken the unit.
     *
     * Authoritative when called with a transaction client that already holds a
     * lock on this product's units — which is what booking.service does.
     *
     * `exclude` holds units already handed out earlier in the same request.
     */
    async findAvailableUnit(
        productId: string,
        start: string,
        end: string,
        exclude: ReadonlySet<string> = new Set(),
        db: AvailabilityDb = prisma,
    ): Promise<string | null> {
        const units = await loadUnitRanges(db, productId, start, end);
        return findFreeUnitId(
            units.filter((unit) => !exclude.has(unit.id)),
            { start, end },
        );
    },


};
