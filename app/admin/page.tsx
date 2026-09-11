import { AdminDesk } from "@/components/AdminDesk";
import { event } from "@/lib/event";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `${event.name} · Quản lý`,
  description: event.adminTitle,
};

export default function AdminPage() {
  return <AdminDesk />;
}
