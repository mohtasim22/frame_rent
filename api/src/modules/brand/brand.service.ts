import { prisma } from "../../lib/prisma";

export const brandService = {
  listAll() {
    return prisma.brand.findMany({ orderBy: { name: "asc" } });
  },
};
