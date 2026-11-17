
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SupplierBillForm from "./supplier-bill-form";

export const metadata = {
  title: "Create Supplier Bill | BizLedger",
};

export default async function NewSupplierBillPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    { data: businesses, error: businessError },
    { data: suppliers, error: supplierError },
    { data: products, error: productError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name")
      .order("created_at", { ascending: false }),

    supabase
      .from("suppliers")
      .select("id, business_id, supplier_name")
      .order("supplier_name", { ascending: true }),

    supabase
      .from("products")
      .select(
        "id, business_id, name, unit_of_measure, cost_price, product_type, track_inventory"
      )
      .eq("product_type", "goods")
      .eq("track_inventory", true)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  const error = businessError || supplierError || productError;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/protected/supplier-bills"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to supplier bills
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
          Create Supplier Bill
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Record purchases and other charges from your suppliers.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load the information needed to create a supplier bill:
          {` ${error.message}`}
        </div>
      ) : businesses && businesses.length > 0 ? (
        <SupplierBillForm
          businesses={businesses}
          suppliers={suppliers || []}
          products={products || []}
        />
      ) : (
        <div className="rounded-xl border bg-white p-6 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-300">
            You need to register a business before creating supplier bills.
          </p>

          <Link
            href="/protected/businesses/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Register Business
          </Link>
        </div>
      )}
    </div>
  );
}
