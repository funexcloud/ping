import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

function sqliteUrlForAdapter(): string {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) {
    return raw;
  }
  const withoutScheme = raw.slice("file:".length);
  const resolved = path.isAbsolute(withoutScheme)
    ? withoutScheme
    : path.resolve(process.cwd(), withoutScheme);
  return `file:${resolved}`;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: sqliteUrlForAdapter(),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
