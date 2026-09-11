import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance. Avoids exhausting the Postgres
// connection pool from repeated `new PrismaClient()` calls, especially
// important with tsx watch mode reloading modules.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
