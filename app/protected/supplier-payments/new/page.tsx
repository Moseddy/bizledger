
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SupplierPaymentForm from "./payment-form";

export const metadata = {
  title: "Record Supplier Payment | BizLedger",
};

export default async function NewSupplierPaymentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [
    { data: businesses, error: businessError },
    { data: suppliers, error: supplierError },
    { data: bills, error: billError },
    { data: allocations, error: allocationError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name")
      .order("business_name"),

    supabase
      .from("suppliers")
      .select("id, business_id, supplier_name")
      .order("supplier_name"),

    supabase
      .from("supplier_bills")
      .select(
        "id, business_id, supplier_id, bill_number, issue_date, due_date, total_amount, status"
      )
      .in("status", ["issued", "partially_paid"])
      .order("due_date"),

    supabase
      .from("supplier_payment_allocations")
      .select("bill_id, amount"),
  ]);

  const queryError =
    businessError || supplierError || billError || allocationError;

  if (queryError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load supplier payment information: {queryError.message}
      </div>
    );
  }

  const allocatedByBill = new Map<string, number>();

  for (const allocation of allocations ?? []) {
    allocatedByBill.set(
      allocation.bill_id,
      (allocatedByBill.get(allocation.bill_id) ?? 0) +
        Number(allocation.amount)
    );
  }

  const outstandingBills = (bills ?? [])
    .map((bill) => ({
      ...bill,
      outstanding:
        Number(bill.total_amount) -
        (allocatedByBill.get(bill.id) ?? 0),
    }))
    .filter((bill) => bill.outstanding > 0.009);

  if (!businesses?.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Record Supplier Payment</h1>
        <p className="text-sm text-muted-foreground">
          Register a business before recording supplier payments.
        </p>
        <Link
          href="/protected/businesses/new"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Add Business
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/protected/suppliers"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to Suppliers
        </Link>

        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Record Supplier Payment
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Record money paid to a supplier and allocate it to outstanding bills.
        </p>
      </div>

      <SupplierPaymentForm
        businesses={businesses ?? []}
        suppliers={suppliers ?? []}
        outstandingBills={outstandingBills}
      />
    </div>
  );
}
