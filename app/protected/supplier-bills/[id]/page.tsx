
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Supplier Bill Details | BizLedger",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default async function SupplierBillDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: bill, error: billError } = await supabase
    .from("supplier_bills")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (billError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load supplier bill: {billError.message}
      </div>
    );
  }

  if (!bill) notFound();

  const [
    { data: supplier },
    { data: business },
    { data: items, error: itemsError },
  ] = await Promise.all([
    supabase
      .from("suppliers")
      .select("supplier_name, phone, email, address")
      .eq("id", bill.supplier_id)
      .eq("business_id", bill.business_id)
      .maybeSingle(),

    supabase
      .from("businesses")
      .select("business_name")
      .eq("id", bill.business_id)
      .maybeSingle(),

    supabase
      .from("supplier_bill_items")
      .select("*")
      .eq("bill_id", bill.id)
      .eq("business_id", bill.business_id)
      .order("created_at", { ascending: true }),
  ]);

  if (itemsError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load bill items: {itemsError.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/protected/supplier-bills"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to Supplier Bills
          </Link>

          <h1 className="mt-3 text-2xl font-bold">
            {bill.bill_number}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Supplier bill details and purchased items.
          </p>
        </div>

        <span className="w-fit rounded-full bg-muted px-3 py-1.5 text-sm capitalize">
          {bill.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-5">
          <h2 className="font-semibold">Supplier Information</h2>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Supplier:</span>{" "}
              {supplier?.supplier_name ?? "Unknown supplier"}
            </p>

            {supplier?.phone && (
              <p>
                <span className="text-muted-foreground">Phone:</span>{" "}
                {supplier.phone}
              </p>
            )}

            {supplier?.email && (
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                {supplier.email}
              </p>
            )}

            {supplier?.address && (
              <p>
                <span className="text-muted-foreground">Address:</span>{" "}
                {supplier.address}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-5">
          <h2 className="font-semibold">Bill Information</h2>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Business:</span>{" "}
              {business?.business_name ?? "Unknown business"}
            </p>

            <p>
              <span className="text-muted-foreground">Bill Number:</span>{" "}
              {bill.bill_number}
            </p>

            <p>
              <span className="text-muted-foreground">Issue Date:</span>{" "}
              {formatDate(bill.issue_date)}
            </p>

            <p>
              <span className="text-muted-foreground">Due Date:</span>{" "}
              {formatDate(bill.due_date)}
            </p>

            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="capitalize">
                {bill.status.replace("_", " ")}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="border-b p-4">
          <h2 className="font-semibold">Bill Items</h2>
        </div>

        {!items?.length ? (
          <p className="p-6 text-sm text-muted-foreground">
            No items were found for this bill.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-4">Description</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4">Unit Price</th>
                  <th className="p-4">Line Total</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-4">{item.description}</td>
                    <td className="p-4 capitalize">
                      {item.item_type.replace("_", " ")}
                    </td>
                    <td className="p-4">
                      {Number(item.quantity).toLocaleString("en-NG")}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {formatNaira(Number(item.unit_price))}
                    </td>
                    <td className="p-4 whitespace-nowrap font-medium">
                      {formatNaira(Number(item.line_total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end border-t p-5">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Bill Total
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatNaira(Number(bill.total_amount))}
            </p>
          </div>
        </div>
      </div>

      {bill.notes && (
        <div className="rounded-xl border p-5">
          <h2 className="font-semibold">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {bill.notes}
          </p>
        </div>
      )}
    </div>
  );
}
