import { dbQuery, getDatabasePool } from "../lib/db";
import { applyHolidayAdminAction } from "../lib/holiday/repository";
import { resolveHolidayLoginComposition } from "../lib/holiday/login-theme";

type LoginControlRow = {
  channel: "client" | "employee" | "admin";
  mode: string;
  state: string;
  theme_id: string | null;
  version_number: number;
  composition_config: Parameters<typeof resolveHolidayLoginComposition>[0];
};

async function main() {
  if (!process.env.DATABASE_URL?.includes("writex_co_in_login_theme_qa")) {
    throw new Error("This QA script may run only against the isolated login-theme database.");
  }

  const phase = process.argv[2];
  const actor = await dbQuery<{ id: string }>(
    "select id from admin_users where is_active is true order by created_at asc limit 1"
  );
  const theme = await dbQuery<{ id: string }>(
    "select id from holiday_themes where slug = 'holi' limit 1"
  );
  const actorId = actor.rows[0]?.id;
  const themeId = theme.rows[0]?.id;
  if (!actorId || !themeId) {
    throw new Error("The isolated QA clone is missing its admin or Holi fixture.");
  }

  if (phase === "activate_employee") {
    await applyHolidayAdminAction(
      {
        action: "copy_login_composition",
        from: "client",
        to: "employee"
      },
      actorId
    );
    const client = await dbQuery<LoginControlRow>(
      "select * from holiday_login_theme_settings where channel = 'client' limit 1"
    );
    await applyHolidayAdminAction(
      {
        action: "update_login_composition",
        channel: "employee",
        themeId,
        intent: "activate",
        compositionConfig: resolveHolidayLoginComposition(
          client.rows[0]?.composition_config
        )
      },
      actorId
    );
  } else if (phase === "restore_client") {
    await applyHolidayAdminAction(
      {
        action: "restore_login_channel_default",
        channel: "client"
      },
      actorId
    );
  } else if (phase === "restore_both") {
    await applyHolidayAdminAction(
      {
        action: "restore_login_defaults"
      },
      actorId
    );
  } else if (phase !== "inspect") {
    throw new Error(
      "Use one of: activate_employee, restore_client, restore_both, inspect."
    );
  }

  const controls = await dbQuery<LoginControlRow>(
    `
      select channel, mode, state, theme_id, version_number, composition_config
      from holiday_login_theme_settings
      order by channel
    `
  );
  const versions = await dbQuery<{ channel: string; total: string }>(
    `
      select channel, count(*)::text as total
      from holiday_login_theme_versions
      group by channel
      order by channel
    `
  );
  const audits = await dbQuery<{ total: string }>(
    `
      select count(*)::text as total
      from holiday_theme_audit
      where action in (
        'login_composition_updated',
        'login_composition_copied',
        'login_channel_default_restored',
        'login_defaults_restored'
      )
    `
  );

  process.stdout.write(
    `${JSON.stringify({
      phase,
      controls: controls.rows.map((control) => ({
        channel: control.channel,
        mode: control.mode,
        state: control.state,
        themeAssigned: Boolean(control.theme_id),
        version: Number(control.version_number),
        applyMode: resolveHolidayLoginComposition(
          control.composition_config
        ).applyMode
      })),
      versions: versions.rows,
      relevantAuditEvents: Number(audits.rows[0]?.total || 0)
    })}\n`
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "QA failed."}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getDatabasePool().end();
  });
