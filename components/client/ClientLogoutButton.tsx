"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { trackDemoEvent } from "@/lib/demo/analytics";

export function ClientLogoutButton({ isDemo = false }: { isDemo?: boolean }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch(isDemo ? "/api/demo/logout" : "/api/client/logout", { method: "POST" });
    if (isDemo) trackDemoEvent("demo_logout", { demo_type: "client", page_path: "/client/dashboard" });
    router.push("/client-login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="inline-flex items-center gap-2 rounded-md border border-sageBorder bg-white px-3 py-2 text-sm font-bold text-charcoalInk transition hover:border-mutedCopper disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {isLoggingOut ? "Signing out..." : "Logout"}
    </button>
  );
}
