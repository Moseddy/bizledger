"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Business = {
  id: string;
  business_name: string;
};

type TransactionType = "sale" | "income" | "expense";

const categories: Record<TransactionType, string[]> = {
  sale: [
    "Product Sales",
    "Service Sales",
    "Other Sales",
  ],

  income: [
    "Interest Received",
    "Rental Income",
    "Commission",
    "Other Income",
  ],

  expense: [
    "Cost of Goods",
    "Rent",
    "Salaries and Wages",
    "Transportation",
    "Utilities",
    "Internet and Phone",
    "Marketing",
    "Repairs and Maintenance",
    "Bank Charges",
    "Taxes and Levies",
    "Other Expenses",
  ],
};

const inputClass =
  "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function TransactionForm({
  businesses,
}: {
  businesses: Business[];
}) {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    business_id: businesses[0]?.id ?? "",
    transaction_type: "sale" as TransactionType,
    description: "",
    amount: "",
    category: "",
    payment_method: "cash",
    transaction_date: "",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    const now = new Date();

    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    setFormData((current) => ({
      ...current,
      transaction_date: localDate,
    }));
  }, []);

  function handleChange(
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleTypeChange(value: TransactionType) {
    setFormData((current) => ({
      ...current,
      transaction_type: value,
      category: "",
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.business_id) {
      setError("Please select a business.");
      return;
    }

    const amount = Number(formData.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid transaction amount.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          business_id: formData.business_id,
          transaction_type: formData.transaction_type,
          description: formData.description.trim(),
          amount,
          category: formData.category || null,
          payment_method: formData.payment_method,
          transaction_date: formData.transaction_date,
          reference: formData.reference.trim() || null,
          notes: formData.notes.trim() || null,
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess("Transaction recorded successfully!");

      setFormData((current) => ({
        ...current,
        description: "",
        amount: "",
        category: "",
        reference: "",
        notes: "",
      }));

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record transaction. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg bg-green-50 p-4 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* Business */}
      <div>
        <label
          htmlFor="business_id"
          className="font-medium text-gray-700"
        >
          Business *
        </label>

        <select
          id="business_id"
          name="business_id"
          value={formData.business_id}
          onChange={handleChange}
          required
          className={inputClass}
        >
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.business_name}
            </option>
          ))}
        </select>
      </div>

      {/* Transaction Type */}
      <div>
        <label className="font-medium text-gray-700">
          Transaction Type *
        </label>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {(["sale", "income", "expense"] as TransactionType[]).map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                aria-pressed={formData.transaction_type === type}
                className={`rounded-lg border px-3 py-4 text-sm font-semibold capitalize transition ${
                  formData.transaction_type === type
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {type}
              </button>
            )
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="font-medium text-gray-700"
        >
          Description *
        </label>

        <input
          id="description"
          name="description"
          type="text"
          required
          maxLength={255}
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g. Sale of 10 bags of rice"
          className={inputClass}
        />
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="font-medium text-gray-700">
          Amount (₦) *
        </label>

        <input
          id="amount"
          name="amount"
          type="number"
          required
          min="0.01"
          step="0.01"
          value={formData.amount}
          onChange={handleChange}
          placeholder="e.g. 50000"
          className={inputClass}
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="font-medium text-gray-700">
          Category *
        </label>

        <select
          id="category"
          name="category"
          required
          value={formData.category}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="">Select category</option>

          {categories[formData.transaction_type].map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Payment Method */}
      <div>
        <label
          htmlFor="payment_method"
          className="font-medium text-gray-700"
        >
          Payment Method *
        </label>

        <select
          id="payment_method"
          name="payment_method"
          required
          value={formData.payment_method}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="pos">POS</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Transaction Date */}
      <div>
        <label
          htmlFor="transaction_date"
          className="font-medium text-gray-700"
        >
          Transaction Date *
        </label>

        <input
          id="transaction_date"
          name="transaction_date"
          type="date"
          required
          value={formData.transaction_date}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {/* Reference */}
      <div>
        <label htmlFor="reference" className="font-medium text-gray-700">
          Reference Number
        </label>

        <input
          id="reference"
          name="reference"
          type="text"
          maxLength={100}
          value={formData.reference}
          onChange={handleChange}
          placeholder="Optional receipt or transfer reference"
          className={inputClass}
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="font-medium text-gray-700">
          Additional Notes
        </label>

        <textarea
          id="notes"
          name="notes"
          rows={4}
          value={formData.notes}
          onChange={handleChange}
          placeholder="Additional information about this transaction"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Saving Transaction..." : "Save Transaction"}
      </button>
    </form>
  );
}
