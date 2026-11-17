
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Invoice Details | BizLedger",
};

type InvoiceDetailsPageProps = {
  params: Promise<{ id: string }>;
};

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (date: string | null) => {
  if (!date) return "—";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatPaymentDate = (date: string | null) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  issued: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  partially_paid:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  void: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  issued: "Issued",
  partially_paid: "Partially Paid",
  paid: "Paid",
  void: "Void",
};

export default async function InvoiceDetailsPage({
  params,
}: InvoiceDetailsPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // 1. Retrieve the invoice.
  // Supabase RLS ensures the user can only access invoices
  // belonging to businesses they are authorized to access.

  const { data: invoice, error: invoiceError } = await supabase
    .from("sales_invoices")
    .select(
      "id, business_id, customer_id, invoice_number, issue_date, due_date, total_amount, status, notes, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (invoiceError) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-xl font-bold text-red-600">
            Unable to load invoice
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {invoiceError.message}
          </p>
          <Link
            href="/protected/invoices"
            className="mt-5 inline-block text-blue-600 hover:underline dark:text-blue-400"
          >
            Back to invoices
          </Link>
        </div>
      </main>
    );
  }

  if (!invoice) {
    notFound();
  }

  // 2. Retrieve the business, customer and invoice items.

  const [
    { data: business, error: businessError },
    { data: customer, error: customerError },
    { data: items, error: itemsError },
    { data: allocations, error: allocationError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name, phone, email, address")
      .eq("id", invoice.business_id)
      .maybeSingle(),

    supabase
      .from("customers")
      .select("id, customer_name, phone, email, address")
      .eq("id", invoice.customer_id)
      .maybeSingle(),

    supabase
      .from("sales_invoice_items")
      .select("id, description, quantity, unit_price, line_total")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: true }),

    supabase
      .from("customer_payment_allocations")
      .select("id, payment_id, amount")
      .eq("invoice_id", invoice.id),
  ]);

  const supportingError =
    businessError || customerError || itemsError || allocationError;

  if (supportingError) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-xl font-bold text-red-600">
            Unable to load invoice information
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {supportingError.message}
          </p>
          <Link
            href="/protected/invoices"
            className="mt-5 inline-block text-blue-600 hover:underline dark:text-blue-400"
          >
            Back to invoices
          </Link>
        </div>
      </main>
    );
  }

  // 3. Retrieve the actual payments associated with this invoice.

  const paymentIds = [
    ...new Set((allocations || []).map((allocation) => allocation.payment_id)),
  ];

  let payments: {
    id: string;
    payment_date: string;
    payment_method: string;
    reference: string | null;
  }[] = [];

  if (paymentIds.length > 0) {
    const { data: paymentRecords, error: paymentError } = await supabase
      .from("customer_payments")
      .select("id, payment_date, payment_method, reference")
      .in("id", paymentIds);

    if (paymentError) {
      return (
        <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
          <div className="mx-auto max-w-5xl rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h1 className="text-xl font-bold text-red-600">
              Unable to load payment history
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {paymentError.message}
            </p>
          </div>
        </main>
      );
    }

    payments = paymentRecords || [];
  }

  // 4. Calculate how much has actually been allocated to this invoice.

  const amountPaid = (allocations || []).reduce(
    (sum, allocation) => sum + Number(allocation.amount || 0),
    0
  );

  const invoiceTotal = Number(invoice.total_amount || 0);

  const outstandingBalance = Math.max(0, invoiceTotal - amountPaid);

  const paymentMap = new Map(
    payments.map((payment) => [payment.id, payment])
  );

  const invoiceItems = items || [];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl">

        {/* Page Header */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/protected/invoices"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              ← Back to invoices
            </Link>

            <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {invoice.invoice_number}
            </h1>

            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  statusStyles[invoice.status] ||
                  "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                {statusLabels[invoice.status] || invoice.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled
              title="Printing will be implemented in a later step"
              className="cursor-not-allowed rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-400 dark:border-gray-700 dark:text-gray-600"
            >
              Print Invoice
            </button>

            <button
              type="button"
              disabled
              title="PDF export will be implemented in a later step"
              className="cursor-not-allowed rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white opacity-50"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Invoice Summary */}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Invoice Total
            </p>
            <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
              {formatNaira(invoiceTotal)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Amount Paid
            </p>
            <p className="mt-2 text-xl font-bold text-green-600 dark:text-green-400">
              {formatNaira(amountPaid)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Outstanding Balance
            </p>
            <p className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatNaira(outstandingBalance)}
            </p>
          </div>
        </div>

        {/* Business and Customer Information */}

        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              From
            </h2>

            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {business?.business_name || "Business information unavailable"}
            </p>

            {business?.address && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {business.address}
              </p>
            )}

            {business?.phone && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {business.phone}
              </p>
            )}

            {business?.email && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {business.email}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Bill To
            </h2>

            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {customer?.customer_name || "Customer information unavailable"}
            </p>

            {customer?.address && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {customer.address}
              </p>
            )}

            {customer?.phone && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {customer.phone}
              </p>
            )}

            {customer?.email && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {customer.email}
              </p>
            )}
          </section>
        </div>

        {/* Invoice Dates */}

        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            Invoice Information
          </h2>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Invoice Number
              </p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {invoice.invoice_number}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Issue Date
              </p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {formatDate(invoice.issue_date)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Due Date
              </p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {formatDate(invoice.due_date)}
              </p>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                {invoice.notes}
              </p>
            </div>
          )}
        </section>

        {/* Invoice Items */}

        <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-6 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Invoice Items
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-6 py-4 font-semibold">Description</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Unit Price
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Line Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {invoiceItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {item.description}
                    </td>

                    <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">
                      {Number(item.quantity).toLocaleString("en-NG")}
                    </td>

                    <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">
                      {formatNaira(Number(item.unit_price))}
                    </td>

                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                      {formatNaira(Number(item.line_total))}
                    </td>
                  </tr>
                ))}

                {invoiceItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      No invoice items were found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-gray-200 p-6 dark:border-gray-800">
            <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Subtotal
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatNaira(invoiceTotal)}
                </span>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-3 dark:border-gray-800">
                <span className="font-semibold text-gray-900 dark:text-white">
                  Total
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatNaira(invoiceTotal)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Payment History */}

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-6 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment History
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Payments allocated to this invoice.
            </p>
          </div>

          {(allocations || []).length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-gray-700 dark:text-gray-300">
                No payments recorded against this invoice yet.
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Payments will appear here once they are recorded and allocated.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Payment Date</th>
                    <th className="px-6 py-4 font-semibold">Method</th>
                    <th className="px-6 py-4 font-semibold">Reference</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Amount Allocated
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(allocations || []).map((allocation) => {
                    const payment = paymentMap.get(allocation.payment_id);

                    return (
                      <tr key={allocation.id}>
                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {formatPaymentDate(payment?.payment_date || null)}
                        </td>

                        <td className="px-6 py-4 capitalize text-gray-700 dark:text-gray-300">
                          {(payment?.payment_method || "—").replaceAll("_", " ")}
                        </td>

                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                          {payment?.reference || "—"}
                        </td>

                        <td className="px-6 py-4 text-right font-semibold text-green-600 dark:text-green-400">
                          {formatNaira(Number(allocation.amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end border-t border-gray-200 p-6 dark:border-gray-800">
            <div className="w-full max-w-xs flex justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Total Paid
              </span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {formatNaira(amountPaid)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
