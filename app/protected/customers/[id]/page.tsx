
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Customer Account | BizLedger",
};

type Props = {
  params: Promise<{ id: string }>;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";

  const date = new Date(
    value.length === 10 ? `${value}T00:00:00` : value
  );

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default async function CustomerDetailsPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  // Fetch customer.
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select(
      "id, business_id, customer_name, phone, email, address, notes, created_at"
    )
    .eq("id", id)
    .single();

  if (customerError || !customer) {
    notFound();
  }

  // Fetch business.
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, business_name, currency")
    .eq("id", customer.business_id)
    .single();

  if (businessError || !business) {
    notFound();
  }

  // Fetch customer invoices and payments.
  const [
    { data: invoices, error: invoiceError },
    { data: payments, error: paymentError },
  ] = await Promise.all([
    supabase
      .from("sales_invoices")
      .select(
        "id, invoice_number, issue_date, due_date, total_amount, status, created_at"
      )
      .eq("business_id", customer.business_id)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("customer_payments")
      .select(
        "id, amount, payment_method, payment_date, reference, notes, created_at"
      )
      .eq("business_id", customer.business_id)
      .eq("customer_id", customer.id)
      .order("payment_date", { ascending: false }),
  ]);

  if (invoiceError || paymentError) {
    return (
      <div className="p-6 text-red-600">
        Unable to load this customer&apos;s financial history.
      </div>
    );
  }

  const customerInvoices = invoices ?? [];
  const customerPayments = payments ?? [];

  // Fetch allocations for this customer's payments.
  const paymentIds = customerPayments.map((payment) => payment.id);

  let allocations: {
    id: string;
    payment_id: string;
    invoice_id: string;
    amount: number;
  }[] = [];

  if (paymentIds.length > 0) {
    const { data, error } = await supabase
      .from("customer_payment_allocations")
      .select("id, payment_id, invoice_id, amount")
      .eq("business_id", customer.business_id)
      .in("payment_id", paymentIds);

    if (error) {
      return (
        <div className="p-6 text-red-600">
          Unable to load customer payment allocations.
        </div>
      );
    }

    allocations = data ?? [];
  }

  // Financial calculations.
  const validInvoices = customerInvoices.filter(
    (invoice) => !["draft", "void"].includes(invoice.status)
  );

  const totalInvoiced = validInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount),
    0
  );

  const totalReceived = customerPayments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  const totalAllocated = allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount),
    0
  );

  const outstandingBalance = Math.max(
    0,
    totalInvoiced - totalAllocated
  );

  const unallocatedPayments = Math.max(
    0,
    totalReceived - totalAllocated
  );

  const currency = business.currency || "NGN";

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);

  const getInvoicePaid = (invoiceId: string) =>
    allocations
      .filter((allocation) => allocation.invoice_id === invoiceId)
      .reduce(
        (sum, allocation) => sum + Number(allocation.amount),
        0
      );

  const statusStyles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    issued: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    partially_paid:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    paid: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    void: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-6">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/protected/customers"
            className="mb-3 inline-block text-sm text-blue-600 hover:underline"
          >
            ← Back to Customers
          </Link>

          <h1 className="text-2xl font-bold tracking-tight">
            {customer.customer_name}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {business.business_name}
          </p>
        </div>

        <Link
          href={`/protected/payments/new`}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
        >
          Record Payment
        </Link>
      </div>

      {/* Customer Information */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Customer Information</h2>

        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-gray-500">Phone</p>
            <p className="mt-1 font-medium">{customer.phone || "—"}</p>
          </div>

          <div>
            <p className="text-gray-500">Email</p>
            <p className="mt-1 font-medium">{customer.email || "—"}</p>
          </div>

          <div>
            <p className="text-gray-500">Address</p>
            <p className="mt-1 font-medium">{customer.address || "—"}</p>
          </div>

          <div>
            <p className="text-gray-500">Customer since</p>
            <p className="mt-1 font-medium">
              {formatDate(customer.created_at)}
            </p>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="text-sm text-gray-500">Notes</p>
            <p className="mt-1 text-sm">{customer.notes}</p>
          </div>
        )}
      </section>

      {/* Financial Summary */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Financial Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Invoiced",
              amount: totalInvoiced,
            },
            {
              label: "Total Received",
              amount: totalReceived,
            },
            {
              label: "Outstanding Balance",
              amount: outstandingBalance,
            },
            {
              label: "Unallocated Payments",
              amount: unallocatedPayments,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-sm text-gray-500">{item.label}</p>

              <p className="mt-2 text-xl font-bold tracking-tight">
                {formatMoney(item.amount)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Invoice History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invoice History</h2>

          <span className="text-sm text-gray-500">
            {customerInvoices.length} invoices
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="p-4">Invoice</th>
                <th className="p-4">Date</th>
                <th className="p-4">Total</th>
                <th className="p-4">Paid</th>
                <th className="p-4">Balance</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {customerInvoices.map((invoice) => {
                const paid = getInvoicePaid(invoice.id);
                const balance = Math.max(
                  0,
                  Number(invoice.total_amount) - paid
                );

                return (
                  <tr key={invoice.id}>
                    <td className="p-4 font-medium">
                      <Link
                        href={`/protected/invoices/${invoice.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>

                    <td className="p-4">
                      {formatDate(invoice.issue_date)}
                    </td>

                    <td className="p-4">
                      {formatMoney(Number(invoice.total_amount))}
                    </td>

                    <td className="p-4 text-green-600">
                      {formatMoney(paid)}
                    </td>

                    <td className="p-4 font-medium">
                      {formatMoney(balance)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusStyles[invoice.status] ??
                          statusStyles.draft
                        }`}
                      >
                        {invoice.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {customerInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No invoices have been created for this customer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payment History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Payment History</h2>

          <span className="text-sm text-gray-500">
            {customerPayments.length} payments
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="p-4">Payment Date</th>
                <th className="p-4">Amount Received</th>
                <th className="p-4">Method</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Allocated</th>
                <th className="p-4">Unallocated</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {customerPayments.map((payment) => {
                const paymentAllocations = allocations.filter(
                  (allocation) => allocation.payment_id === payment.id
                );

                const allocated = paymentAllocations.reduce(
                  (sum, allocation) =>
                    sum + Number(allocation.amount),
                  0
                );

                const unallocated = Math.max(
                  0,
                  Number(payment.amount) - allocated
                );

                return (
                  <tr key={payment.id}>
                    <td className="p-4">
                      {formatDate(payment.payment_date)}
                    </td>

                    <td className="p-4 font-medium">
                      {formatMoney(Number(payment.amount))}
                    </td>

                    <td className="p-4 capitalize">
                      {payment.payment_method.replace("_", " ")}
                    </td>

                    <td className="p-4">
                      {payment.reference || "—"}
                    </td>

                    <td className="p-4 text-green-600">
                      {formatMoney(allocated)}
                    </td>

                    <td className="p-4">
                      {formatMoney(unallocated)}
                    </td>
                  </tr>
                );
              })}

              {customerPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No payments have been recorded for this customer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Allocation Details */}
        {customerPayments.length > 0 && (
          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
            <h3 className="mb-4 font-semibold">
              Payment Allocation Details
            </h3>

            <div className="space-y-4">
              {customerPayments.map((payment) => {
                const paymentAllocations = allocations.filter(
                  (allocation) => allocation.payment_id === payment.id
                );

                return (
                  <div
                    key={payment.id}
                    className="border-b border-gray-100 pb-4 last:border-0 dark:border-gray-800"
                  >
                    <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-medium">
                        Payment — {formatDate(payment.payment_date)}
                      </span>

                      <span>
                        {formatMoney(Number(payment.amount))}
                      </span>
                    </div>

                    {paymentAllocations.length > 0 ? (
                      <div className="space-y-2 pl-4">
                        {paymentAllocations.map((allocation) => {
                          const invoice = customerInvoices.find(
                            (item) => item.id === allocation.invoice_id
                          );

                          return (
                            <div
                              key={allocation.id}
                              className="flex justify-between gap-3 text-sm text-gray-500"
                            >
                              <span>
                                {invoice ? (
                                  <Link
                                    href={`/protected/invoices/${invoice.id}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {invoice.invoice_number}
                                  </Link>
                                ) : (
                                  "Invoice"
                                )}
                              </span>

                              <span>
                                {formatMoney(Number(allocation.amount))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="pl-4 text-sm text-gray-500">
                        No invoice allocation recorded.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
