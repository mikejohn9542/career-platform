import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type SqliteDatabase = { exec(sql: string): void; close(): void };
type SqliteModule = { DatabaseSync: new (file: string) => SqliteDatabase };

const TS = "2026-01-01T00:00:00.000Z";

// Builds a SQLite file shaped like the VM's database, with non-sequential ids.
export function makeSqliteFixture(): { file: string; cleanup: () => void } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sqlite-fixture-"));
  const file = path.join(directory, "vm.sqlite");
  const { DatabaseSync } = (process as unknown as { getBuiltinModule(id: string): SqliteModule }).getBuiltinModule("node:sqlite");
  const db = new DatabaseSync(file);
  db.exec(fs.readFileSync(path.resolve(process.cwd(), "tests/fixtures/sqlite-schema.sql"), "utf8"));
  db.exec(`
    INSERT INTO profiles (id, name, headline, summary, location, pronouns, created_at, updated_at)
      VALUES (1, 'Test Person', 'Product engineer', 'Builds useful software.', 'Remote', 'they/them', '${TS}', '${TS}');
    INSERT INTO experiences (id, profile_id, sort_order, company, role, location, start_date, end_date, current, summary, created_at, updated_at)
      VALUES (7, 1, 0, 'Example Co', 'Engineer', 'Remote', '2024-01', NULL, 1, 'Built products.', '${TS}', '${TS}');
    INSERT INTO experience_highlights (id, experience_id, sort_order, value) VALUES (11, 7, 0, 'Shipped features.');
    INSERT INTO education (id, profile_id, sort_order, school, degree, field, start_date, end_date, summary, created_at, updated_at)
      VALUES (3, 1, 0, 'Example University', 'B.S.', 'Computer Science', '2020-09', '2024-06', 'Studied software.', '${TS}', '${TS}');
    INSERT INTO skill_groups (id, profile_id, sort_order, name) VALUES (5, 1, 0, 'Languages');
    INSERT INTO skill_items (id, skill_group_id, sort_order, value) VALUES (21, 5, 0, 'TypeScript'), (22, 5, 1, 'SQL');
    INSERT INTO projects (id, profile_id, slug, title, summary, description, status, sort_order, created_at, updated_at)
      VALUES (9, 1, 'published-project', 'Published project', 'A published project.', 'A detailed published project.', 'published', 0, '${TS}', '${TS}');
    INSERT INTO project_technologies (id, project_id, sort_order, value) VALUES (31, 9, 0, 'TypeScript');
    INSERT INTO project_highlights (id, project_id, sort_order, value) VALUES (41, 9, 0, 'Delivered value.');
    INSERT INTO project_links (id, project_id, sort_order, label, url) VALUES (51, 9, 0, 'Demo', 'https://example.com/published');
    INSERT INTO resume_metadata (id, profile_id, file_name, published_at, status, pdf_url, summary)
      VALUES (1, 1, 'resume.pdf', '2026-09-15T00:00:00.000Z', 'published', 'https://example.com/resume.pdf', 'A resume.');
    INSERT INTO contacts (id, profile_id, email, phone, linkedin, github, website, location)
      VALUES (1, 1, 'test@example.com', NULL, 'https://linkedin.com/in/test', 'https://github.com/test', NULL, 'Remote');
  `);
  db.close();
  return { file, cleanup: () => fs.rmSync(directory, { recursive: true, force: true }) };
}
