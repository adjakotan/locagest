"use client";

import { useRouter } from "next/navigation";
import { TenantForm } from "@/components/forms/TenantForm";
import { Card, PageHeader } from "@/components/ui";

export default function NewTenantPage() {
  const router = useRouter();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Nouveau locataire" back="/owner/tenants" subtitle="Le locataire peut exister sans compte : vous pourrez l'inviter plus tard." />
      <Card><TenantForm onSaved={(t) => router.push(`/owner/tenants/${t.id}`)} /></Card>
    </div>
  );
}
