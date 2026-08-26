"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw, Save, ShieldCheck } from "lucide-react";
import type {
  GovernedHelpArticle,
  OnboardingCompletion
} from "@/lib/admin/guidance-store";

type Snapshot = {
  articles: GovernedHelpArticle[];
  onboarding: OnboardingCompletion[];
};

const emptyArticle: GovernedHelpArticle = {
  id: "",
  title: "",
  module: "General",
  roles: ["super_admin"],
  version: "1.0",
  lastUpdated: "",
  owner: "WriteX Operations",
  active: true,
  purpose: "",
  actions: [""],
  mistakes: [""],
  displayOrder: 500,
  isCustom: true,
  isProtected: false
};

function lines(value: string[]) {
  return value.join("\n");
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AdminTutorialGovernance() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [editing, setEditing] = useState<GovernedHelpArticle | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/help-governance", {
      cache: "no-store"
    });
    const payload = await response.json();
    if (payload?.ok) setSnapshot(payload.data);
  }

  useEffect(() => {
    fetch("/api/admin/help-governance", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.ok) setSnapshot(payload.data);
      })
      .catch(() => setMessage("Tutorial governance data is unavailable."));
  }, []);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/help-governance", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save_article", article: editing })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setMessage(payload?.error?.message || "The article could not be saved.");
        return;
      }
      setMessage("Tutorial article saved and audited.");
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function resetOnboarding(adminUserId: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/help-governance", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "reset_onboarding",
          adminUserId
        })
      });
      const payload = await response.json();
      setMessage(
        response.ok && payload?.ok
          ? "The selected Admin tutorial was reset."
          : payload?.error?.message || "The tutorial could not be reset."
      );
      if (response.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      {message ? (
        <p role="status" className="rounded-md border border-wxBorder bg-wxSurface p-3 text-sm font-semibold text-wxIndigo700">
          {message}
        </p>
      ) : null}
      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-wxViolet700">Tutorial governance</p>
            <h2 className="mt-2 text-2xl font-bold text-wxIndigo900">Help article controls</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-wxIndigo500">
              Update optional guidance without changing permissions. Protected safety
              articles remain active and every save is audited.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing({ ...emptyArticle })}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-wxViolet700 px-4 font-bold text-white"
          >
            <Plus className="h-4 w-4" /> Add article
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {(snapshot?.articles || []).map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => setEditing({ ...article })}
              className="flex min-h-14 items-center justify-between gap-4 rounded-md border border-wxBorder p-4 text-left hover:bg-wxSurfaceSoft"
            >
              <span>
                <span className="font-bold text-wxIndigo900">{article.title}</span>
                <span className="mt-1 block text-xs text-wxIndigo500">
                  {article.module} / order {article.displayOrder} / {article.active ? "Active" : "Inactive"}
                </span>
              </span>
              {article.isProtected ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" /> Protected
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      {editing ? (
        <ArticleEditor
          article={editing}
          setArticle={setEditing}
          busy={busy}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
        <h2 className="text-2xl font-bold text-wxIndigo900">Onboarding completion</h2>
        <p className="mt-2 text-sm text-wxIndigo500">
          Review completion state or reset a tutorial for a specific Admin user.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-wxBorder text-xs uppercase text-wxIndigo400">
              <tr>
                <th className="px-3 py-3">Admin</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Updated</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot?.onboarding || []).map((item) => (
                <tr key={item.adminUserId} className="border-b border-wxBorder">
                  <td className="px-3 py-3">
                    <span className="font-bold text-wxIndigo900">{item.name}</span>
                    <span className="block text-xs text-wxIndigo500">{item.email}</span>
                  </td>
                  <td className="px-3 py-3 capitalize">{item.assignedRole.replace(/_/g, " ")}</td>
                  <td className="px-3 py-3">
                    {item.completed ? "Completed" : item.skippedAt ? "Skipped" : "In progress"}
                  </td>
                  <td className="px-3 py-3">{new Date(item.updatedAt).toLocaleString()}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => resetOnboarding(item.adminUserId)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 font-bold text-wxIndigo700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" /> Reset
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ArticleEditor({
  article,
  setArticle,
  busy,
  onSave,
  onCancel
}: {
  article: GovernedHelpArticle;
  setArticle: (article: GovernedHelpArticle) => void;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const fieldClass =
    "mt-1 min-h-11 w-full rounded-md border border-wxBorder bg-wxSurfaceSoft px-3 text-sm text-wxIndigo900 outline-none focus:border-wxViolet700";
  return (
    <section className="rounded-lg border border-wxBorder bg-wxSurface p-5 shadow-soft">
      <h2 className="text-2xl font-bold text-wxIndigo900">
        {article.isCustom && !article.lastUpdated ? "Add help article" : "Edit help article"}
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-wxIndigo700">
          Stable ID
          <input
            value={article.id}
            disabled={!article.isCustom || Boolean(article.lastUpdated)}
            onChange={(event) => setArticle({ ...article, id: event.target.value })}
            className={fieldClass}
          />
        </label>
        <TextField label="Title" value={article.title} onChange={(title) => setArticle({ ...article, title })} className={fieldClass} />
        <TextField label="Module" value={article.module} onChange={(module) => setArticle({ ...article, module })} className={fieldClass} />
        <TextField label="Owner" value={article.owner} onChange={(owner) => setArticle({ ...article, owner })} className={fieldClass} />
        <TextField label="Version" value={article.version} onChange={(version) => setArticle({ ...article, version })} className={fieldClass} />
        <label className="text-sm font-semibold text-wxIndigo700">
          Display order
          <input
            type="number"
            min={0}
            max={1000}
            value={article.displayOrder}
            onChange={(event) => setArticle({ ...article, displayOrder: Number(event.target.value) })}
            className={fieldClass}
          />
        </label>
        <label className="md:col-span-2 text-sm font-semibold text-wxIndigo700">
          Roles (comma separated)
          <input
            value={article.roles.join(", ")}
            onChange={(event) =>
              setArticle({
                ...article,
                roles: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) as GovernedHelpArticle["roles"]
              })
            }
            className={fieldClass}
          />
        </label>
        <TextArea label="Purpose" value={article.purpose} onChange={(purpose) => setArticle({ ...article, purpose })} className={fieldClass} />
        <TextArea label="Primary actions (one per line)" value={lines(article.actions)} onChange={(value) => setArticle({ ...article, actions: parseLines(value) })} className={fieldClass} />
        <TextArea label="Common mistakes (one per line)" value={lines(article.mistakes)} onChange={(value) => setArticle({ ...article, mistakes: parseLines(value) })} className={fieldClass} />
        <TextArea label="Sensitive-action warning (optional)" value={article.sensitive || ""} onChange={(sensitive) => setArticle({ ...article, sensitive })} className={fieldClass} />
        <TextField label="Module route (optional)" value={article.href || ""} onChange={(href) => setArticle({ ...article, href })} className={fieldClass} />
        <label className="flex min-h-11 items-center gap-3 self-end text-sm font-semibold text-wxIndigo700">
          <input
            type="checkbox"
            checked={article.active}
            disabled={article.isProtected}
            onChange={(event) => setArticle({ ...article, active: event.target.checked })}
            className="h-4 w-4 accent-wxViolet700"
          />
          Active {article.isProtected ? "(protected safety article)" : ""}
        </label>
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="min-h-11 rounded-md border border-wxBorder px-4 font-bold text-wxIndigo700">
          Cancel
        </button>
        <button type="button" disabled={busy} onClick={onSave} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-wxViolet700 px-5 font-bold text-white disabled:opacity-50">
          <Save className="h-4 w-4" /> Save article
        </button>
      </div>
    </section>
  );
}

function TextField({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className: string }) {
  return <label className="text-sm font-semibold text-wxIndigo700">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className={className} /></label>;
}

function TextArea({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className: string }) {
  return <label className="text-sm font-semibold text-wxIndigo700">{label}<textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} className={`${className} py-3`} /></label>;
}
