"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Eye,
  Filter,
  FolderOpen,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal
} from "lucide-react";
import {
  AdminStatusBadge,
  humaniseAdminStatus,
  statusTone
} from "@/components/admin/AdminPrimitives";

type CellValue = string | number | boolean | null;

export type AdminTableRow = {
  id: string;
  [key: string]: CellValue;
};

export type AdminTableColumn = {
  key: string;
  label: string;
  type?: "text" | "status" | "date" | "boolean";
  primary?: boolean;
  defaultVisible?: boolean;
};

export type AdminTableFilter = {
  key: string;
  label: string;
  type?: "options" | "date-range";
  options?: Array<{ value: string; label: string }>;
};

export function AdminDataTable({
  caption,
  rows,
  columns,
  searchPlaceholder = "Search this queue",
  detailHrefPrefix,
  detailLabel = "Review",
  canExport = false,
  pageSize = 10,
  filterKey,
  filterLabel = "Status",
  filters = [],
  initialQuery = "",
  initialFilters = {}
}: {
  caption: string;
  rows: AdminTableRow[];
  columns: AdminTableColumn[];
  searchPlaceholder?: string;
  detailHrefPrefix?: string;
  detailLabel?: string;
  canExport?: boolean;
  pageSize?: number;
  filterKey?: string;
  filterLabel?: string;
  filters?: AdminTableFilter[];
  initialQuery?: string;
  initialFilters?: Record<string, string>;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    initialFilters
  );
  const [sortKey, setSortKey] = useState(columns[0]?.key || "id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hasSavedView, setHasSavedView] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(
    columns
      .filter((column) => column.defaultVisible !== false)
      .map((column) => column.key)
  );
  const savedViewKey = `writex-admin-view-${caption
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
  const configuredFilters = useMemo(
    () =>
      filters.length
        ? filters
        : filterKey
          ? [{ key: filterKey, label: filterLabel }]
          : [],
    [filterKey, filterLabel, filters]
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setHasSavedView(Boolean(localStorage.getItem(savedViewKey)));
    });
    return () => cancelAnimationFrame(frame);
  }, [savedViewKey]);

  const filterOptions = useMemo(
    () =>
      Object.fromEntries(
        configuredFilters
          .filter((configuredFilter) => configuredFilter.type !== "date-range")
          .map((configuredFilter) => [
            configuredFilter.key,
            configuredFilter.options ||
              Array.from(
                new Set(
                  rows
                    .map((row) => row[configuredFilter.key])
                    .filter(
                      (value): value is string => typeof value === "string"
                    )
                )
              )
                .sort()
                .map((value) => ({
                  value,
                  label: humaniseAdminStatus(value)
                }))
          ])
      ),
    [configuredFilters, rows]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const queryMatch =
          !normalizedQuery ||
          columns.some((column) =>
            String(row[column.key] ?? "")
              .toLowerCase()
              .includes(normalizedQuery)
          );
        const filterMatch = configuredFilters.every((configuredFilter) => {
          if (configuredFilter.type === "date-range") {
            const rowDate = new Date(String(row[configuredFilter.key] || ""));
            if (Number.isNaN(rowDate.getTime())) return false;
            const from = activeFilters[`${configuredFilter.key}__from`];
            const to = activeFilters[`${configuredFilter.key}__to`];
            const fromMatch =
              !from || rowDate >= new Date(`${from}T00:00:00.000Z`);
            const toMatch =
              !to || rowDate <= new Date(`${to}T23:59:59.999Z`);
            return fromMatch && toMatch;
          }
          const value = activeFilters[configuredFilter.key] || "all";
          return value === "all" || String(row[configuredFilter.key]) === value;
        });
        return queryMatch && filterMatch;
      })
      .sort((left, right) => {
        const a = String(left[sortKey] ?? "");
        const b = String(right[sortKey] ?? "");
        return (
          a.localeCompare(b, undefined, { numeric: true }) *
          (sortDirection === "asc" ? 1 : -1)
        );
      });
  }, [
    activeFilters,
    columns,
    configuredFilters,
    query,
    rows,
    sortDirection,
    sortKey
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const renderedColumns = columns.filter((column) =>
    visibleColumns.includes(column.key)
  );

  function reset() {
    setQuery("");
    setActiveFilters({});
    setSortKey(columns[0]?.key || "id");
    setSortDirection("asc");
    setPage(1);
    setSelected([]);
  }

  function exportRows() {
    if (!canExport) return;
    const header = renderedColumns.map((column) => column.label);
    const csv = [
      header,
      ...filteredRows.map((row) =>
        renderedColumns.map((column) => String(row[column.key] ?? ""))
      )
    ]
      .map((record) =>
        record
          .map((value) => `"${value.replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${caption.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function saveView() {
    localStorage.setItem(
      savedViewKey,
      JSON.stringify({
        query,
        activeFilters,
        sortKey,
        sortDirection,
        visibleColumns
      })
    );
    setHasSavedView(true);
  }

  function loadView() {
    const raw = localStorage.getItem(savedViewKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as {
        query?: string;
        activeFilters?: Record<string, string>;
        filter?: string;
        sortKey?: string;
        sortDirection?: "asc" | "desc";
        visibleColumns?: string[];
      };
      setQuery(saved.query || "");
      setActiveFilters(
        saved.activeFilters ||
          (filterKey && saved.filter
            ? { [filterKey]: saved.filter }
            : {})
      );
      setSortKey(saved.sortKey || columns[0]?.key || "id");
      setSortDirection(saved.sortDirection || "asc");
      setVisibleColumns(
        saved.visibleColumns?.filter((key) =>
          columns.some((column) => column.key === key)
        ) || columns.map((column) => column.key)
      );
      setPage(1);
    } catch {
      localStorage.removeItem(savedViewKey);
      setHasSavedView(false);
    }
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
    setPage(1);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-wxIndigo400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-md border border-wxBorder bg-wxSurface pl-10 pr-3 text-sm outline-none focus:border-wxViolet700 focus:ring-2 focus:ring-wxViolet700/15"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {configuredFilters.map((configuredFilter) =>
            configuredFilter.type === "date-range" ? (
              <fieldset
                key={configuredFilter.key}
                className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-2"
              >
                <legend className="sr-only">{configuredFilter.label}</legend>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-wxIndigo500">
                  <Filter className="h-3.5 w-3.5" />
                  {configuredFilter.label}
                </span>
                <label className="flex items-center gap-1 text-xs text-wxIndigo500">
                  <span>From</span>
                  <input
                    type="date"
                    value={
                      activeFilters[`${configuredFilter.key}__from`] || ""
                    }
                    onChange={(event) => {
                      setActiveFilters((current) => ({
                        ...current,
                        [`${configuredFilter.key}__from`]: event.target.value
                      }));
                      setPage(1);
                    }}
                    className="h-9 rounded border border-wxBorder bg-wxSurface px-2 text-xs text-wxIndigo700"
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-wxIndigo500">
                  <span>To</span>
                  <input
                    type="date"
                    value={
                      activeFilters[`${configuredFilter.key}__to`] || ""
                    }
                    onChange={(event) => {
                      setActiveFilters((current) => ({
                        ...current,
                        [`${configuredFilter.key}__to`]: event.target.value
                      }));
                      setPage(1);
                    }}
                    className="h-9 rounded border border-wxBorder bg-wxSurface px-2 text-xs text-wxIndigo700"
                  />
                </label>
              </fieldset>
            ) : (
              <label key={configuredFilter.key} className="relative">
                <span className="sr-only">{configuredFilter.label}</span>
                <Filter className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-wxIndigo400" />
                <select
                  value={activeFilters[configuredFilter.key] || "all"}
                  onChange={(event) => {
                    setActiveFilters((current) => ({
                      ...current,
                      [configuredFilter.key]: event.target.value
                    }));
                    setPage(1);
                  }}
                  className="h-11 rounded-md border border-wxBorder bg-wxSurface pl-9 pr-8 text-sm font-medium text-wxIndigo700"
                >
                  <option value="all">
                    All {configuredFilter.label.toLowerCase()}
                  </option>
                  {(filterOptions[configuredFilter.key] || []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )
          )}

          <label className="relative">
            <span className="sr-only">Sort queue</span>
            <ArrowDownAZ className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-wxIndigo400" />
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
              className="h-11 rounded-md border border-wxBorder bg-wxSurface pl-9 pr-8 text-sm font-medium text-wxIndigo700"
            >
              {columns.map((column) => (
                <option key={column.key} value={column.key}>
                  Sort by {column.label}
                </option>
              ))}
            </select>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setColumnsOpen((current) => !current)}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-medium text-wxIndigo700"
              aria-expanded={columnsOpen}
            >
              <Columns3 className="h-4 w-4" />
              Columns
            </button>
            {columnsOpen ? (
              <div className="absolute right-0 top-[calc(100%+.5rem)] z-20 w-56 rounded-md border border-wxBorder bg-wxSurface p-2 shadow-lift">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex min-h-10 items-center gap-2 rounded px-2 text-sm hover:bg-wxSurfaceSoft"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.key)}
                      onChange={() =>
                        setVisibleColumns((current) =>
                          current.includes(column.key)
                            ? current.length > 1
                              ? current.filter((key) => key !== column.key)
                              : current
                            : [...current, column.key]
                        )
                      }
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-medium text-wxIndigo700"
          >
            <RotateCcw className="h-4 w-4" />
            Clear filters
          </button>

          <button
            type="button"
            onClick={saveView}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-medium text-wxIndigo700"
          >
            <Save className="h-4 w-4" />
            Save view
          </button>

          {hasSavedView ? (
            <button
              type="button"
              onClick={loadView}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-medium text-wxIndigo700"
            >
              <FolderOpen className="h-4 w-4" />
              Load view
            </button>
          ) : null}

          {canExport ? (
            <button
              type="button"
              onClick={exportRows}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-wxBorder bg-wxSurface px-3 text-sm font-medium text-wxViolet700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          ) : null}
        </div>
      </div>

      {selected.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-[color:var(--wx-border-strong)] bg-wxSurfaceSoft px-4 py-3 text-sm">
          <strong className="font-semibold">{selected.length} selected</strong>
          <span className="text-wxIndigo500">
            Open records individually before any sensitive action.
          </span>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="ml-auto font-semibold text-wxViolet700"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="hidden overflow-hidden rounded-md border border-wxBorder md:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-wxSurfaceSoft">
            <tr>
              <th className="w-12 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select current page"
                  checked={
                    pageRows.length > 0 &&
                    pageRows.every((row) => selected.includes(row.id))
                  }
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? Array.from(
                            new Set([...current, ...pageRows.map((row) => row.id)])
                          )
                        : current.filter(
                            (id) => !pageRows.some((row) => row.id === id)
                          )
                    )
                  }
                />
              </th>
              {renderedColumns.map((column) => (
                <th
                  key={column.key}
                  className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-wxIndigo500"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="text-left"
                  >
                    {column.label}
                  </button>
                </th>
              ))}
              {detailHrefPrefix ? (
                <th className="w-28 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-wxIndigo500">
                  Action
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.id}
                data-state={selected.includes(row.id) ? "selected" : "default"}
                className="wx-interactive-row wx-row-hover border-t"
              >
                <td className="px-3 py-4 align-top">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.id}`}
                    checked={selected.includes(row.id)}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(row.id)
                          ? current.filter((id) => id !== row.id)
                          : [...current, row.id]
                      )
                    }
                  />
                </td>
                {renderedColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`break-words px-3 py-4 align-top ${
                      column.primary ? "font-semibold text-wxIndigo900" : ""
                    }`}
                  >
                    <TableCell value={row[column.key]} type={column.type} />
                  </td>
                ))}
                {detailHrefPrefix ? (
                  <td className="px-3 py-3 text-right align-top">
                    <Link
                      href={`${detailHrefPrefix}/${encodeURIComponent(row.id)}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-wxBorder px-3 text-xs font-semibold text-wxViolet700 hover:border-wxViolet700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {detailLabel}
                    </Link>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {pageRows.map((row) => (
          <article
            key={row.id}
            data-state={selected.includes(row.id) ? "selected" : "default"}
            className="wx-interactive-state rounded-md border p-4 shadow-soft"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                aria-label={`Select ${row.id}`}
                checked={selected.includes(row.id)}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(row.id)
                      ? current.filter((id) => id !== row.id)
                      : [...current, row.id]
                  )
                }
              />
              <dl className="min-w-0 flex-1 space-y-3">
                {renderedColumns.map((column) => (
                  <div key={column.key}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-wxIndigo400">
                      {column.label}
                    </dt>
                    <dd
                      className={`mt-1 break-words text-sm ${
                        column.primary
                          ? "font-semibold text-wxIndigo900"
                          : "text-wxIndigo600"
                      }`}
                    >
                      <TableCell value={row[column.key]} type={column.type} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            {detailHrefPrefix ? (
              <Link
                href={`${detailHrefPrefix}/${encodeURIComponent(row.id)}`}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-wxBorder text-sm font-semibold text-wxViolet700"
              >
                <Eye className="h-4 w-4" />
                {detailLabel}
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      {!pageRows.length ? (
        <div className="rounded-md border border-dashed border-wxBorder bg-wxSurfaceSoft px-5 py-10 text-center">
          <SlidersHorizontal className="mx-auto h-6 w-6 text-wxIndigo400" />
          <p className="mt-3 text-sm font-semibold text-wxIndigo900">
            No records match this view
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-sm font-semibold text-wxViolet700"
          >
            Reset default view
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-wxBorder pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-wxIndigo500">
          Showing {pageRows.length} of {filteredRows.length} records. Data is
          limited to this server-provided queue.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-wxBorder disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-20 text-center text-xs font-semibold">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-wxBorder disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TableCell({
  value,
  type = "text"
}: {
  value: CellValue;
  type?: AdminTableColumn["type"];
}) {
  if (value === null || value === "") return <span className="text-wxIndigo400">Not recorded</span>;
  if (type === "status") {
    return (
      <AdminStatusBadge tone={statusTone(String(value))}>
        {humaniseAdminStatus(String(value))}
      </AdminStatusBadge>
    );
  }
  if (type === "date") {
    return (
      <time dateTime={String(value)}>
        {new Intl.DateTimeFormat("en-IN", {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(new Date(String(value)))}
      </time>
    );
  }
  if (type === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  return <span>{String(value)}</span>;
}
