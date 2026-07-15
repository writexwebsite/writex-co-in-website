"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export function AdminFileButton({ fileAssetId }: { fileAssetId: string }) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function openSignedUrl() {
    setIsLoading(true);
    setMessage("");
    const response = await fetch(`/api/admin/files/${fileAssetId}/signed-url`);
    const payload = await response.json().catch(() => null);
    setIsLoading(false);

    if (!response.ok || !payload?.data?.url) {
      setMessage(payload?.error?.message || "Secure file link is not available.");
      return;
    }

    window.open(payload.data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={openSignedUrl}
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-academicEmerald/20 bg-white px-3 py-2 text-sm font-bold text-academicEmerald transition hover:border-mutedCopper hover:text-mutedCopper disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download aria-hidden="true" size={16} />
        {isLoading ? "Preparing..." : "Open secure file"}
      </button>
      {message ? <p className="text-xs font-semibold text-deepCrimson">{message}</p> : null}
    </div>
  );
}
