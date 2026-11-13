
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Plus,
  ReceiptText,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data: claims, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !claims?.claims) {
    redirect("/auth/login");
  }

  const [
    { data: businesses, error: businessError },
    { data: transactions, error: transactionError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name")
      .order("created_at", { ascending: false }),

    supabase
      .from("transactions")
      .select(
        "id, business_id, transaction_type, description, amount, category, payment_method, transaction_date"
      )
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (businessError || transactionError) {
    return (
      <div className="w-full rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <h2 className="font-semibold">Unable to load your dashboard</h2>
        <p className="mt-2 text-sm">
          Please refresh the page. If the problem continues, check your
          database connection and permissions.
        </p>
      </div>
    );
  }

  const businessList = businesses ?? [];
  const transactionList = transactions ?? [];

  const totalSales = transactionList
    .filter((item) => item.transaction_type === "sale")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalIncome = transactionList
    .filter((item) => item.transaction_type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpenses = transactionList
    .filter((item) => item.transaction_type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const netMovement = totalSales + totalIncome - totalExpenses;

  const businessNames = new Map(
    businessList.map((business) => [
      business.id,
      business.business_name,
    ])
  );

  const recentTransactions = transactionList.slice(0, 8);

  const stats = [
    {
      title: "Recorded Sales",
      amount: totalSales,
      icon: TrendingUp,
      description: "Sales recorded",
      iconStyle: "bg-blue-100 text-blue-700",
    },
    {
      title: "Other Income",
      amount: totalIncome,
      icon: ArrowDownRight,
      description: "Additional income",
      iconStyle: "bg-green-100 text-green-700",
    },
    {
      title: "Recorded Expenses",
      amount: totalExpenses,
      icon: ArrowUpRight,
      description: "Expenses recorded",
      iconStyle: "bg-red-100 text-red-700",
    },
    {
      title: "Net Recorded Movement",
      amount: netMovement,
      icon: Wallet,
      description: "Sales + income − expenses",
      iconStyle: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <div className="w-full flex-1 space-y-8 pb-10">
      {/* Dashboard heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s an overview of your business activities.
          </p>
        </div>

        <Link
          href="/protected/transactions/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Plus size={18} />
          Record Transaction
        </Link>
      </div>

      {/* Quick actions */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/protected/businesses/new"
          className="flex items-center gap-4 rounded-xl border bg-card p-5 transition hover:bg-accent"
        >
          <div className="rounded-lg bg-blue-100 p-3 text-blue-700">
            <Building2 size={22} />
          </div>
          <div>
            <h2 className="font-semibold">Add a Business</h2>
            <p className="text-sm text-muted-foreground">
              Register another business
            </p>
          </div>
        </Link>

        <Link
          href="/protected/transactions/new"
          className="flex items-center gap-4 rounded-xl border bg-card p-5 transition hover:bg-accent"
        >
          <div className="rounded-lg bg-green-100 p-3 text-green-700">
            <Plus size={22} />
          </div>
          <div>
            <h2 className="font-semibold">Record Activity</h2>
            <p className="text-sm text-muted-foreground">
              Add a sale, income or expense
            </p>
          </div>
        </Link>

        <Link
          href="/protected/transactions"
          className="flex items-center gap-4 rounded-xl border bg-card p-5 transition hover:bg-accent"
        >
          <div className="rounded-lg bg-purple-100 p-3 text-purple-700">
            <ReceiptText size={22} />
          </div>
          <div>
            <h2 className="font-semibold">Transaction History</h2>
            <p className="text-sm text-muted-foreground">
              View and filter transactions
            </p>
          </div>
        </Link>
      </section>

      {/* Financial summary */}
      <section>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Financial Overview</h2>
          <span className="text-xs text-muted-foreground">
            Based on your latest {transactionList.length} transaction records
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.title}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>

                  <div className={`rounded-lg p-2 ${stat.iconStyle}`}>
                    <Icon size={19} />
                  </div>
                </div>

                <p className="mt-4 break-words text-2xl font-bold tracking-tight">
                  {formatCurrency(stat.amount)}
                </p>

                <p className="mt-2 text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Net recorded movement is not the same as accounting profit. These
          figures reflect the latest 100 records, not necessarily your
          complete business history.
        </p>
      </section>

      {/* Business overview */}
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Your Businesses</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Businesses associated with your account
            </p>
          </div>

          <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">
            {businessList.length}
          </span>
        </div>

        {businessList.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed p-6 text-center">
            <Building2 className="mx-auto mb-3 text-muted-foreground" size={28} />
            <p className="font-medium">You haven&apos;t registered a business yet.</p>
            <Link
              href="/protected/businesses/new"
              className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Register your first business
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businessList.map((business) => (
              <div
                key={business.id}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <div className="rounded-lg bg-muted p-2">
                  <Building2 size={20} />
                </div>
                <p className="font-medium">{business.business_name}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent transactions */}
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Recent Transactions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your latest recorded business activities
            </p>
          </div>

          <Link
            href="/protected/transactions"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all transactions
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <ReceiptText
              size={30}
              className="mx-auto mb-3 text-muted-foreground"
            />
            <p className="font-medium">No transactions recorded yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your business activities will appear here.
            </p>
            <Link
              href="/protected/transactions/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus size={16} />
              Record your first transaction
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Business</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {recentTransactions.map((transaction) => {
                  const isExpense =
                    transaction.transaction_type === "expense";

                  return (
                    <tr key={transaction.id} className="hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {transaction.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {transaction.category || "Uncategorised"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {businessNames.get(transaction.business_id) ??
                          "Unknown business"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {formatDate(transaction.transaction_date)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isExpense
                              ? "bg-red-100 text-red-700"
                              : transaction.transaction_type === "sale"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {transaction.transaction_type === "sale"
                            ? "Sale"
                            : transaction.transaction_type === "income"
                              ? "Income"
                              : "Expense"}
                        </span>
                      </td>

                      <td
                        className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${
                          isExpense ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {isExpense ? "−" : "+"}
                        {formatCurrency(Number(transaction.amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
