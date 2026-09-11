import { SignatureWall } from "@/components/SignatureWall";
import { event } from "@/lib/event";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${event.name} · LED`,
  description: event.wallTitle,
};

export default function WallPage() {
  return <SignatureWall />;
}
