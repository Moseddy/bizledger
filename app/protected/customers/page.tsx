
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContactManager from "../contacts/contact-manager";

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.getClaims();

  if (authError || !authData?.claims) {
    redirect("/auth/login");
  }

  const [
    { data: businesses, error: businessError },
    { data: customers, error: customerError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, business_name")
      .order("business_name"),

    supabase
      .from("customers")
      .select(
        "id, business_id, customer_name, phone, email, address, notes, created_at"
      )
      .order("created_at", { ascending: false }),
  ]);

  if (businessError || customerError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
        Unable to load customers. Please refresh the page.
      </div>
    );
  }

  return (
    <ContactManager
      type="customer"
      businesses={businesses ?? []}
      initialContacts={customers ?? []}
    />
  );
}
