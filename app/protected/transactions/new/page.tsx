import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TransactionForm from "./transaction-form";

export const metadata = {
  title: "Record Transaction | BizLedger",
};

export default async function NewTransactionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, business_name")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-6">
          <h1 className="text-xl font-bold text-red-600">
            Unable to load businesses
          </h1>
          <p className="mt-2 text-gray-600">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">

        <div className="mb-8">
          <Link
            href="/protected"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            Record Transaction
          </h1>

          <p className="mt-2 text-gray-600">
            Record sales, income and expenses for your business.
          </p>
        </div>

        {businesses && businesses.length > 0 ? (
          <TransactionForm businesses={businesses} />
        ) : (
          <div className="rounded-xl border bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              No business registered
            </h2>

            <p className="mt-2 text-gray-600">
              Register a business before recording transactions.
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
