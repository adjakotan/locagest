"use client";

import { useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { PropertyForm } from "@/components/forms/PropertyForm";
import { Alert, Loading, PageHeader } from "@/components/ui";
import type { Property } from "@/types";

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useApi<{ data: Property }>(`/properties/${id}`);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Modifier le bien" back={`/owner/properties/${id}`} />
      {loading ? <Loading /> : error ? <Alert>{error}</Alert> : data && <PropertyForm property={data.data} />}
    </div>
  );
}
