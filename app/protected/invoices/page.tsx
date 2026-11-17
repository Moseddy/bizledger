
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sales Invoices | BizLedger",
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

export default async function InvoicesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    { data: invoices, error: invoiceError },
    { data: businesses },
    { data: customers },
  ] = await Promise.all([
    supabase
      .from("sales_invoices")
      .select(
        "id, business_id, customer_id, invoice_number, issue_date, due_date, total_amount, status, created_at"
      )
      .order("created_at", { ascending: false }),

    supabase.from("businesses").select("id, business_name"),

    supabase.from("customers").select("id, customer_name"),
  ]);

  if (invoiceError) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-6 dark:bg-gray-900">
          <h1 className="text-xl font-bold text-red-600">
            Unable to load invoices
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {invoiceError.message}
          </p>
        </div>
      </main>
    );
  }

  const businessNames = new Map(
    (businesses || []).map((business) => [
      business.id,
      business.business_name,
    ])
  );

  const customerNames = new Map(
    (customers || []).map((customer) => [
      customer.id,
      customer.customer_name,
    ])
  );

  const totalInvoiceValue = (invoices || []).reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || 0),
    0
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Sales Invoices
            </h1>

            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create and manage invoices issued to your customers.
            </p>
          </div>

          <Link
            href="/protected/invoices/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            + Create Invoice
          </Link>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Invoices
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {invoices?.length || 0}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Invoice Value
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {formatNaira(totalInvoiceValue)}
            </p>
          </div>
        </div>

        {!invoices || invoices.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              No invoices yet
            </h2>

            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create your first sales invoice to start tracking customer
              balances.
            </p>

            <Link
              href="/protected/invoices/new"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Create Your First Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Invoice</th>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Business</th>
                    <th className="px-5 py-4 font-semibold">Issue Date</th>
                    <th className="px-5 py-4 font-semibold">Due Date</th>
                    <th className="px-5 py-4 font-semibold">Amount</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td className="px-5 py-4 font-semibold">
                        <Link
                          href={`/protected/invoices/${invoice.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {invoice.invoice_number}
                        </Link>
                      </td>

                      <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                        {customerNames.get(invoice.customer_id) ||
                          "Unknown customer"}
                      </td>

                      <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                        {businessNames.get(invoice.business_id) ||
                          "Unknown business"}
                      </td>

                      <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                        {formatDate(invoice.issue_date)}
                      </td>

                      <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                        {formatDate(invoice.due_date)}
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                        {formatNaira(Number(invoice.total_amount || 0))}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            statusStyles[invoice.status] ||
                            "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {statusLabels[invoice.status] || invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
