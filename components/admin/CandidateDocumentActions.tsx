"use client";

import Image from "next/image";
import { useState } from "react";
import { Eye, ExternalLink, FileX2, Loader2, RotateCw, X } from "lucide-react";

type PreviewState =
  | { kind: "url"; url: string }
  | { kind: "text"; text: string };

export function CandidateDocumentActions({
  fileId,
  fileName,
  mimeType
}: {
  fileId: string;
  fileName: string;
  mimeType: string;
}) {
  const [busy, setBusy] = useState<"preview" | "open" | "revoke" | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  async function act(action: "preview" | "signed_url" | "revoke") {
    const reason =
      action === "preview"
        ? "Authorised in-page candidate document review"
        : window.prompt(
          action === "signed_url"
          ? `Reason for opening ${fileName}`
          : `Reason for revoking ${fileName}`
        );
    if (!reason?.trim()) return;
    if (
      action === "revoke" &&
      !window.confirm(
        "Revoke this candidate document? Existing links will no longer be issued."
      )
    ) {
      return;
    }

    setBusy(action === "signed_url" ? "open" : action);
    setMessage("");
    const response = await fetch(
      `/api/admin/hiring/files/${encodeURIComponent(fileId)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, reason })
      }
    );
    const payload = await response.json().catch(() => null);
    setBusy(null);

    if (!response.ok) {
      setMessage(
        payload?.error?.message ||
          "The document action could not be completed."
      );
      return;
    }

    if (action === "preview" && payload?.data?.previewKind === "text") {
      setPreview({ kind: "text", text: String(payload.data.text || "") });
      setPreviewLoaded(true);
      setPreviewFailed(false);
      setMessage("Private document preview opened and audited.");
    } else if (action === "preview" && payload?.data?.url) {
      setPreview({ kind: "url", url: payload.data.url });
      setPreviewLoaded(false);
      setPreviewFailed(false);
      setMessage("Private document preview opened and audited.");
    } else if (action === "signed_url" && payload?.data?.url) {
      window.open(payload.data.url, "_blank", "noopener,noreferrer");
      setMessage("Private three-minute access link opened and audited.");
    } else {
      setMessage("Document access revoked and audited.");
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void act("preview")}
          disabled={busy !== null}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-white px-3 text-xs font-bold text-wxViolet700 disabled:opacity-60"
        >
          {busy === "preview" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Preview
        </button>
        <button
          type="button"
          onClick={() => void act("signed_url")}
          disabled={busy !== null}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder bg-white px-3 text-xs font-bold text-wxViolet700 disabled:opacity-60"
        >
          {busy === "open" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Open privately
        </button>
        <button
          type="button"
          onClick={() => void act("revoke")}
          disabled={busy !== null}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-800 disabled:opacity-60"
        >
          {busy === "revoke" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileX2 className="h-4 w-4" />
          )}
          Revoke
        </button>
      </div>
      {message ? (
        <p role="status" className="mt-2 text-xs text-wxIndigo500">
          {message}
        </p>
      ) : null}
      {preview ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${fileName}`}
          className="fixed inset-0 z-[120] grid place-items-center bg-wxIndigo950/80 p-4"
        >
          <div className="flex h-[min(82vh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-wxBorder bg-wxSurface shadow-2xl">
            <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-wxBorder px-4 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-wxIndigo900">
                  {fileName}
                </p>
                <p className="text-xs text-wxIndigo500">
                  Private audited preview
                  {preview.kind === "url" ? " / available only while signed in" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {preview.kind === "url" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewLoaded(false);
                        setPreviewFailed(false);
                        const separator = preview.url.includes("?") ? "&" : "?";
                        setPreview({ kind: "url", url: `${preview.url}${separator}refresh=${Date.now()}` });
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-xs font-bold text-wxIndigo700"
                    >
                      <RotateCw className="h-4 w-4" />
                      Reload
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(preview.url, "_blank", "noopener,noreferrer")}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-wxBorder px-3 text-xs font-bold text-wxViolet700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open full screen
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  aria-label="Close preview"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-wxBorder text-wxIndigo700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="relative min-h-0 flex-1 overflow-auto bg-white p-2">
              {preview.kind === "text" ? (
                <pre className="mx-auto max-w-4xl whitespace-pre-wrap break-words p-6 font-sans text-sm leading-7 text-slate-900">
                  {preview.text}
                </pre>
              ) : mimeType === "application/pdf" ? (
                <>
                  {!previewLoaded && !previewFailed ? (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-white text-wxIndigo700">
                      <span className="inline-flex items-center gap-2 text-sm font-bold">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading private CV preview...
                      </span>
                    </div>
                  ) : null}
                  {previewFailed ? (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-white p-6 text-center">
                      <div>
                        <p className="font-bold text-wxIndigo900">The embedded preview could not load.</p>
                        <p className="mt-2 text-sm text-wxIndigo600">Use Open full screen above to continue reviewing this private file.</p>
                      </div>
                    </div>
                  ) : null}
                  <iframe
                    title={`Preview ${fileName}`}
                    src={preview.url}
                    onLoad={() => setPreviewLoaded(true)}
                    onError={() => setPreviewFailed(true)}
                    className="h-full min-h-[60vh] w-full border-0"
                  />
                </>
              ) : mimeType.startsWith("audio/") ? (
                <div className="grid h-full place-items-center p-6">
                  <audio
                    controls
                    autoPlay={false}
                    src={preview.url}
                    onLoadedData={() => setPreviewLoaded(true)}
                    onError={() => setPreviewFailed(true)}
                    className="w-full max-w-2xl"
                  >
                    Your browser cannot preview this audio file.
                  </audio>
                </div>
              ) : mimeType.startsWith("video/") ? (
                <div className="grid h-full place-items-center bg-black p-3">
                  <video
                    controls
                    autoPlay={false}
                    playsInline
                    src={preview.url}
                    onLoadedData={() => setPreviewLoaded(true)}
                    onError={() => setPreviewFailed(true)}
                    className="max-h-full w-full max-w-4xl"
                  >
                    Your browser cannot preview this private video.
                  </video>
                </div>
              ) : mimeType.startsWith("image/") ? (
                <Image
                  src={preview.url}
                  alt={`Private preview of ${fileName}`}
                  fill
                  unoptimized
                  onLoad={() => setPreviewLoaded(true)}
                  onError={() => setPreviewFailed(true)}
                  className="object-contain p-2"
                />
              ) : (
                <p className="p-6 text-sm text-wxIndigo600">
                  This file type cannot be rendered safely in the browser.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
