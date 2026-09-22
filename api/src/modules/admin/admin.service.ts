import { prisma } from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../lib/errors";
import {
  canTransition,
  lateFeeCents,
  nextStatuses,
} from "@shared/lib/lifecycle";
import { blockingBookingWhere } from "../availability/blocking";
import { paymentService } from "../payment/payment.service";
import type { BookingStatus } from "@shared/types/domain";
import type {
  AdminBookingQuery,
  AdminBookingRow,
  Dashboard,
  HoldInput,
  Occupancy,
  OccupancyCell,
  ProductInput,
  ReturnBooking,
  UnitRow,
} from "@shared/schemas/admin.schema";
import { toDateString } from "../availability/availability.service";
import { addDays, eachDay } from "../availability/dates";
import { overlaps } from "../availability/overlap";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDate(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

const ROW_SELECT = {
  id: true,
  reference: true,
  status: true,
  startDate: true,
  endDate: true,
  totalCents: true,
  feeCents: true,
  user: { select: { name: true, email: true } },
  items: { select: { productName: true } },
} as const;

type RowSource = Prisma.BookingGetPayload<{ select: typeof ROW_SELECT }>;

function toRow(booking: RowSource): AdminBookingRow {
  const [first, ...rest] = booking.items;

  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    startDate: toDateString(booking.startDate),
    endDate: toDateString(booking.endDate),
    totalCents: booking.totalCents,
    feeCents: booking.feeCents,
    itemCount: booking.items.length,
    headline:
      rest.length === 0
        ? (first?.productName ?? "Booking")
        : `${first.productName} + ${rest.length} more`,
    customerName: booking.user.name,
    customerEmail: booking.user.email,
    nextStatuses: [...nextStatuses(booking.status)],
  };
}

export const adminService = {
  async listBookings(
    query: AdminBookingQuery,
  ): Promise<{ rows: AdminBookingRow[]; total: number }> {
    const where: Prisma.BookingWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.from) where.endDate = { gte: toDate(query.from) };
    if (query.to) where.startDate = { lte: toDate(query.to) };

    if (query.q) {
      where.OR = [
        { reference: { contains: query.q, mode: "insensitive" } },
        { user: { name: { contains: query.q, mode: "insensitive" } } },
        { user: { email: { contains: query.q, mode: "insensitive" } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: ROW_SELECT,
        // Second key breaks ties, so page 2 can never repeat a row from page 1.
        orderBy: [{ startDate: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.booking.count({ where }),
    ]);

    return { rows: bookings.map(toRow), total };
  },

  /**
   * The lifecycle rules live in shared/lib/lifecycle.ts, so the buttons the
   * admin UI offers and the transitions this accepts cannot drift apart.
   */
  async transition(
    reference: string,
    to: BookingStatus,
  ): Promise<AdminBookingRow> {
    const booking = await prisma.booking.findUnique({
      where: { reference },
      select: { id: true, status: true },
    });

    if (booking === null) {
      throw new NotFoundError(`No booking with reference ${reference}`);
    }

    if (!canTransition(booking.status, to)) {
      throw new ConflictError(
        `A ${booking.status} booking cannot become ${to}`,
        "ILLEGAL_TRANSITION",
      );
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: to },
      select: ROW_SELECT,
    });

    // Handing the gear over is when the deposit hold starts, not checkout —
    // a card authorisation only lives about seven days.
    if (to === "PICKED_UP" && paymentService.enabled) {
      await paymentService.holdDeposit(booking.id);
    }

    return toRow(updated);
  },

  /**
   * Taking gear back: move to RETURNED, record each unit's condition, and
   * charge for the days it was late — capped at the deposit, because a rental
   * shop that can bill you more than you left with has a different business.
   */
  async receiveReturn(
    reference: string,
    input: ReturnBooking,
  ): Promise<AdminBookingRow> {
    const returnedOn = input.returnedOn ?? today();

    const booking = await prisma.booking.findUnique({
      where: { reference },
      select: {
        id: true,
        status: true,
        endDate: true,
        depositCents: true,
        subtotalCents: true,
        items: { select: { gearUnitId: true, dailyRateCents: true } },
      },
    });

    if (booking === null) {
      throw new NotFoundError(`No booking with reference ${reference}`);
    }

    if (!canTransition(booking.status, "RETURNED")) {
      throw new ConflictError(
        `A ${booking.status} booking cannot be returned`,
        "ILLEGAL_TRANSITION",
      );
    }

    const endDate = toDateString(booking.endDate);
    if (returnedOn < endDate) {
      throw new BadRequestError(
        `Returned on ${returnedOn}, before the rental ended on ${endDate}`,
        "RETURNED_TOO_EARLY",
      );
    }

    const dailyTotal = booking.items.reduce(
      (sum, item) => sum + item.dailyRateCents,
      0,
    );
    const feeCents = lateFeeCents(
      dailyTotal,
      endDate,
      returnedOn,
      booking.depositCents,
    );

    const updated = await prisma.$transaction(async (tx) => {
      if (input.condition) {
        await tx.gearUnit.updateMany({
          where: { id: { in: booking.items.map((item) => item.gearUnitId) } },
          data: { condition: input.condition, notes: input.notes ?? null },
        });
      }

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "RETURNED",
          feeCents,
          totalCents: booking.subtotalCents + booking.depositCents + feeCents,
        },
        select: ROW_SELECT,
      });
    });

    // Capture the late fee out of the hold, or release it. Deliberately after
    // the transaction commits: a Stripe call inside a database transaction
    // holds locks across a network round trip, and cannot be rolled back
    // anyway once the money has moved.
    if (paymentService.enabled) {
      await paymentService.settleDeposit(booking.id, feeCents);
    }

    return toRow(updated);
  },

  /* ---------------------------------------------------------------- products */

  /**
   * Every product, archived ones included. The public catalogue filters on
   * isActive, so without this an archived product would be invisible to the
   * admin too — making "archive" a one-way door.
   */
  async listProducts() {
    return prisma.product.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { units: true } },
      },
    });
  },

  async createProduct(input: ProductInput) {
    return prisma.product.create({
      data: { ...input, specs: input.specs as Prisma.InputJsonValue },
      select: { id: true, slug: true, name: true },
    });
  },

  async updateProduct(id: string, input: Partial<ProductInput>) {
    const exists = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (exists === null) throw new NotFoundError("No such product");

    return prisma.product.update({
      where: { id },
      data: {
        ...input,
        specs:
          input.specs === undefined
            ? undefined
            : (input.specs as Prisma.InputJsonValue),
      },
      select: { id: true, slug: true, name: true, isActive: true },
    });
  },

  /**
   * Archive, never delete. A product with bookings against it is history; the
   * catalogue hides it by filtering on isActive, which every public query does.
   */
  async archiveProduct(id: string) {
    const exists = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (exists === null) throw new NotFoundError("No such product");

    return prisma.product.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, slug: true, isActive: true },
    });
  },

  async setProductImages(id: string, images: string[]) {
    const exists = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (exists === null) throw new NotFoundError("No such product");

    return prisma.product.update({
      where: { id },
      data: { images },
      select: { id: true, slug: true, images: true },
    });
  },

  /* ------------------------------------------------------------------- units */

  async listUnits(productId: string): Promise<UnitRow[]> {
    return prisma.gearUnit.findMany({
      where: { productId },
      orderBy: { serialNumber: "asc" },
      select: {
        id: true,
        serialNumber: true,
        condition: true,
        status: true,
        notes: true,
      },
    });
  },

  async addUnit(
    productId: string,
    input: Omit<UnitRow, "id">,
  ): Promise<UnitRow> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (product === null) throw new NotFoundError("No such product");

    return prisma.gearUnit.create({
      data: { ...input, productId },
      select: {
        id: true,
        serialNumber: true,
        condition: true,
        status: true,
        notes: true,
      },
    });
  },

  async updateUnit(
    id: string,
    input: Partial<Omit<UnitRow, "id">>,
  ): Promise<UnitRow> {
    const unit = await prisma.gearUnit.findUnique({
      where: { id },
      select: { id: true },
    });
    if (unit === null) throw new NotFoundError("No such unit");

    // Retiring a unit that is already promised to somebody would silently
    // break their booking, so refuse until those bookings are dealt with.
    if (input.status === "RETIRED") {
      const promised = await prisma.bookingItem.count({
        where: {
          gearUnitId: id,
          endDate: { gte: toDate(today()) },
          booking: blockingBookingWhere(),
        },
      });

      if (promised > 0) {
        throw new ConflictError(
          `This unit has ${promised} live booking(s). Move or cancel them first.`,
          "UNIT_HAS_BOOKINGS",
        );
      }
    }

    return prisma.gearUnit.update({
      where: { id },
      data: input,
      select: {
        id: true,
        serialNumber: true,
        condition: true,
        status: true,
        notes: true,
      },
    });
  },

  /* ------------------------------------------------------------------- holds */

  async createHold(input: HoldInput) {
    const unit = await prisma.gearUnit.findUnique({
      where: { id: input.gearUnitId },
      select: { id: true, serialNumber: true },
    });
    if (unit === null) throw new NotFoundError("No such unit");

    const clash = await prisma.bookingItem.findFirst({
      where: {
        gearUnitId: unit.id,
        startDate: { lte: toDate(input.end) },
        endDate: { gte: toDate(input.start) },
        booking: blockingBookingWhere(),
      },
      select: { booking: { select: { reference: true } } },
    });

    if (clash) {
      throw new ConflictError(
        `That window clashes with booking ${clash.booking.reference}`,
        "HOLD_CLASHES",
      );
    }

    const hold = await prisma.maintenanceHold.create({
      data: {
        gearUnitId: unit.id,
        reason: input.reason,
        startDate: toDate(input.start),
        endDate: toDate(input.end),
      },
      select: { id: true, reason: true, startDate: true, endDate: true },
    });

    return {
      id: hold.id,
      gearUnitId: unit.id,
      serialNumber: unit.serialNumber,
      reason: hold.reason,
      start: toDateString(hold.startDate),
      end: toDateString(hold.endDate),
    };
  },

  async deleteHold(id: string) {
    const hold = await prisma.maintenanceHold.findUnique({
      where: { id },
      select: { id: true },
    });
    if (hold === null) throw new NotFoundError("No such hold");

    await prisma.maintenanceHold.delete({ where: { id } });
    return { id };
  },

  /* --------------------------------------------------------------- dashboard */

  async dashboard(): Promise<Dashboard> {
    const date = today();
    const day = toDate(date);

    const [pickups, returns, overdue, maintenance, unitsTotal, outNow] =
      await Promise.all([
        prisma.booking.findMany({
          where: { status: "CONFIRMED", startDate: day },
          select: ROW_SELECT,
          orderBy: { reference: "asc" },
        }),
        prisma.booking.findMany({
          where: { status: "PICKED_UP", endDate: day },
          select: ROW_SELECT,
          orderBy: { reference: "asc" },
        }),
        prisma.booking.findMany({
          where: {
            status: { in: ["PICKED_UP", "OVERDUE"] },
            endDate: { lt: day },
          },
          select: ROW_SELECT,
          orderBy: { endDate: "asc" },
        }),
        prisma.gearUnit.count({ where: { status: "MAINTENANCE" } }),
        prisma.gearUnit.count(),
        prisma.booking.count({
          where: { status: { in: ["PICKED_UP", "OVERDUE"] } },
        }),
      ]);

    return {
      date,
      pickupsDue: pickups.map(toRow),
      returnsDue: returns.map(toRow),
      overdue: overdue.map(toRow),
      unitsInMaintenance: maintenance,
      unitsTotal,
      outNow,
    };
  },

  /* --------------------------------------------------------------- occupancy */

  async occupancy(
    from: string,
    to: string,
    productId?: string,
  ): Promise<Occupancy> {
    const units = await prisma.gearUnit.findMany({
      where: productId ? { productId } : {},
      orderBy: [{ product: { name: "asc" } }, { serialNumber: "asc" }],
      select: {
        id: true,
        serialNumber: true,
        status: true,
        product: { select: { name: true, bufferDays: true } },
      },
    });

    if (units.length === 0) {
      return { from, to, dates: eachDay(from, to), rows: [] };
    }

    const unitIds = units.map((unit) => unit.id);
    const widest = Math.max(...units.map((unit) => unit.product.bufferDays), 0);

    const [items, holds] = await Promise.all([
      prisma.bookingItem.findMany({
        where: {
          gearUnitId: { in: unitIds },
          startDate: { lte: toDate(addDays(to, widest)) },
          endDate: { gte: toDate(addDays(from, -widest)) },
          booking: blockingBookingWhere(),
        },
        select: { gearUnitId: true, startDate: true, endDate: true },
      }),
      prisma.maintenanceHold.findMany({
        where: {
          gearUnitId: { in: unitIds },
          startDate: { lte: toDate(to) },
          endDate: { gte: toDate(from) },
        },
        select: { gearUnitId: true, startDate: true, endDate: true },
      }),
    ]);

    const dates = eachDay(from, to);

    const rows = units.map((unit) => {
      const bookings = items
        .filter((item) => item.gearUnitId === unit.id)
        .map((item) => ({
          start: toDateString(item.startDate),
          end: toDateString(item.endDate),
        }));

      const unitHolds = holds
        .filter((hold) => hold.gearUnitId === unit.id)
        .map((hold) => ({
          start: toDateString(hold.startDate),
          end: toDateString(hold.endDate),
        }));

      const buffer = unit.product.bufferDays;

      const days: OccupancyCell[] = dates.map((day) => {
        if (unit.status !== "AVAILABLE") return "offline";

        const cell = { start: day, end: day };

        if (bookings.some((range) => overlaps(range, cell))) return "booked";
        if (unitHolds.some((range) => overlaps(range, cell))) return "hold";

        const padded = bookings.some((range) =>
          overlaps(
            {
              start: addDays(range.start, -buffer),
              end: addDays(range.end, buffer),
            },
            cell,
          ),
        );

        return padded ? "buffer" : "free";
      });

      return {
        unitId: unit.id,
        serialNumber: unit.serialNumber,
        productName: unit.product.name,
        days,
      };
    });

    return { from, to, dates, rows };
  },
};
