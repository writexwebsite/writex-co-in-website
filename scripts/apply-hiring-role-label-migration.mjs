import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
const backupPath = process.env.MIGRATION_BACKUP_PATH;
const migrationMode = process.env.MIGRATION_MODE ?? "apply";

if (!databaseUrl || !backupPath) {
  throw new Error("DATABASE_URL and MIGRATION_BACKUP_PATH are required.");
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();

  if (migrationMode === "restore") {
    const backup = JSON.parse(await readFile(backupPath, "utf8"));
    await client.query("begin");
    try {
      for (const row of backup.roles ?? []) {
        await client.query(
          "update hiring_job_roles set public_title = $1, updated_at = $2 where role_key = $3",
          [row.public_title, row.updated_at, row.role_key]
        );
      }
      for (const row of backup.sourcePacks ?? []) {
        await client.query(
          "update hiring_question_bank_source_packs set title = $1, description = $2, updated_at = $3 where id = $4",
          [row.title, row.description, row.updated_at, row.id]
        );
      }
      for (const row of backup.assessments ?? []) {
        await client.query(
          "update hiring_assessments set title = $1, updated_at = $2 where id = $3",
          [row.title, row.updated_at, row.id]
        );
      }
      await client.query("commit");
      console.log("Hiring role label backup restored.");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
    process.exitCode = 0;
  } else if (migrationMode !== "apply") {
    throw new Error("MIGRATION_MODE must be apply or restore.");
  } else {

    const [roles, packs, assessments] = await Promise.all([
    client.query(
      "select role_key, public_title, updated_at from hiring_job_roles where role_key = $1",
      ["academic_writer"]
    ),
    client.query(
      "select id, role_key, title, description, updated_at from hiring_question_bank_source_packs where role_key = $1",
      ["academic_writer"]
    ),
    client.query(
      "select id, role_key, title, updated_at from hiring_assessments where role_key = $1",
      ["academic_writer"]
    )
  ]);

    await mkdir(dirname(backupPath), { recursive: true });
    await writeFile(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        roles: roles.rows,
        sourcePacks: packs.rows,
        assessments: assessments.rows
      },
      null,
      2
    ),
    { encoding: "utf8", mode: 0o600 }
  );
    await chmod(backupPath, 0o600);

    const migrationPath = resolve(
      process.cwd(),
      "database/migrations/20260801_hiring_role_display_label.sql"
    );
    await client.query(await readFile(migrationPath, "utf8"));

    const result = await client.query(
      "select public_title from hiring_job_roles where role_key = $1",
      ["academic_writer"]
    );
    console.log("Hiring role label migration complete:", result.rows[0]?.public_title ?? "missing");
  }
} finally {
  await client.end();
}
