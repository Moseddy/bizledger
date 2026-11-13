
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ReportsDashboard from "./reports-dashboard";

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data, error: authError } = await supabase.auth.getClaims();

  if (authError || !data?.claims) {
    redirect("/auth/login");
  }

  const { data: businesses, error: businessError } = await supabase
    .from("businesses")
    .select("id, business_name")
    .order("business_name");

  if (businessError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
        Unable to load your businesses. Please refresh the page.
      </div>
    );
  }

  // Retrieve transaction records in batches to avoid the usual
  // Supabase/PostgREST maximum rows per request.
  const allTransactions: {
    id: string;
    business_id: string;
    transaction_type: "sale" | "income" | "expense";
    description: string;
    amount: number;
    category: string | null;
    transaction_date: string;
  }[] = [];

  const batchSize = 1000;
  let offset = 0;

  while (true) {
    const { data: batch, error } = await supabase
      .from("transactions")
      .select(
        "id, business_id, transaction_type, description, amount, category, transaction_date"
      )
      .order("transaction_date", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
          Unable to load financial records. Please refresh the page.
        </div>
      );
    }

    allTransactions.push(...(batch ?? []));

    if (!batch || batch.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  return (
    <ReportsDashboard
      businesses={businesses ?? []}
      transactions={allTransactions}
    />
  );
}
