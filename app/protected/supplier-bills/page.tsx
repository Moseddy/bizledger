
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Supplier Bills | BizLedger",
};

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default async function SupplierBillsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [
    { data: businesses, error: businessError },
    { data: bills, error: billsError },
    { data: suppliers, error: suppliersError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name")
      .order("business_name"),

    supabase
      .from("supplier_bills")
      .select(
        "id, business_id, supplier_id, bill_number, issue_date, due_date, total_amount, status, created_at"
      )
      .order("created_at", { ascending: false }),

    supabase
      .from("suppliers")
      .select("id, supplier_name"),
  ]);

  const error =
    businessError || billsError || suppliersError;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load supplier bills: {error.message}
      </div>
    );
  }

  const businessMap = new Map(
    (businesses ?? []).map((business) => [
      business.id,
      business.business_name,
    ])
  );

  const supplierMap = new Map(
    (suppliers ?? []).map((supplier) => [
      supplier.id,
      supplier.supplier_name,
    ])
  );

  const totalOutstanding = (bills ?? [])
    .filter((bill) =>
      ["issued", "partially_paid"].includes(bill.status)
    )
    .reduce((sum, bill) => sum + Number(bill.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Supplier Bills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage bills and purchases from your suppliers.
          </p>
        </div>

        <Link
          href="/protected/supplier-bills/new"
          className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Create Supplier Bill
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">
            Total Supplier Bills
          </p>
          <p className="mt-2 text-2xl font-bold">
            {(bills ?? []).length}
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">
            Outstanding Bill Amount
          </p>
          <p className="mt-2 text-2xl font-bold">
            {formatNaira(totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on issued and partially paid bill totals.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="border-b p-4">
          <h2 className="font-semibold">All Supplier Bills</h2>
        </div>

        {!bills?.length ? (
          <div className="p-10 text-center">
            <p className="font-medium">No supplier bills yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first supplier bill to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-4">Bill Number</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Business</th>
                  <th className="p-4">Issue Date</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-t">
                    <td className="p-4 font-medium">
                      {bill.bill_number}
                    </td>
                    <td className="p-4">
                      {supplierMap.get(bill.supplier_id) ?? "Unknown supplier"}
                    </td>
                    <td className="p-4">
                      {businessMap.get(bill.business_id) ?? "Unknown business"}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {formatDate(bill.issue_date)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {formatDate(bill.due_date)}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {formatNaira(Number(bill.total_amount))}
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
                        {bill.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/protected/supplier-bills/${bill.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        View Bill
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
