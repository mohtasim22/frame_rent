import { prisma } from "../../lib/prisma";
import type { Prisma } from "../../generated/prisma/client";
import type { GearQuery } from "@shared/schemas/gear.schema";
import { NotFoundError } from "../../lib/errors";

const ORDER_BY = {
  name: { name: "asc" },
  "price-asc": { dailyRateCents: "asc" },
  "price-desc": { dailyRateCents: "desc" },
  newest: { createdAt: "desc" },
} as const;

const PRODUCT_INCLUDE = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { units: true } },
} as const;


function buildWhere(query: GearQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (query.category) where.category = { slug: query.category };
  if (query.brand) where.brand = { slug: query.brand };
  if (query.mount) where.mount = query.mount;

  if (query.minCents !== undefined || query.maxCents !== undefined) {
    where.dailyRateCents = { gte: query.minCents, lte: query.maxCents };
  }

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { brand: { name: { contains: query.q, mode: "insensitive" } } },
    ];
  }

  return where;
}

export const gearService = {
  async list(query: GearQuery) {
    const where = buildWhere(query);

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [ORDER_BY[query.sort], { id: "asc" }],
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        include: PRODUCT_INCLUDE,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total };
  },

  async getBySlug(slug: string) {
    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundError(`No gear found with slug "${slug}"`);
    }

    return product;
  },
};

