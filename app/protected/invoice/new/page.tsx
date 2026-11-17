
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InvoiceForm from "./invoice-form";

export const metadata = {
  title: "Create Sales Invoice | BizLedger",
};

export default async function NewInvoicePage() {
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
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name")
      .order("created_at", { ascending: false }),

    supabase
      .from("customers")
      .select("id, business_id, customer_name")
      .order("customer_name", { ascending: true }),
  ]);

  if (businessError || customerError) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-6">
          <h1 className="text-xl font-bold text-red-600">
            Unable to load invoice information
          </h1>
          <p className="mt-2 text-gray-600">
            {businessError?.message || customerError?.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/protected/invoices"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Invoices
          </Link>

          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            Create Sales Invoice
          </h1>

          <p className="mt-2 text-gray-600">
            Create an invoice for goods or services supplied to a customer.
          </p>
        </div>

        {businesses && businesses.length > 0 ? (
          <InvoiceForm
            businesses={businesses}
            customers={customers || []}
          />
        ) : (
          <div className="rounded-xl border bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              No business registered
            </h2>

            <p className="mt-2 text-gray-600">
              Register a business before creating an invoice.
            </p>

            <Link
              href="/protected/businesses/new"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Register Business
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
