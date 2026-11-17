
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Business = {
  id: string;
  business_name: string;
};

type Supplier = {
  id: string;
  business_id: string;
  supplier_name: string;
};

type Bill = {
  id: string;
  business_id: string;
  supplier_id: string;
  bill_number: string;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  status: string;
  outstanding: number;
};

type Props = {
  businesses: Business[];
  suppliers: Supplier[];
  outstandingBills: Bill[];
};

type Allocation = {
  bill_id: string;
  amount: string;
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
  }).format(amount);

export default function SupplierPaymentForm({
  businesses,
  suppliers,
  outstandingBills,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [businessId, setBusinessId] = useState(
    businesses.length === 1 ? businesses[0].id : ""
  );
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(getLocalDate());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const availableSuppliers = useMemo(
    () => suppliers.filter((item) => item.business_id === businessId),
    [suppliers, businessId]
  );

  const availableBills = useMemo(
    () =>
      outstandingBills.filter(
        (bill) =>
          bill.business_id === businessId &&
          bill.supplier_id === supplierId
      ),
    [outstandingBills, businessId, supplierId]
  );

  const totalAllocated = allocations.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  const paymentAmount = Number(amount) || 0;

  const updateAllocation = (billId: string, value: string) => {
    setAllocations((current) => {
      const existing = current.find((item) => item.bill_id === billId);

      if (existing) {
        return current.map((item) =>
          item.bill_id === billId
            ? { ...item, amount: value }
            : item
        );
      }

      return [...current, { bill_id: billId, amount: value }];
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!businessId || !supplierId) {
      setErrorMessage("Please select a business and supplier.");
      return;
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setErrorMessage("Enter a valid payment amount.");
      return;
    }

    if (!paymentDate) {
      setErrorMessage("Please select a payment date.");
      return;
    }

    const validAllocations = allocations
      .filter((item) => Number(item.amount) > 0)
      .map((item) => ({
        bill_id: item.bill_id,
        amount: Number(item.amount),
      }));

    if (validAllocations.length === 0) {
      setErrorMessage("Allocate this payment to at least one bill.");
      return;
    }

    if (totalAllocated > paymentAmount + 0.001) {
      setErrorMessage("Allocated amount cannot exceed payment amount.");
      return;
    }

    for (const allocation of validAllocations) {
      const bill = availableBills.find(
        (item) => item.id === allocation.bill_id
      );

      if (!bill || allocation.amount > bill.outstanding + 0.001) {
        setErrorMessage(
          "An allocation exceeds the outstanding balance of its bill."
        );
        return;
      }
    }

    setSaving(true);

    const { error } = await supabase.rpc("record_supplier_payment", {
      p_business_id: businessId,
      p_supplier_id: supplierId,
      p_amount: paymentAmount,
      p_payment_method: paymentMethod,
      p_payment_date: paymentDate,
      p_reference: reference.trim() || null,
      p_notes: notes.trim() || null,
      p_allocations: validAllocations,
    });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("Supplier payment recorded successfully.");

    router.push("/protected/supplier-payments");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5 rounded-xl border bg-card p-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">Business *</label>
          <select
            required
            value={businessId}
            onChange={(event) => {
              setBusinessId(event.target.value);
              setSupplierId("");
              setAllocations([]);
            }}
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
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
          <label className="mb-2 block text-sm font-medium">Supplier *</label>
          <select
            required
            value={supplierId}
            onChange={(event) => {
              setSupplierId(event.target.value);
              setAllocations([]);
            }}
            disabled={!businessId}
            className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">Select supplier</option>
            {availableSuppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.supplier_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Payment Details</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Payment Amount (₦) *
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="pos">POS</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Payment Date *
            </label>
            <input
              required
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Reference
            </label>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Transfer reference"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Additional payment information"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Allocate Payment to Bills</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the amount of this payment to apply to each outstanding bill.
        </p>

        {!supplierId ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Select a supplier to view their outstanding bills.
          </p>
        ) : availableBills.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            This supplier has no outstanding bills.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {availableBills.map((bill) => {
              const allocation = allocations.find(
                (item) => item.bill_id === bill.id
              );

              return (
                <div
                  key={bill.id}
                  className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3 sm:items-center"
                >
                  <div>
                    <p className="font-medium">{bill.bill_number}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {bill.due_date || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Outstanding
                    </p>
                    <p className="font-semibold">
                      {formatNaira(bill.outstanding)}
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Amount to allocate
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={bill.outstanding}
                      step="0.01"
                      value={allocation?.amount ?? ""}
                      onChange={(event) =>
                        updateAllocation(bill.id, event.target.value)
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment amount</span>
            <strong>{formatNaira(paymentAmount)}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Allocated amount</span>
            <strong>{formatNaira(totalAllocated)}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unallocated amount</span>
            <strong>
              {formatNaira(Math.max(0, paymentAmount - totalAllocated))}
            </strong>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Recording Payment..." : "Record Supplier Payment"}
        </button>
      </div>
    </form>
  );
}
