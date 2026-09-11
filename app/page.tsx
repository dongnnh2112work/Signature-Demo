import { HubHome } from "@/components/HubHome";
import { event } from "@/lib/event";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${event.name} · Điều hướng`,
  description: event.hubSubtitle,
};

export default function Home() {
  return <HubHome />;
}
