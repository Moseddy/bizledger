
"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
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

type InvoiceItem = {
  description: string;
  quantity: string;
  unit_price: string;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);

function getLocalDate() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function InvoiceForm({
  businesses,
  customers,
}: {
  businesses: Business[];
  customers: Customer[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    business_id: businesses[0]?.id ?? "",
    customer_id: "",
    invoice_number: "",
    issue_date: getLocalDate(),
    due_date: "",
    notes: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      description: "",
      quantity: "1",
      unit_price: "",
    },
  ]);

  const availableCustomers = customers.filter(
    (customer) => customer.business_id === formData.business_id
  );

  const invoiceTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(unitPrice) ||
        quantity <= 0 ||
        unitPrice < 0
      ) {
        return total;
      }

      return total + quantity * unitPrice;
    }, 0);
  }, [items]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "business_id" ? { customer_id: "" } : {}),
    }));
  }

  function handleItemChange(
    index: number,
    field: keyof InvoiceItem,
    value: string
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        description: "",
        quantity: "1",
        unit_price: "",
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.business_id) {
      setError("Please select a business.");
      return;
    }

    if (!formData.customer_id) {
      setError("Please select a customer.");
      return;
    }

    if (!formData.invoice_number.trim()) {
      setError("Please enter an invoice number.");
      return;
    }

    if (!formData.issue_date) {
      setError("Please select an issue date.");
      return;
    }

    if (
      formData.due_date &&
      formData.due_date < formData.issue_date
    ) {
      setError("The due date cannot be earlier than the issue date.");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one invoice item.");
      return;
    }

    const preparedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);

      return {
        description: item.description.trim(),
        quantity,
        unit_price: unitPrice,
      };
    });

    const invalidItem = preparedItems.some(
      (item) =>
        !item.description ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.unit_price) ||
        item.unit_price <= 0
    );

    if (invalidItem) {
      setError(
        "Every item must have a description, a quantity greater than zero, and a unit price greater than zero."
      );
      return;
    }

    const total = Math.round(
      preparedItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      ) * 100
    ) / 100;

    if (!Number.isFinite(total) || total <= 0) {
      setError("The invoice total must be greater than zero.");
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

      // Create the invoice header as a draft.
      const { data: invoice, error: invoiceError } = await supabase
        .from("sales_invoices")
        .insert({
          business_id: formData.business_id,
          customer_id: formData.customer_id,
          invoice_number: formData.invoice_number.trim(),
          issue_date: formData.issue_date,
          due_date: formData.due_date || null,
          total_amount: total,
          status: "draft",
          notes: formData.notes.trim() || null,
        })
        .select("id")
        .single();

      if (invoiceError) {
        throw invoiceError;
      }

      // Save all invoice items.
      const invoiceItems = preparedItems.map((item) => ({
        business_id: formData.business_id,
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from("sales_invoice_items")
        .insert(invoiceItems);

      if (itemsError) {
        throw new Error(
          `The invoice header was created, but its items could not be saved. Invoice ID: ${invoice.id}. Details: ${itemsError.message}`
        );
      }

      setSuccess("Invoice draft created successfully.");

      router.push("/protected/invoices");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create invoice. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
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

      <section className="space-y-5">
        <h2 className="border-b pb-3 text-lg font-semibold text-gray-900">
          Invoice Information
        </h2>

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

        <div>
          <label
            htmlFor="customer_id"
            className="font-medium text-gray-700"
          >
            Customer *
          </label>

          <select
            id="customer_id"
            name="customer_id"
            value={formData.customer_id}
            onChange={handleChange}
            required
            className={inputClass}
          >
            <option value="">Select customer</option>

            {availableCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customer_name}
              </option>
            ))}
          </select>

          {availableCustomers.length === 0 && (
            <p className="mt-2 text-sm text-amber-700">
              No customers are registered for this business. Add a customer
              before creating an invoice.
            </p>
          )}

          <a
            href="/protected/customers"
            className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            Manage customers
          </a>
        </div>

        <div>
          <label
            htmlFor="invoice_number"
            className="font-medium text-gray-700"
          >
            Invoice Number *
          </label>

          <input
            id="invoice_number"
            name="invoice_number"
            type="text"
            required
            maxLength={100}
            value={formData.invoice_number}
            onChange={handleChange}
            placeholder="e.g. INV-0001"
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="issue_date"
              className="font-medium text-gray-700"
            >
              Issue Date *
            </label>

            <input
              id="issue_date"
              name="issue_date"
              type="date"
              required
              value={formData.issue_date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="due_date"
              className="font-medium text-gray-700"
            >
              Due Date
            </label>

            <input
              id="due_date"
              name="due_date"
              type="date"
              min={formData.issue_date}
              value={formData.due_date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="font-medium text-gray-700"
          >
            Notes
          </label>

          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Payment instructions or additional information"
            className={inputClass}
          />
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Invoice Items
          </h2>

          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            + Add Item
          </button>
        </div>

        {items.map((item, index) => {
          const lineTotal =
            Number(item.quantity) * Number(item.unit_price);

          return (
            <div
              key={index}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  Item {index + 1}
                </h3>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor={`description-${index}`}
                  className="font-medium text-gray-700"
                >
                  Description *
                </label>

                <input
                  id={`description-${index}`}
                  type="text"
                  required
                  maxLength={500}
                  value={item.description}
                  onChange={(e) =>
                    handleItemChange(index, "description", e.target.value)
                  }
                  placeholder="e.g. Website design service"
                  className={inputClass}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor={`quantity-${index}`}
                    className="font-medium text-gray-700"
                  >
                    Quantity *
                  </label>

                  <input
                    id={`quantity-${index}`}
                    type="number"
                    required
                    min="0.001"
                    step="0.001"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor={`unit-price-${index}`}
                    className="font-medium text-gray-700"
                  >
                    Unit Price (₦) *
                  </label>

                  <input
                    id={`unit-price-${index}`}
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      handleItemChange(index, "unit_price", e.target.value)
                    }
                    placeholder="e.g. 25000"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="font-medium text-gray-700">
                    Line Total
                  </label>

                  <div className="mt-2 flex min-h-[50px] items-center rounded-lg bg-gray-100 px-4 font-semibold text-gray-900">
                    {formatNaira(
                      Number.isFinite(lineTotal) ? lineTotal : 0
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="rounded-lg bg-gray-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-lg font-semibold text-gray-700">
              Invoice Total
            </span>

            <span className="text-2xl font-bold text-gray-900">
              {formatNaira(invoiceTotal)}
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/protected/invoices")}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading || availableCustomers.length === 0}
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating Invoice..." : "Save Invoice as Draft"}
        </button>
      </div>
    </form>
  );
}
