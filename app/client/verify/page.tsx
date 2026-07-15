import { redirect } from "next/navigation";

export default function LegacyClientVerifyPage() {
  redirect("/client-login");
}
