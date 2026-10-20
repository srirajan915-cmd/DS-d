import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

// On Vercel serverless environment, copy the bundled SQLite file to /tmp/dev.db
// so that read and write operations (orders, DS, stock updates) work without read-only filesystem errors!
if (process.env.VERCEL) {
  const tmpDb = "/tmp/dev.db";
  const bundledDb = path.join(process.cwd(), "prisma", "dev.db");
  if (!fs.existsSync(tmpDb) && fs.existsSync(bundledDb)) {
    try {
      fs.copyFileSync(bundledDb, tmpDb);
    } catch (e) {
      console.warn("Could not copy sqlite to /tmp:", e);
    }
  }
  process.env.DATABASE_URL = `file:${tmpDb}`;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

