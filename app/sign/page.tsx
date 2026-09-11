import { SignExperience } from "@/components/SignExperience";
import { event } from "@/lib/event";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${event.name} · Ký cam kết`,
  description: event.pledge,
};

export default function SignPage() {
  return <SignExperience />;
}
