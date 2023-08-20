import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

type Migration = {
  readonly id: string;
  sql: string;
};
const migrations: readonly Migration[] = [
  {
    id: "20230819070226_dev",
    sql: fs.readFileSync(
      path.join(__dirname, "../../prisma/migrations", "20230819070226_dev", "migration.sql"),
      "utf-8",
    ),
  },
  // ...
];

async function execute(query: string, exec: (singleQuery: string) => Promise<void>): Promise<void> {
  for (const q of query.split(";")) {
    if (q.trim() === "") continue;
    await exec(q);
  }
}

export async function migrate(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`create table if not exists _migrations(
    id text primary key not null
  )`;

  const rawResult = await prisma.$queryRaw`select id from _migrations order by id`;
  const appliedIds = new Set(
    (rawResult as unknown[]).map((row) => {
      const typed = row as { id: string };
      return typed.id;
    }),
  );

  for (const { id, sql } of migrations) {
    if (appliedIds.has(id)) continue;
    console.log(`Migration: ${id}`);
    await execute(sql, async (q) => {
      console.log(`Execute: ${q}`);
      await prisma.$executeRawUnsafe(q);
    });
    await prisma.$executeRaw`insert into _migrations(id) values (${id})`;
    console.log("Applied: ${id}");
  }
}
