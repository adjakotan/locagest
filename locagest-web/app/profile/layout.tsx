import { AppShell } from "@/components/AppShell";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AppShell roles={["owner", "manager", "tenant", "admin"]}>{children}</AppShell>;
}
