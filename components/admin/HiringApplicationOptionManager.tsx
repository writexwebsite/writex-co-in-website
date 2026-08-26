"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Plus, Save, ShieldCheck } from "lucide-react";
import type {
  HiringOption,
  HiringOptionSetKey
} from "@/lib/hiring/application-options";

const labels: Partial<Record<HiringOptionSetKey, string>> = {
  writer_subject: "Subject categories",
  academic_level: "Academic levels",
  referencing_style: "Referencing styles",
  sales_industry: "Previous industries",
  language: "Languages",
  referral_source: "Referral sources",
  relationship_type: "Relationship types",
  work_mode: "Approved work modes",
  joining_availability: "Joining availability",
  employment_status: "Employment status",
  writing_experience: "Experience ranges"
};

export function HiringApplicationOptionManager({
  initialOptions
}: {
  initialOptions: Record<HiringOptionSetKey, HiringOption[]>;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [selectedSet, setSelectedSet] = useState<HiringOptionSetKey>("writer_subject");
  const [newLabel, setNewLabel] = useState("");
  const [message, setMessage] = useState("");
  const visibleSets = useMemo(
    () =>
      (Object.keys(labels) as HiringOptionSetKey[]).filter(
        (key) => labels[key]
      ),
    []
  );

  async function saveOption(option: HiringOption) {
    setMessage("");
    const response = await fetch("/api/admin/hiring/application-options", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        optionSet: selectedSet,
        value: option.value,
        label: option.label,
        active: option.active,
        displayOrder: option.displayOrder
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload?.error?.message || "The option could not be saved.");
      return;
    }
    setMessage("Application option saved and audited.");
  }

  async function addOption() {
    const label = newLabel.trim();
    if (!label) return;
    if (
      options[selectedSet].some(
        (option) => option.value.toLowerCase() === label.toLowerCase()
      )
    ) {
      setMessage("That option already exists in this list.");
      return;
    }
    const option: HiringOption = {
      value: label,
      label,
      active: true,
      protected: false,
      displayOrder: options[selectedSet].length
    };
    setOptions((current) => ({
      ...current,
      [selectedSet]: [...current[selectedSet], option]
    }));
    setNewLabel("");
    await saveOption(option);
  }

  function updateLocal(value: string, patch: Partial<HiringOption>) {
    setOptions((current) => ({
      ...current,
      [selectedSet]: current[selectedSet].map((option) =>
        option.value === value ? { ...option, ...patch } : option
      )
    }));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-lg border border-wxBorder bg-wxSurface p-3 shadow-soft">
        <p className="px-3 py-2 text-xs font-bold uppercase text-wxIndigo400">
          Option sets
        </p>
        <div className="grid gap-1">
          {visibleSets.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedSet(key);
                setMessage("");
              }}
              className={`min-h-11 rounded-md px-3 text-left text-sm font-semibold ${
                selectedSet === key
                  ? "bg-wxViolet700 text-white"
                  : "text-wxIndigo700 hover:bg-wxSurfaceSoft"
              }`}
            >
              {labels[key]}
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-wxViolet700">
              Application Form Options
            </p>
            <h2 className="mt-2 text-2xl font-bold text-wxIndigo900">
              {labels[selectedSet]}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-wxIndigo500">
              Deactivation affects new forms only. Historical application values are
              preserved unchanged. Protected defaults cannot be deleted.
            </p>
          </div>
          <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-xs font-bold text-wxIndigo600">
            <ShieldCheck className="h-4 w-4 text-wxViolet700" />
            Super Admin only
          </span>
        </div>

        <div className="mt-6 grid gap-3">
          {options[selectedSet].map((option) => (
            <div
              key={option.value}
              className="grid gap-3 rounded-md border border-wxBorder p-3 md:grid-cols-[1fr_110px_120px]"
            >
              <div>
                <p className="font-semibold text-wxIndigo900">{option.label}</p>
                <p className="mt-1 text-xs text-wxIndigo500">
                  {option.protected ? "Protected default" : "Admin-managed option"}
                </p>
              </div>
              <label className="text-xs font-semibold text-wxIndigo500">
                Display order
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={option.displayOrder}
                  onChange={(event) =>
                    updateLocal(option.value, {
                      displayOrder: Number(event.target.value)
                    })
                  }
                  className="mt-1 min-h-10 w-full rounded-md border border-wxBorder bg-wxSurface px-2 text-sm text-wxIndigo900"
                />
              </label>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateLocal(option.value, { active: !option.active })
                  }
                  className={`inline-flex min-h-10 flex-1 items-center justify-center rounded-md border px-3 text-xs font-bold ${
                    option.active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-wxBorder bg-wxSurfaceSoft text-wxIndigo500"
                  }`}
                >
                  {option.active ? "Active" : "Inactive"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    saveOption(
                      options[selectedSet].find(
                        (item) => item.value === option.value
                      ) || option
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-wxViolet700 text-white"
                  aria-label={`Save ${option.label}`}
                  title="Save option"
                >
                  <Save className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-md border border-dashed border-wxBorder bg-wxSurfaceSoft p-4">
          <label className="text-sm font-semibold text-wxIndigo900">
            Add an option to {labels[selectedSet]}
            <span className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={newLabel}
                onChange={(event) => setNewLabel(event.target.value)}
                maxLength={120}
                className="min-h-11 flex-1 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm"
              />
              <button
                type="button"
                onClick={addOption}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-wxViolet700 px-4 font-bold text-white"
              >
                <Plus className="h-4 w-4" /> Add option
              </button>
            </span>
          </label>
        </div>
        {message ? (
          <p
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-wxIndigo700"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
