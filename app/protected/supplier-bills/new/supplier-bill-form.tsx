
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

type Product = {
  id: string;
  business_id: string;
  name: string;
  unit_of_measure: string;
  cost_price: number;
  product_type: string;
  track_inventory: boolean;
};

type BillItem = {
  id: string;
  item_type: "inventory" | "non_inventory";
  product_id: string;
  description: string;
  quantity: string;
  unit_price: string;
};

type Props = {
  businesses: Business[];
  suppliers: Supplier[];
  products: Product[];
};

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);

function getLocalDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
}

function createEmptyItem(): BillItem {
  return {
    id: crypto.randomUUID(),
    item_type: "non_inventory",
    product_id: "",
    description: "",
    quantity: "1",
    unit_price: "0",
  };
}

export default function SupplierBillForm({
  businesses,
  suppliers,
  products,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [businessId, setBusinessId] = useState(
    businesses[0]?.id || ""
  );
  const [supplierId, setSupplierId] = useState("");
  const [issueDate, setIssueDate] = useState(getLocalDate());
  const [dueDate, setDueDate] = useState(getLocalDate());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<BillItem[]>([
    createEmptyItem(),
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredSuppliers = useMemo(
    () => suppliers.filter((s) => s.business_id === businessId),
    [suppliers, businessId]
  );

  const filteredProducts = useMemo(
    () => products.filter((p) => p.business_id === businessId),
    [products, businessId]
  );

  const totalAmount = useMemo(
    () =>
      items.reduce((total, item) => {
        return (
          total +
          (Number(item.quantity) || 0) *
            (Number(item.unit_price) || 0)
        );
      }, 0),
    [items]
  );

  function updateItem(
    id: string,
    field: keyof BillItem,
    value: string
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function changeItemType(
    id: string,
    type: "inventory" | "non_inventory"
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              item_type: type,
              product_id: "",
              description: "",
              unit_price: "0",
            }
          : item
      )
    );
  }

  function selectProduct(itemId: string, productId: string) {
    const product = filteredProducts.find(
      (p) => p.id === productId
    );

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              product_id: productId,
              description: product?.name || "",
              unit_price: String(product?.cost_price ?? 0),
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((current) => [...current, createEmptyItem()]);
  }

  function removeItem(id: string) {
    if (items.length === 1) {
      setError("A supplier bill must contain at least one item.");
      return;
    }

    setItems((current) =>
      current.filter((item) => item.id !== id)
    );
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!businessId) {
      setError("Select a business.");
      return;
    }

    if (!supplierId) {
      setError("Select a supplier.");
      return;
    }

    if (!issueDate || !dueDate || dueDate < issueDate) {
      setError("The due date cannot be earlier than the issue date.");
      return;
    }

    if (items.length === 0) {
      setError("Add at least one bill item.");
      return;
    }

    for (const item of items) {
      if (!item.description.trim()) {
        setError("Every item must have a description.");
        return;
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setError("Every item must have a quantity greater than zero.");
        return;
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        setError("Item prices must be valid and cannot be negative.");
        return;
      }

      if (item.item_type === "inventory" && !item.product_id) {
        setError("Select a product for every inventory item.");
        return;
      }
    }

    setLoading(true);

    try {
      const payload = items.map((item) => ({
        item_type: item.item_type,
        product_id:
          item.item_type === "inventory"
            ? item.product_id
            : null,
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      }));

      const { data, error: rpcError } = await supabase.rpc(
        "create_supplier_bill_with_items",
        {
          p_business_id: businessId,
          p_supplier_id: supplierId,
          p_issue_date: issueDate,
          p_due_date: dueDate,
          p_notes: notes.trim() || null,
          p_items: payload,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      const createdBill = Array.isArray(data) ? data[0] : data;

      if (!createdBill?.id) {
        throw new Error(
          "The supplier bill was created, but its reference could not be retrieved."
        );
      }

      setSuccess(
        `Supplier bill ${createdBill.bill_number} created successfully.`
      );

      router.push(`/protected/supplier-bills/${createdBill.id}`);
      router.refresh();
    }  catch (err: unknown) {
  console.error("Supplier bill creation error:", err);

  let message = "Unknown error occurred.";

  if (err && typeof err === "object") {
    const error = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    message = [
      error.message,
      error.details,
      error.hint,
      error.code ? `Error code: ${error.code}` : "",
    ]
      .filter(Boolean)
      .join(" | ");
  } else if (err instanceof Error) {
    message = err.message;
  }

  setError(message);
} finally {
  setLoading(false);
}
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Bill information */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Bill Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Business
            </label>
            <select
              className={inputClass}
              value={businessId}
              onChange={(e) => {
                setBusinessId(e.target.value);
                setSupplierId("");
                setItems([createEmptyItem()]);
              }}
              required
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
            <label className="mb-1 block text-sm font-medium">
              Supplier
            </label>
            <select
              className={inputClass}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              <option value="">Select supplier</option>
              {filteredSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.supplier_name}
                </option>
              ))}
            </select>

            {filteredSuppliers.length === 0 && businessId && (
              <p className="mt-1 text-xs text-amber-600">
                No suppliers are registered for this business yet.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Issue Date
            </label>
            <input
              type="date"
              className={inputClass}
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Due Date
            </label>
            <input
              type="date"
              className={inputClass}
              value={dueDate}
              min={issueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Notes
          </label>
          <textarea
            className={inputClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional information about this bill..."
          />
        </div>
      </section>

      {/* Bill items */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Bill Items
            </h2>
            <p className="text-sm text-gray-500">
              Add inventory products or other charges.
            </p>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-5">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Item {index + 1}
                </h3>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Item Type
                </label>
                <select
                  className={inputClass}
                  value={item.item_type}
                  onChange={(e) =>
                    changeItemType(
                      item.id,
                      e.target.value as BillItem["item_type"]
                    )
                  }
                >
                  <option value="inventory">
                    Inventory Product
                  </option>
                  <option value="non_inventory">
                    Non-inventory Item / Charge
                  </option>
                </select>
              </div>

              {item.item_type === "inventory" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Select Product
                  </label>
                  <select
                    className={inputClass}
                    value={item.product_id}
                    onChange={(e) =>
                      selectProduct(item.id, e.target.value)
                    }
                    required
                  >
                    <option value="">Select inventory product</option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.unit_of_measure})
                      </option>
                    ))}
                  </select>

                  {filteredProducts.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No inventory-tracked products are available for this business.
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm font-medium">
                    Description
                  </label>
                  <input
                    className={inputClass}
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    placeholder="Item description"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    className={inputClass}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", e.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Unit Price (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(item.id, "unit_price", e.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Line Total
                  </label>
                  <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold dark:bg-gray-800">
                    {formatNaira(
                      (Number(item.quantity) || 0) *
                        (Number(item.unit_price) || 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
          <div className="text-right">
            <p className="text-sm text-gray-500">Bill Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNaira(totalAmount)}
            </p>
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/protected/supplier-bills")}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading || businesses.length === 0}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating Bill..." : "Create Supplier Bill"}
        </button>
      </div>
    </form>
  );
}
