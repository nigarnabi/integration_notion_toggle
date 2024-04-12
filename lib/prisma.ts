import { PrismaClient } from "@prisma/client";

export const prisma =
  (globalThis as { prisma?: PrismaClient }).prisma ??
  new PrismaClient({ log: ["warn", "error"] });
if (process.env.NODE_ENV !== "production")
  (globalThis as { prisma?: PrismaClient }).prisma = prisma;
