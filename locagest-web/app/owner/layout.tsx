import { AppShell } from "@/components/AppShell";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell roles={["owner", "manager"]}>{children}</AppShell>;
}
