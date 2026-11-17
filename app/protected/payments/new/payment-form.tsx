
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Business = {
  id: string;
  business_name: string;
};

type Customer = {
  id: string;
  business_id: string;
  customer_name: string;
};

type OutstandingInvoice = {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  due_date: string | null;
  outstanding_balance: number;
};

type PaymentFormProps = {
  businesses: Business[];
  customers: Customer[];
  invoices: OutstandingInvoice[];
};

const getLocalDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
};

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-900/40";

export default function PaymentForm({
  businesses,
  customers,
  invoices,
}: PaymentFormProps) {
  const router = useRouter();

  const [businessId, setBusinessId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(getLocalDate());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const availableCustomers = useMemo(
    () => customers.filter((customer) => customer.business_id === businessId),
    [customers, businessId]
  );

  const availableInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.business_id === businessId &&
          invoice.customer_id === customerId &&
          invoice.outstanding_balance > 0
      ),
    [invoices, businessId, customerId]
  );

  const paymentAmount = Number(amount) || 0;

  const allocationEntries = Object.entries(allocations)
    .filter(([, value]) => Number(value) > 0)
    .map(([invoiceId, value]) => ({
      invoice_id: invoiceId,
      amount: Number(value),
    }));

  const allocatedTotal = allocationEntries.reduce(
    (sum, allocation) => sum + allocation.amount,
    0
  );

  const remainingToAllocate = paymentAmount - allocatedTotal;

  const handleBusinessChange = (value: string) => {
    setBusinessId(value);
    setCustomerId("");
    setAllocations({});
    setError("");
    setSuccess("");
  };

  const handleCustomerChange = (value: string) => {
    setCustomerId(value);
    setAllocations({});
    setError("");
    setSuccess("");
  };

  const handleAllocationChange = (invoiceId: string, value: string) => {
    setAllocations((current) => ({
      ...current,
      [invoiceId]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!businessId || !customerId) {
      setError("Please select a business and customer.");
      return;
    }

    if (!amount || !Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Enter a valid payment amount greater than zero.");
      return;
    }

    if (!paymentDate) {
      setError("Please select the payment date.");
      return;
    }

    if (allocationEntries.length === 0) {
      setError("Allocate this payment to at least one invoice.");
      return;
    }

    if (allocatedTotal > paymentAmount) {
      setError("Allocated amounts cannot exceed the payment amount.");
      return;
    }

    const invalidAllocation = allocationEntries.find((allocation) => {
      const invoice = availableInvoices.find(
        (item) => item.id === allocation.invoice_id
      );

      return (
        !invoice ||
        !Number.isFinite(allocation.amount) ||
        allocation.amount <= 0 ||
        allocation.amount > invoice.outstanding_balance
      );
    });

    if (invalidAllocation) {
      setError(
        "An allocation is invalid or exceeds the invoice's outstanding balance."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: paymentError } = await supabase.rpc(
        "record_customer_payment",
        {
          p_business_id: businessId,
          p_customer_id: customerId,
          p_amount: paymentAmount,
          p_payment_method: paymentMethod,
          p_payment_date: paymentDate,
          p_reference: reference.trim() || null,
          p_notes: notes.trim() || null,
          p_allocations: allocationEntries,
        }
      );

      if (paymentError) {
        setError(paymentError.message);
        return;
      }

      setSuccess("Customer payment recorded successfully.");

      setBusinessId("");
      setCustomerId("");
      setAmount("");
      setPaymentMethod("bank_transfer");
      setPaymentDate(getLocalDate());
      setReference("");
      setNotes("");
      setAllocations({});

      router.refresh();
    } catch {
      setError("An unexpected error occurred while recording the payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Business and Customer */}

      <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payment Details
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select the business and customer making the payment.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Business *
            </label>
            <select
              required
              value={businessId}
              onChange={(event) => handleBusinessChange(event.target.value)}
              className={inputClass}
            >
              <option value="">Select business</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.business_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Customer *
            </label>
            <select
              required
              value={customerId}
              onChange={(event) => handleCustomerChange(event.target.value)}
              disabled={!businessId}
              className={inputClass}
            >
              <option value="">Select customer</option>
              {availableCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Payment Information */}

      <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Payment Information
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Amount Received (₦) *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 150000"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Method *
            </label>
            <select
              required
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={inputClass}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="pos">POS</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="e.g. Bank transaction reference"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional payment information..."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Invoice Allocations */}

      <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Allocate Payment to Invoices
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You can allocate this payment across multiple outstanding invoices
            belonging to the selected customer.
          </p>
        </div>

        {!businessId || !customerId ? (
          <p className="rounded-lg bg-gray-50 p-5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Select a business and customer to view outstanding invoices.
          </p>
        ) : availableInvoices.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            This customer has no outstanding issued invoices.
          </p>
        ) : (
          <div className="space-y-4">
            {availableInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="grid gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700 md:grid-cols-[1fr_1fr]"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {invoice.invoice_number}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Due:{" "}
                    {invoice.due_date
                      ? new Date(
                          `${invoice.due_date}T00:00:00`
                        ).toLocaleDateString("en-NG")
                      : "No due date"}
                  </p>
                  <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                    Outstanding:{" "}
                    {formatNaira(invoice.outstanding_balance)}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount to allocate (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={invoice.outstanding_balance}
                    step="0.01"
                    value={allocations[invoice.id] || ""}
                    onChange={(event) =>
                      handleAllocationChange(invoice.id, event.target.value)
                    }
                    placeholder="Enter allocation"
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg bg-gray-50 p-5 dark:bg-gray-800">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Payment received
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatNaira(paymentAmount)}
            </span>
          </div>

          <div className="mt-3 flex justify-between gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Total allocated
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatNaira(allocatedTotal)}
            </span>
          </div>

          <div className="mt-3 flex justify-between gap-4 border-t border-gray-200 pt-3 dark:border-gray-700">
            <span className="font-semibold text-gray-900 dark:text-white">
              Unallocated amount
            </span>
            <span
              className={`font-bold ${
                remainingToAllocate < 0
                  ? "text-red-600"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {formatNaira(remainingToAllocate)}
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={loading || !businesses.length || !customers.length}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Recording Payment..." : "Record Customer Payment"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/protected/invoices")}
          className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
