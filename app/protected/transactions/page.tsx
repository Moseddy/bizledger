
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TransactionList from "./transaction-list";

export const metadata = {
  title: "Transaction History | BizLedger",
};

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    { data: businesses, error: businessError },
    { data: transactions, error: transactionError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name")
      .order("business_name"),

    supabase
      .from("transactions")
      .select(`
        id,
        business_id,
        transaction_type,
        description,
        amount,
        category,
        payment_method,
        transaction_date,
        reference,
        created_at
      `)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (businessError || transactionError) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6">
          <h1 className="text-xl font-bold text-red-600">
            Unable to load transaction history
          </h1>

          <p className="mt-3 text-gray-600">
            {businessError?.message || transactionError?.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/protected"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-4 text-3xl font-bold text-gray-900">
              Transaction History
            </h1>

            <p className="mt-2 text-gray-600">
              Review and monitor your business financial transactions.
            </p>
          </div>

          <Link
            href="/protected/transactions/new"
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            + Record Transaction
          </Link>
        </div>

        {businesses && businesses.length > 0 ? (
          <TransactionList
            businesses={businesses}
            transactions={transactions ?? []}
          />
        ) : (
          <div className="rounded-xl border bg-white p-8 text-center">
            <h2 className="text-xl font-semibold">
              No registered business
            </h2>

            <p className="mt-2 text-gray-600">
              Register a business before recording transactions.
            </p>

            <Link
              href="/protected/businesses/new"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white"
            >
              Register Business
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
