
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type TransactionType = "sale" | "income" | "expense";

type Business = {
  id: string;
  business_name: string;
};

type Transaction = {
  id: string;
  business_id: string;
  transaction_type: TransactionType;
  description: string;
  amount: number | string;
  category: string | null;
  payment_method: string | null;
  transaction_date: string;
  reference: string | null;
  created_at: string;
};

type Props = {
  businesses: Business[];
  transactions: Transaction[];
};

function formatMoney(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatPaymentMethod(value: string | null) {
  if (!value) return "Not specified";

  const labels: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    pos: "POS",
    cheque: "Cheque",
    other: "Other",
  };

  return labels[value] ?? value;
}

export default function TransactionList({
  businesses,
  transactions,
}: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [businessFilter, setBusinessFilter] = useState("all");

  const businessNames = useMemo(
    () =>
      new Map(
        businesses.map((business) => [
          business.id,
          business.business_name,
        ])
      ),
    [businesses]
  );

  const filteredTransactions = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesType =
        typeFilter === "all" ||
        transaction.transaction_type === typeFilter;

      const matchesBusiness =
        businessFilter === "all" ||
        transaction.business_id === businessFilter;

      const businessName =
        businessNames.get(transaction.business_id) ?? "";

      const searchableText = [
        transaction.description,
        transaction.category ?? "",
        transaction.reference ?? "",
        businessName,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchTerm || searchableText.includes(searchTerm);

      return matchesType && matchesBusiness && matchesSearch;
    });
  }, [
    transactions,
    typeFilter,
    businessFilter,
    search,
    businessNames,
  ]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (result, transaction) => {
        const amount = Number(transaction.amount);

        if (transaction.transaction_type === "sale") {
          result.sales += amount;
        }

        if (transaction.transaction_type === "income") {
          result.income += amount;
        }

        if (transaction.transaction_type === "expense") {
          result.expenses += amount;
        }

        return result;
      },
      { sales: 0, income: 0, expenses: 0 }
    );
  }, [filteredTransactions]);

  const netMovement =
    totals.sales + totals.income - totals.expenses;

  const summaryCards = [
    {
      title: "Recorded Sales",
      amount: totals.sales,
      color: "text-blue-700",
      background: "bg-blue-50",
    },
    {
      title: "Other Income",
      amount: totals.income,
      color: "text-green-700",
      background: "bg-green-50",
    },
    {
      title: "Recorded Expenses",
      amount: totals.expenses,
      color: "text-red-700",
      background: "bg-red-50",
    },
    {
      title: "Net Movement",
      amount: netMovement,
      color: netMovement >= 0 ? "text-green-700" : "text-red-700",
      background: "bg-gray-100",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className={`rounded-xl border border-gray-200 p-5 ${card.background}`}
          >
            <p className="text-sm font-medium text-gray-600">
              {card.title}
            </p>

            <p className={`mt-3 text-xl font-bold ${card.color}`}>
              {formatMoney(card.amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Find Transactions
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          <div>
            <label
              htmlFor="transaction-search"
              className="text-sm font-medium text-gray-700"
            >
              Search
            </label>

            <input
              id="transaction-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Description, category or reference"
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="type-filter"
              className="text-sm font-medium text-gray-700"
            >
              Transaction Type
            </label>

            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            >
              <option value="all">All Transactions</option>
              <option value="sale">Sales</option>
              <option value="income">Other Income</option>
              <option value="expense">Expenses</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="business-filter"
              className="text-sm font-medium text-gray-700"
            >
              Business
            </label>

            <select
              id="business-filter"
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            >
              <option value="all">All Businesses</option>

              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.business_name}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Showing {filteredTransactions.length} of{" "}
            {transactions.length} loaded transactions.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setBusinessFilter("all");
            }}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            All Transactions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            The latest 100 transactions across your accessible businesses.
          </p>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="text-lg font-semibold text-gray-800">
              No transactions found
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Try changing your filters or record a new transaction.
            </p>

            <Link
              href="/protected/transactions/new"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Record Transaction
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">

              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Description</th>
                  <th className="px-5 py-4 font-semibold">Business</th>
                  <th className="px-5 py-4 font-semibold">Category</th>
                  <th className="px-5 py-4 font-semibold">Type</th>
                  <th className="px-5 py-4 font-semibold">Payment</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {formatDate(transaction.transaction_date)}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {transaction.description}
                      </p>

                      {transaction.reference && (
                        <p className="mt-1 text-xs text-gray-500">
                          Ref: {transaction.reference}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {businessNames.get(transaction.business_id) ?? "Unknown"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {transaction.category ?? "Uncategorised"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          transaction.transaction_type === "sale"
                            ? "bg-blue-50 text-blue-700"
                            : transaction.transaction_type === "income"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {transaction.transaction_type}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {formatPaymentMethod(transaction.payment_method)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-gray-900">
                      {formatMoney(Number(transaction.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Financial totals above reflect the transactions currently loaded
        and any active filters. They represent recorded money movement,
        not final accounting profit.
      </p>

    </div>
  );
}
