import { sql } from "drizzle-orm";
import type { Database } from "./client";

// Parents before children, so every foreign key already exists when its row is inserted.
export const TABLES = [
  "profiles",
  "experiences",
  "experience_highlights",
  "education",
  "skill_groups",
  "skill_items",
  "projects",
  "project_technologies",
  "project_highlights",
  "project_links",
  "project_media",
  "resume_metadata",
  "contacts",
] as const;

export type TableName = (typeof TABLES)[number];
type Row = Record<string, unknown>;
export type TableRows = Record<TableName, Row[]>;

// Tables whose id is a Postgres identity column; profiles, resume_metadata and contacts use a fixed id.
const IDENTITY_TABLES = new Set<TableName>([
  "experiences",
  "experience_highlights",
  "education",
  "skill_groups",
  "skill_items",
  "projects",
  "project_technologies",
  "project_highlights",
  "project_links",
  "project_media",
]);

// SQLite stores booleans as 0/1.
const BOOLEAN_COLUMNS: Partial<Record<TableName, string[]>> = { experiences: ["current"] };

type SqliteDatabase = { prepare(query: string): { all(): Row[] }; close(): void };
type SqliteModule = { DatabaseSync: new (file: string, options?: { readOnly?: boolean }) => SqliteDatabase };

export function readSqliteRows(file: string): TableRows {
  // Node's built-in SQLite, loaded at runtime so bundlers never try to resolve it.
  const { DatabaseSync } = (process as unknown as { getBuiltinModule(id: string): SqliteModule }).getBuiltinModule("node:sqlite");
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const rows = {} as TableRows;
    for (const table of TABLES) {
      rows[table] = db.prepare(`SELECT * FROM "${table}" ORDER BY id`).all().map((row) => {
        const copy: Row = { ...row };
        for (const column of BOOLEAN_COLUMNS[table] ?? []) copy[column] = copy[column] === 1 || copy[column] === true;
        return copy;
      });
    }
    return rows;
  } finally {
    db.close();
  }
}

function rowsOf(result: unknown): Row[] {
  return (result as { rows: Row[] }).rows;
}

export async function importRows(db: Database, rows: TableRows, options: { replace?: boolean } = {}): Promise<void> {
  await db.transaction(async (tx) => {
    const [{ count }] = rowsOf(await tx.execute(sql`select count(*)::int as count from profiles`)) as { count: number }[];
    if (count > 0 && !options.replace) {
      throw new Error("The target database already has content. Re-run with --replace to overwrite it.");
    }
    // Every other table cascades from profiles.
    if (count > 0) await tx.execute(sql`delete from profiles`);

    for (const table of TABLES) {
      const override = IDENTITY_TABLES.has(table) ? sql`overriding system value` : sql``;
      for (const row of rows[table]) {
        const columns = Object.keys(row);
        await tx.execute(sql`insert into ${sql.identifier(table)} (${sql.join(columns.map((column) => sql.identifier(column)), sql`, `)}) ${override} values (${sql.join(columns.map((column) => sql`${row[column]}`), sql`, `)})`);
      }
      if (IDENTITY_TABLES.has(table)) {
        await tx.execute(sql`select setval(pg_get_serial_sequence(${table}, 'id'), coalesce((select max(id) from ${sql.identifier(table)}), 0) + 1, false)`);
      }
    }
  });
}

function sameRow(actual: Row, expected: Row): boolean {
  const keys = Object.keys(expected);
  return keys.length === Object.keys(actual).length && keys.every((key) => actual[key] === expected[key]);
}

export async function compareRows(db: Database, expected: TableRows): Promise<{ table: TableName; expected: number; actual: number; identical: boolean }[]> {
  const report: { table: TableName; expected: number; actual: number; identical: boolean }[] = [];
  for (const table of TABLES) {
    const actual = rowsOf(await db.execute(sql`select * from ${sql.identifier(table)} order by id`));
    const identical = actual.length === expected[table].length && actual.every((row, index) => sameRow(row, expected[table][index]));
    report.push({ table, expected: expected[table].length, actual: actual.length, identical });
  }
  return report;
}
