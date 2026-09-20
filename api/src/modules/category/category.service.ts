import { prisma } from "../../lib/prisma";

export const categoryService = {
  listAll() {
    return prisma.category.findMany({ orderBy: { name: "asc" } });
  },
};
