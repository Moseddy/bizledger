
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  TrendingUp,
  Wallet,
} from "lucide-react";

type Business = {
  id: string;
  business_name: string;
};

type Transaction = {
  id: string;
  business_id: string;
  transaction_type: "sale" | "income" | "expense";
  description: string;
  amount: number;
  category: string | null;
  transaction_date: string;
};

type Period = "daily" | "weekly" | "monthly" | "all" | "custom";

type Props = {
  businesses: Business[];
  transactions: Transaction[];
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);

const dateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const displayDate = (date: string) =>
  new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

export default function ReportsDashboard({
  businesses,
  transactions,
}: Props) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [businessId, setBusinessId] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const todayString = dateString(today);

    let startDate: string | null = null;
    let endDate: string | null = null;

    if (period === "daily") {
      startDate = todayString;
      endDate = todayString;
    }

    if (period === "weekly") {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      startDate = dateString(start);
      endDate = todayString;
    }

    if (period === "monthly") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = dateString(start);
      endDate = todayString;
    }

    if (period === "custom") {
      startDate = customStart || null;
      endDate = customEnd || null;
    }

    return transactions.filter((transaction) => {
      const matchesBusiness =
        businessId === "all" || transaction.business_id === businessId;

      const matchesStart =
        !startDate || transaction.transaction_date >= startDate;

      const matchesEnd =
        !endDate || transaction.transaction_date <= endDate;

      return matchesBusiness && matchesStart && matchesEnd;
    });
  }, [
    transactions,
    period,
    businessId,
    customStart,
    customEnd,
  ]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (result, transaction) => {
        const amount = Number(transaction.amount);

        if (transaction.transaction_type === "sale") {
          result.sales += amount;
        } else if (transaction.transaction_type === "income") {
          result.income += amount;
        } else if (transaction.transaction_type === "expense") {
          result.expenses += amount;
        }

        return result;
      },
      { sales: 0, income: 0, expenses: 0 }
    );
  }, [filteredTransactions]);

  const netMovement =
    totals.sales + totals.income - totals.expenses;

  const chartData = useMemo(() => {
    const end = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(end);
      date.setDate(end.getDate() - i);

      const key = dateString(date);

      const dayTransactions = filteredTransactions.filter(
        (transaction) => transaction.transaction_date === key
      );

      const sales = dayTransactions
        .filter((item) => item.transaction_type === "sale")
        .reduce((sum, item) => sum + Number(item.amount), 0);

      const expenses = dayTransactions
        .filter((item) => item.transaction_type === "expense")
        .reduce((sum, item) => sum + Number(item.amount), 0);

      days.push({
        key,
        label: new Intl.DateTimeFormat("en-NG", {
          weekday: "short",
        }).format(date),
        sales,
        expenses,
      });
    }

    return days;
  }, [filteredTransactions]);

  const chartMaximum = Math.max(
    ...chartData.map((day) => Math.max(day.sales, day.expenses)),
    1
  );

  const expenseCategories = useMemo(() => {
    const categories = new Map<string, number>();

    filteredTransactions
      .filter((item) => item.transaction_type === "expense")
      .forEach((item) => {
        const category = item.category || "Uncategorised";
        categories.set(
          category,
          (categories.get(category) ?? 0) + Number(item.amount)
        );
      });

    return Array.from(categories.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  const maximumCategoryExpense = Math.max(
    ...expenseCategories.map((item) => item.amount),
    1
  );

  const exportCSV = () => {
    const headers = [
      "Date",
      "Description",
      "Business",
      "Type",
      "Category",
      "Amount (NGN)",
    ];

    const rows = filteredTransactions.map((item) => {
      const business =
        businesses.find((b) => b.id === item.business_id)?.business_name ??
        "Unknown business";

      return [
        item.transaction_date,
        item.description,
        business,
        item.transaction_type,
        item.category ?? "",
        Number(item.amount).toFixed(2),
      ];
    });

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `bizledger-report-${dateString(new Date())}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    {
      title: "Recorded Sales",
      amount: totals.sales,
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Other Income",
      amount: totals.income,
      icon: ArrowDownRight,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Recorded Expenses",
      amount: totals.expenses,
      icon: ArrowUpRight,
      color: "bg-red-100 text-red-700",
    },
    {
      title: "Net Recorded Movement",
      amount: netMovement,
      icon: Wallet,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <div className="w-full space-y-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Financial Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand your business performance and financial activities.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={filteredTransactions.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={17} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <CalendarDays size={19} />
          <h2 className="font-semibold">Report Filters</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["daily", "Today"],
              ["weekly", "Last 7 Days"],
              ["monthly", "This Month"],
              ["all", "All Time"],
              ["custom", "Custom Range"],
            ] as [Period, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                period === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="business-filter"
              className="mb-2 block text-sm font-medium"
            >
              Select Business
            </label>

            <select
              id="business-filter"
              value={businessId}
              onChange={(event) => setBusinessId(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">All Businesses</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.business_name}
                </option>
              ))}
            </select>
          </div>

          {period === "custom" && (
            <>
              <div>
                <label
                  htmlFor="start-date"
                  className="mb-2 block text-sm font-medium"
                >
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="end-date"
                  className="mb-2 block text-sm font-medium"
                >
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Financial totals */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Financial Summary</h2>
          <span className="text-xs text-muted-foreground">
            {filteredTransactions.length} records
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-xl border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <div className={`rounded-lg p-2 ${card.color}`}>
                    <Icon size={19} />
                  </div>
                </div>

                <p className="mt-4 break-words text-2xl font-bold">
                  {currency(card.amount)}
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Net recorded movement is sales plus other income minus recorded
          expenses. It is not a formal accounting profit figure.
        </p>
      </section>

      {/* Sales and expenses chart */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-6">
          <h2 className="font-semibold">Sales vs Expenses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily comparison over the last seven days, using the selected
            business and report period.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-5 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-blue-500" />
            Sales
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-red-500" />
            Expenses
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-4">
          {chartData.map((day) => (
            <div key={day.key} className="min-w-0 text-center">
              <div className="flex h-48 items-end justify-center gap-1 border-b">
                <div
                  title={`Sales: ${currency(day.sales)}`}
                  className="w-3 rounded-t bg-blue-500 sm:w-5"
                  style={{
                    height: `${Math.max(
                      (day.sales / chartMaximum) * 100,
                      day.sales > 0 ? 3 : 0
                    )}%`,
                  }}
                />
                <div
                  title={`Expenses: ${currency(day.expenses)}`}
                  className="w-3 rounded-t bg-red-500 sm:w-5"
                  style={{
                    height: `${Math.max(
                      (day.expenses / chartMaximum) * 100,
                      day.expenses > 0 ? 3 : 0
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {day.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Expense categories */}
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-5">
          <h2 className="font-semibold">Expense Breakdown</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See which categories account for your recorded expenses.
          </p>
        </div>

        {expenseCategories.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No expenses found for this reporting period.
          </p>
        ) : (
          <div className="space-y-5">
            {expenseCategories.map((category) => {
              const percentage =
                (category.amount / maximumCategoryExpense) * 100;

              return (
                <div key={category.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="font-semibold">
                      {currency(category.amount)}
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Report records */}
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-5">
          <h2 className="font-semibold">Transactions in This Report</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Records included in the current report filters.
          </p>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No transactions found for the selected filters.
            <div className="mt-4">
              <Link
                href="/protected/transactions/new"
                className="font-medium text-primary hover:underline"
              >
                Record a transaction
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Business</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredTransactions.map((transaction) => {
                  const isExpense =
                    transaction.transaction_type === "expense";

                  const businessName =
                    businesses.find(
                      (business) => business.id === transaction.business_id
                    )?.business_name ?? "Unknown business";

                  return (
                    <tr key={transaction.id} className="hover:bg-muted/30">
                      <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                        {displayDate(transaction.transaction_date)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {transaction.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {transaction.category || "Uncategorised"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {businessName}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 capitalize">
                        {transaction.transaction_type}
                      </td>

                      <td
                        className={`whitespace-nowrap px-5 py-4 text-right font-semibold ${
                          isExpense ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {isExpense ? "−" : "+"}
                        {currency(Number(transaction.amount))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Link
          href="/protected"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
