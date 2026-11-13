
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContactManager from "../contacts/contact-manager";

export default async function SuppliersPage() {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const [
    { data: businesses, error: businessError },
    { data: suppliers, error: supplierError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name")
      .order("business_name"),

    supabase
      .from("suppliers")
      .select(
        "id, business_id, supplier_name, phone, email, address, notes, created_at"
      )
      .order("created_at", { ascending: false }),
  ]);

  if (businessError || supplierError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
        Unable to load suppliers. Please refresh the page.
      </div>
    );
  }

  return (
    <ContactManager
      type="supplier"
      businesses={businesses ?? []}
      initialContacts={suppliers ?? []}
    />
  );
}
