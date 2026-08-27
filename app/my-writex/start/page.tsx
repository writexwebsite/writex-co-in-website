import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<{ similar?: string; upcoming?: string; mode?: string }> }) {
  const query = await searchParams;
  const destination = new URLSearchParams();
  if (query.similar) destination.set("fromProject", query.similar);
  if (query.upcoming) destination.set("fromUpcoming", query.upcoming);
  redirect(`/my-writex/new-requirement${destination.size ? `?${destination}` : ""}`);
}
