import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `env("DATABASE_URL")` throws while the config file is being LOADED, which
 * breaks every Prisma command equally — including `generate`, which does not
 * need a database at all. That matters because the frontend host runs
 * `npm install` for the whole workspace and has no DATABASE_URL.
 *
 * Reading process.env directly defers the failure to the commands that
 * actually connect (`migrate`, `db seed`), which report it clearly themselves.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
