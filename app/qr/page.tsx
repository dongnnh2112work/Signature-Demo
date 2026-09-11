import { EventQr } from "@/components/EventQr";
import { event } from "@/lib/event";
import { getAppOrigin } from "@/lib/origin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${event.name} · QR`,
  description: event.qrTitle,
};

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const origin = await getAppOrigin();

  return <EventQr url={`${origin}/sign`} />;
}
