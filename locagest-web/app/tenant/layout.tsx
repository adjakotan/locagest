import { AppShell } from "@/components/AppShell";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <AppShell roles={["tenant"]}>{children}</AppShell>;
}
