
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentForm from "./payment-form";

export const metadata = {
  title: "Record Customer Payment | BizLedger",
};

export default async function NewPaymentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    { data: businesses, error: businessError },
    { data: customers, error: customerError },
    { data: invoices, error: invoiceError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name")
      .order("business_name"),

    supabase
      .from("customers")
      .select("id, business_id, customer_name")
      .order("customer_name"),

    supabase
      .from("sales_invoices")
      .select(
        "id, business_id, customer_id, invoice_number, total_amount, status, due_date"
      )
      .in("status", ["issued", "partially_paid"])
      .order("created_at", { ascending: false }),
  ]);

  const loadingError = businessError || customerError || invoiceError;

  if (loadingError) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-xl font-bold text-red-600">
            Unable to load payment form
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {loadingError.message}
          </p>
        </div>
      </main>
    );
  }

  const invoiceIds = (invoices || []).map((invoice) => invoice.id);

  let allocations: {
    invoice_id: string;
    amount: number;
  }[] = [];

  if (invoiceIds.length > 0) {
    const { data: allocationRecords, error: allocationError } = await supabase
      .from("customer_payment_allocations")
      .select("invoice_id, amount")
      .in("invoice_id", invoiceIds);

    if (allocationError) {
      return (
        <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
          <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h1 className="text-xl font-bold text-red-600">
              Unable to load invoice balances
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {allocationError.message}
            </p>
          </div>
        </main>
      );
    }

    allocations = (allocationRecords || []).map((allocation) => ({
      invoice_id: allocation.invoice_id,
      amount: Number(allocation.amount),
    }));
  }

  const allocatedByInvoice = new Map<string, number>();

  for (const allocation of allocations) {
    allocatedByInvoice.set(
      allocation.invoice_id,
      (allocatedByInvoice.get(allocation.invoice_id) || 0) +
        allocation.amount
    );
  }

  const outstandingInvoices = (invoices || [])
    .map((invoice) => {
      const totalAmount = Number(invoice.total_amount || 0);
      const alreadyAllocated =
        allocatedByInvoice.get(invoice.id) || 0;

      return {
        ...invoice,
        total_amount: totalAmount,
        outstanding_balance: Math.max(
          0,
          totalAmount - alreadyAllocated
        ),
      };
    })
    .filter((invoice) => invoice.outstanding_balance > 0);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/protected/invoices"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to invoices
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            Record Customer Payment
          </h1>

          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Record money received from a customer and allocate it to their
            outstanding invoices.
          </p>
        </div>

        {!businesses || businesses.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-700 dark:text-gray-300">
              You need to register a business before recording payments.
            </p>
            <Link
              href="/protected/businesses/new"
              className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-400"
            >
              Add a business
            </Link>
          </div>
        ) : (
          <PaymentForm
            businesses={businesses}
            customers={customers || []}
            invoices={outstandingInvoices}
          />
        )}
      </div>
    </main>
  );
}
