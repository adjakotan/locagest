import { PropertyForm } from "@/components/forms/PropertyForm";
import { PageHeader } from "@/components/ui";

export default function NewPropertyPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Nouveau bien" back="/owner/properties" />
      <PropertyForm />
    </div>
  );
}
