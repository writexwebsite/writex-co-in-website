import "server-only";

import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import {
  defaultHiringOptions,
  getDefaultActiveHiringOptions,
  hiringOptionSetKeys,
  type HiringOption,
  type HiringOptionSetKey
} from "@/lib/hiring/application-options";

type OptionRow = {
  option_set: HiringOptionSetKey;
  option_value: string;
  option_label: string;
  is_active: boolean;
  is_protected: boolean;
  display_order: number;
};

export async function getHiringOptions({ includeInactive = false } = {}) {
  if (!isDatabaseConfigured()) return getDefaultActiveHiringOptions();

  try {
    const result = await dbQuery<OptionRow>(
      `select option_set, option_value, option_label, is_active, is_protected, display_order
       from hiring_application_options
       order by option_set, display_order, option_label`
    );
    const grouped = Object.fromEntries(
      hiringOptionSetKeys.map((key) => [
        key,
        defaultHiringOptions[key].map((option) => ({ ...option }))
      ])
    ) as Record<HiringOptionSetKey, HiringOption[]>;
    for (const row of result.rows) {
      const next = {
        value: row.option_value,
        label: row.option_label,
        active: row.is_active,
        protected: row.is_protected,
        displayOrder: row.display_order
      };
      const existingIndex = grouped[row.option_set].findIndex(
        (option) => option.value === row.option_value
      );
      if (existingIndex >= 0) grouped[row.option_set][existingIndex] = next;
      else grouped[row.option_set].push(next);
    }
    for (const key of hiringOptionSetKeys) {
      grouped[key] = grouped[key]
        .filter((option) => includeInactive || option.active)
        .sort(
          (left, right) =>
            left.displayOrder - right.displayOrder ||
            left.label.localeCompare(right.label)
        );
    }
    return grouped;
  } catch {
    return getDefaultActiveHiringOptions();
  }
}

export async function upsertHiringOption({
  optionSet,
  value,
  label,
  active,
  displayOrder,
  actorId
}: {
  optionSet: HiringOptionSetKey;
  value: string;
  label: string;
  active: boolean;
  displayOrder: number;
  actorId: string;
}) {
  const protectedDefault = defaultHiringOptions[optionSet].some(
    (option) => option.value === value
  );
  const result = await dbQuery<OptionRow>(
    `insert into hiring_application_options (
       option_set, option_value, option_label, is_active, is_protected,
       display_order, created_by, updated_by
     ) values ($1,$2,$3,$4,$5,$6,$7,$7)
     on conflict (option_set, option_value) do update set
       option_label=excluded.option_label,
       is_active=excluded.is_active,
       display_order=excluded.display_order,
       updated_by=excluded.updated_by,
       updated_at=now()
     returning option_set, option_value, option_label, is_active, is_protected, display_order`,
    [optionSet, value, label, active, protectedDefault, displayOrder, actorId]
  );
  await dbQuery(
    `insert into hiring_audit_logs (
       actor_type, actor_reference, action, entity_type, entity_reference, safe_metadata
     ) values ('admin',$1,'application_option_updated','hiring_application_option',$2,$3::jsonb)`,
    [
      actorId,
      `${optionSet}:${value}`,
      JSON.stringify({ optionSet, value, active, displayOrder, protected: protectedDefault })
    ]
  );
  return result.rows[0];
}
