"use client";

import { useEffect } from "react";

export function LoginPreviewAppearance() {
  useEffect(() => {
    const root = document.documentElement;
    const requested = new URLSearchParams(window.location.search).get(
      "appearance"
    );
    if (requested !== "light" && requested !== "dark") return;

    const apply = () => {
      if (root.dataset.holidayPreview !== "true") return;
      if (root.dataset.theme !== requested) root.dataset.theme = requested;
      if (root.style.colorScheme !== requested) {
        root.style.colorScheme = requested;
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-holiday-preview", "data-theme"]
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
