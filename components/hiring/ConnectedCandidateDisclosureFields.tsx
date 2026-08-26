"use client";

import { useState } from "react";
import { SearchableSelect } from "@/components/hiring/ApplicationFormControls";

export function ConnectedCandidateDisclosureFields({
  relationshipOptions = [
    "Family",
    "Friend",
    "Former colleague",
    "Current colleague",
    "Professional contact",
    "Other"
  ]
}: {
  relationshipOptions?: string[];
}) {
  const [disclosed, setDisclosed] = useState(false);

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wxIndigo900">
        Do you know anyone currently applying to or working at WriteX?
      </legend>
      <div className="flex gap-4">
        {[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" }
        ].map((option) => (
          <label key={option.value} className="wx-checkable-state wx-interactive-state flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3">
            <input
              type="radio"
              name="knowsApplicantOrEmployee"
              value={option.value}
              required
              onChange={() => setDisclosed(option.value === "yes")}
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
      {disclosed ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <DisclosureField name="relationshipName" label="Name" />
          <SearchableSelect
            name="relationshipType"
            label="Relationship"
            options={relationshipOptions}
            required
          />
          <DisclosureField name="relationshipRole" label="Role" />
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-wxIndigo700">
              Disclosure details
            </span>
            <textarea
              name="relationshipDetails"
              required
              maxLength={500}
              rows={4}
              className="mt-2 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2"
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}

function DisclosureField({ name, label }: { name: string; label: string }) {
  return (
    <label>
      <span className="text-sm font-semibold text-wxIndigo700">{label}</span>
      <input
        name={name}
        required
        maxLength={120}
        className="mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3"
      />
    </label>
  );
}
