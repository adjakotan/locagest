// Types des objets renvoyés par l'API LocaGest (voir locagest-api/docs/CONTRAT_API.md)

export type Role = "owner" | "manager" | "tenant" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  role_label: string;
  account_type: "individual" | "company" | null;
  company_name: string | null;
  company_ifu: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number; per_page: number };
}

export interface Unit {
  id: number;
  property_id: number;
  property?: { id: number; name: string; city: string };
  label: string;
  type: "room" | "apartment" | "house" | "shop";
  type_label: string;
  default_rent: number;
  status: "vacant" | "occupied";
  status_label: string;
  active_lease?: { id: number; tenant: { id: number; full_name: string } | null; rent_amount: number } | null;
  leases?: Lease[];
}

export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  neighborhood: string | null;
  description: string | null;
  reserve_rate: number;
  units_count?: number;
  occupied_units_count?: number;
  occupancy_rate?: number;
  units?: Unit[];
}

export interface Lease {
  id: number;
  unit_id: number;
  tenant_id: number;
  unit?: { id: number; label: string; property: { id: number; name: string } | null };
  tenant?: { id: number; full_name: string; phone: string };
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  deposit_amount: number;
  due_day: number;
  late_fee: number;
  status: "active" | "ended";
  status_label: string;
  deposit_returned: number | null;
  deposit_deductions_note: string | null;
}

export interface Tenant {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  id_number?: string | null;
  emergency_contact: string | null;
  has_account: boolean;
  invitation_pending: boolean;
  active_lease?: Lease | null;
  leases?: Lease[];
  balance_due?: number;
}

export type InvoiceStatus = "pending" | "partial" | "paid" | "late";

export interface InvoiceItem {
  id: number;
  type: string;
  type_label: string;
  label: string;
  amount: number;
}

export interface Payment {
  id: number;
  invoice_id: number;
  invoice?: Invoice;
  amount: number;
  paid_at: string;
  method: "cash" | "mobile_money" | "transfer";
  method_label: string;
  reference: string | null;
  has_proof: boolean;
  status: "declared" | "confirmed" | "rejected" | "cancelled";
  status_label: string;
  declared_by_tenant: boolean;
  receipt_number: string | null;
  note: string | null;
  cancel_reason: string | null;
  recorded_by?: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  period: string;
  period_label: string;
  issued_at: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: InvoiceStatus;
  status_label: string;
  days_late: number;
  lease?: Lease;
  items?: InvoiceItem[];
  payments?: Payment[];
  receipt?: { payment_id: number; receipt_number: string } | null;
}

export interface FundMovement {
  id: number;
  fund: "main" | "reserve";
  fund_label: string;
  direction: "in" | "out";
  amount: number;
  type: string;
  type_label: string;
  note: string | null;
  moved_at: string;
  recorded_by?: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  owner_id: number | null;
}

export interface Expense {
  id: number;
  property?: { id: number; name: string };
  unit?: { id: number; label: string } | null;
  category?: { id: number; name: string };
  amount: number;
  spent_at: string;
  method: string;
  method_label: string;
  supplier: string | null;
  description: string | null;
  has_receipt: boolean;
  funded_from: "main" | "reserve";
  funded_from_label: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  status_label: string;
  cancel_reason: string | null;
}

export interface MaintenanceRequest {
  id: number;
  property?: { id: number; name: string };
  unit?: { id: number; label: string } | null;
  tenant?: { id: number; full_name: string } | null;
  title: string;
  description: string;
  has_photo: boolean;
  priority: "low" | "normal" | "urgent";
  priority_label: string;
  status: "open" | "in_progress" | "resolved";
  status_label: string;
  reported_by?: string;
  resolved_at: string | null;
  created_at: string;
}

export interface Dashboard {
  month: string;
  month_label: string;
  billed: number;
  collected: number;
  outstanding: number;
  late_invoices: {
    invoice_id: number; invoice_number: string; tenant: string; phone: string;
    unit: string; property: string; remaining: number; days_late: number;
  }[];
  late_count: number;
  units_count: number;
  occupied_count: number;
  occupancy_rate: number;
  cash_main: number;
  cash_reserve: number;
  expenses_month: number;
  net_result_month: number;
  pending_payments_count: number;
  chart: { month: string; label: string; collected: number; expenses: number }[];
  properties: { id: number; name: string; city: string; units_count: number; occupancy_rate: number; main: number; reserve: number }[];
}
