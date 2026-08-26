"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

type Choice = { value: string; label: string };

const controlClass =
  "mt-2 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurface px-3 py-2 text-sm text-wxIndigo900 outline-none transition focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/20";

function normalizeChoices(options: Array<string | Choice>): Choice[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  );
}

export function SearchableSelect({
  name,
  label,
  options,
  required = false,
  defaultValue = "",
  helperText,
  otherFieldName,
  onValueChange
}: {
  name: string;
  label: string;
  options: Array<string | Choice>;
  required?: boolean;
  defaultValue?: string;
  helperText?: string;
  otherFieldName?: string;
  onValueChange?: (value: string) => void;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const choices = useMemo(() => normalizeChoices(options), [options]);
  const initial = choices.find((choice) => choice.value === defaultValue);
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(initial?.label || "");
  const [open, setOpen] = useState(false);
  const filtered = choices.filter((choice) =>
    choice.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  function choose(choice: Choice) {
    setValue(choice.value);
    setQuery(choice.label);
    setOpen(false);
    onValueChange?.(choice.value);
  }

  function clear() {
    setValue("");
    setQuery("");
    setOpen(false);
    onValueChange?.("");
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <label htmlFor={id} className="text-sm font-semibold text-wxIndigo900">
        {label} {required ? <span className="text-red-600">*</span> : <span className="font-normal text-wxIndigo400">(optional)</span>}
      </label>
      <input type="hidden" name={name} value={value} data-required={required ? "true" : undefined} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-wxIndigo400" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder="Search or select"
          onFocus={() => setOpen(true)}
          onBlur={(event) => {
            if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setValue("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key === "Enter") {
              const exact = choices.find(
                (choice) =>
                  choice.label.toLowerCase() === query.trim().toLowerCase()
              );
              if (exact) {
                event.preventDefault();
                choose(exact);
              }
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              requestAnimationFrame(() =>
                rootRef.current
                  ?.querySelector<HTMLButtonElement>('[role="option"]')
                  ?.focus()
              );
            }
          }}
          className={`${controlClass} pl-9 pr-20`}
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-10 top-1/2 mt-1 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-wxIndigo500 hover:bg-wxSurfaceSoft"
            aria-label={`Clear ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="absolute right-1 top-1/2 mt-1 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-wxIndigo500 hover:bg-wxSurfaceSoft"
          aria-label={`Open ${label} options`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      {helperText ? <p className="mt-1 text-xs text-wxIndigo500">{helperText}</p> : null}
      {value === "Other" && otherFieldName ? (
        <label className="mt-2 block text-xs font-semibold text-wxIndigo700">
          Please specify
          <input
            name={otherFieldName}
            required
            maxLength={120}
            className="mt-1 min-h-10 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900"
          />
        </label>
      ) : null}
      {open ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          tabIndex={-1}
          className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-wxBorder bg-wxSurface p-1 shadow-lift"
        >
          {filtered.length ? (
            filtered.map((choice) => (
              <button
                key={choice.value}
                type="button"
                role="option"
                aria-selected={choice.value === value}
                data-state={choice.value === value ? "selected" : "default"}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(choice)}
                className="wx-interactive-state flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 text-left text-sm"
              >
                <span>{choice.label}</span>
                {choice.value === value ? <Check className="h-4 w-4 text-wxViolet700" /> : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-wxIndigo500">No matching option.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function MultiSelect({
  name,
  label,
  options,
  required = false,
  helperText,
  maxSelections,
  otherFieldName
}: {
  name: string;
  label: string;
  options: Array<string | Choice>;
  required?: boolean;
  helperText?: string;
  maxSelections?: number;
  otherFieldName?: string;
}) {
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const choices = useMemo(() => normalizeChoices(options), [options]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const filtered = choices.filter((choice) =>
    choice.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  function toggle(value: string) {
    setSelected((current) => {
      if (current.includes(value)) return current.filter((item) => item !== value);
      if (maxSelections && current.length >= maxSelections) return current;
      return [...current, value];
    });
  }

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-wxIndigo900">
        {label} {required ? <span className="text-red-600">*</span> : <span className="font-normal text-wxIndigo400">(optional)</span>}
      </legend>
      <input type="hidden" name={name} value={selected.join(" | ")} data-required={required ? "true" : undefined} />
      <details ref={detailsRef} className="group relative mt-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 py-2 text-sm text-wxIndigo700 outline-none focus-visible:ring-2 focus-visible:ring-wxViolet700/20">
          <span>{selected.length ? `${selected.length} selected` : "Choose options"}</span>
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="absolute z-40 mt-1 w-full rounded-md border border-wxBorder bg-wxSurface p-2 shadow-lift">
          <label htmlFor={`${id}-search`} className="sr-only">Search {label}</label>
          <input
            id={`${id}-search`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search options"
            className="mb-2 min-h-10 w-full rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm outline-none focus:border-wxViolet700"
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((choice) => (
              <label
                key={choice.value}
                data-state={selected.includes(choice.value) ? "selected" : "default"}
                className="wx-interactive-state flex min-h-10 cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(choice.value)}
                  onChange={() => toggle(choice.value)}
                  disabled={Boolean(maxSelections && selected.length >= maxSelections && !selected.includes(choice.value))}
                  className="h-4 w-4 accent-wxViolet700"
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (detailsRef.current) detailsRef.current.open = false;
            }}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm font-semibold text-wxIndigo700"
            aria-label={`Finish selecting ${label}`}
          >
            Done
          </button>
        </div>
      </details>
      {selected.length ? (
        <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
          {selected.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              data-state="selected"
              className="wx-interactive-state inline-flex min-h-8 items-center gap-1 rounded-md border px-2 text-xs font-semibold"
              aria-label={`Remove ${value}`}
            >
              {choices.find((choice) => choice.value === value)?.label || value}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      ) : null}
      {selected.includes("Other") && otherFieldName ? (
        <label className="mt-2 block text-xs font-semibold text-wxIndigo700">
          Please specify
          <input
            name={otherFieldName}
            required
            maxLength={120}
            className="mt-1 min-h-10 w-full rounded-md border border-wxBorder bg-wxSurface px-3 text-sm text-wxIndigo900"
          />
        </label>
      ) : null}
      {helperText ? <p className="mt-1 text-xs text-wxIndigo500">{helperText}</p> : null}
    </fieldset>
  );
}

export function RadioGroup({
  name,
  label,
  options,
  required = false,
  helperText,
  onValueChange
}: {
  name: string;
  label: string;
  options: Array<string | Choice>;
  required?: boolean;
  helperText?: string;
  onValueChange?: (value: string) => void;
}) {
  const choices = normalizeChoices(options);
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-wxIndigo900">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => (
          <label key={choice.value} className="wx-checkable-state wx-interactive-state flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm">
            <input
              type="radio"
              name={name}
              value={choice.value}
              required={required}
              onChange={() => onValueChange?.(choice.value)}
              className="h-4 w-4 accent-wxViolet700"
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
      {helperText ? <p className="mt-1 text-xs text-wxIndigo500">{helperText}</p> : null}
    </fieldset>
  );
}

export function StructuredRangeSelect(props: Parameters<typeof SearchableSelect>[0]) {
  return <SearchableSelect {...props} />;
}

export function ProficiencySelect({
  languageName = "languageProficiency"
}: {
  languageName?: string;
}) {
  return (
    <SearchableSelect
      name={languageName}
      label="Overall language proficiency"
      required
      options={["Basic", "Conversational", "Professional", "Native"]}
    />
  );
}

export function AdminManagedOptionSelect(props: Parameters<typeof SearchableSelect>[0]) {
  return <SearchableSelect {...props} />;
}

export function TextField({
  name,
  label,
  type = "text",
  required = false,
  helperText,
  maxLength = 500,
  children
}: {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "number";
  required?: boolean;
  helperText?: string;
  maxLength?: number;
  children?: ReactNode;
}) {
  return (
    <label className="min-w-0 text-sm font-semibold text-wxIndigo900">
      {label} {required ? <span className="text-red-600">*</span> : <span className="font-normal text-wxIndigo400">(optional)</span>}
      <input
        name={name}
        type={type}
        required={required}
        maxLength={type === "number" ? undefined : maxLength}
        className={controlClass}
      />
      {children}
      {helperText ? <span className="mt-1 block text-xs font-normal text-wxIndigo500">{helperText}</span> : null}
    </label>
  );
}

export function TextAreaField({
  name,
  label,
  required = false,
  helperText,
  rows = 5,
  maxLength = 1500
}: {
  name: string;
  label: string;
  required?: boolean;
  helperText?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-semibold text-wxIndigo900">
      {label} {required ? <span className="text-red-600">*</span> : <span className="font-normal text-wxIndigo400">(optional)</span>}
      <textarea
        name={name}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className={`${controlClass} resize-y leading-6`}
      />
      {helperText ? <span className="mt-1 block text-xs font-normal text-wxIndigo500">{helperText}</span> : null}
    </label>
  );
}
