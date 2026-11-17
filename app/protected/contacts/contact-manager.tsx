
"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";

type ContactType = "customer" | "supplier";

type Business = {
  id: string;
  business_name: string;
};

type Contact = {
  id: string;
  business_id: string;
  customer_name?: string;
  supplier_name?: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
};

type Props = {
  type: ContactType;
  businesses: Business[];
  initialContacts: Contact[];
};

type ContactForm = {
  business_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const emptyForm: ContactForm = {
  business_id: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function ContactManager({
  type,
  businesses,
  initialContacts,
}: Props) {
  const supabase = createClient();

  const [contacts, setContacts] = useState(initialContacts);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isCustomer = type === "customer";
  const title = isCustomer ? "Customers" : "Suppliers";
  const singular = isCustomer ? "Customer" : "Supplier";
  const nameField = isCustomer ? "customer_name" : "supplier_name";
  const table = isCustomer ? "customers" : "suppliers";

  const getName = useCallback(
  (contact: Contact) =>
    (isCustomer ? contact.customer_name : contact.supplier_name) ?? "",
  [isCustomer]
);


  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesBusiness =
        businessFilter === "all" ||
        contact.business_id === businessFilter;

      const matchesSearch =
        !term ||
        getName(contact).toLowerCase().includes(term) ||
        (contact.phone ?? "").toLowerCase().includes(term) ||
        (contact.email ?? "").toLowerCase().includes(term);

      return matchesBusiness && matchesSearch;
    });
  }, [contacts, search, getName, businessFilter]);

  const updateForm = (field: keyof ContactForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openNewForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      business_id: businesses.length === 1 ? businesses[0].id : "",
    });
    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  };

  const openEditForm = (contact: Contact) => {
    setEditingId(contact.id);
    setForm({
      business_id: contact.business_id,
      name: getName(contact),
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      address: contact.address ?? "",
      notes: contact.notes ?? "",
    });
    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!form.business_id) {
      setErrorMessage("Please select a business.");
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage(`${singular} name is required.`);
      return;
    }

    setSaving(true);

    const payload = {
      business_id: form.business_id,
      [nameField]: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }

      setContacts((current) =>
        current.map((contact) =>
          contact.id === editingId ? (data as Contact) : contact
        )
      );

      setMessage(`${singular} updated successfully.`);
    } else {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }

      setContacts((current) => [data as Contact, ...current]);
      setMessage(`${singular} added successfully.`);
    }

    setSaving(false);
    closeForm();
  };

  const handleDelete = async (contact: Contact) => {
    const confirmed = window.confirm(
      `Delete ${getName(contact)}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", contact.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setContacts((current) =>
      current.filter((item) => item.id !== contact.id)
    );

    setMessage(`${singular} deleted successfully.`);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the {isCustomer ? "people who buy from" : "businesses you buy from"}{" "}
            your business.
          </p>
        </div>

        <button
          onClick={openNewForm}
          disabled={businesses.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={18} />
          Add {singular}
        </button>
      </div>

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

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <h2 className="font-semibold">Register a business first</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need a business before adding {title.toLowerCase()}.
          </p>
          <a
            href="/protected/businesses/new"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Add a business
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-3 text-sm"
              />
            </div>

            <select
              value={businessFilter}
              onChange={(event) => setBusinessFilter(event.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">All Businesses</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.business_name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-semibold">All {title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filteredContacts.length}{" "}
                  {filteredContacts.length === 1
                    ? singular.toLowerCase()
                    : title.toLowerCase()}
                </p>
              </div>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-medium">No {title.toLowerCase()} found.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a {singular.toLowerCase()} or change your search filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Business</th>
                      <th className="px-5 py-3 font-medium">Phone</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-muted/30">
                        <td className="px-5 py-4 font-medium">
                          {getName(contact)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {businesses.find(
                            (business) => business.id === contact.business_id
                          )?.business_name ?? "Unknown business"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {contact.phone || "—"}
                        </td>
                        <td className="px-5 py-4">
                          {contact.email || "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditForm(contact)}
                              title={`Edit ${singular.toLowerCase()}`}
                              className="rounded-md border p-2 hover:bg-accent"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(contact)}
                              title={`Delete ${singular.toLowerCase()}`}
                              className="rounded-md border p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-xl rounded-xl border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId ? `Edit ${singular}` : `Add ${singular}`}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the contact information below.
                </p>
              </div>
              <button
                onClick={closeForm}
                className="rounded-md p-2 hover:bg-accent"
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Business *
                </label>
                <select
                  required
                  value={form.business_id}
                  onChange={(event) =>
                    updateForm("business_id", event.target.value)
                  }
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
                <label className="mb-2 block text-sm font-medium">
                  {singular} Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder={`Enter ${singular.toLowerCase()} name`}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm("phone", event.target.value)
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateForm("email", event.target.value)
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(event) =>
                    updateForm("address", event.target.value)
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                  placeholder="Contact address"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    updateForm("notes", event.target.value)
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm"
                  placeholder="Additional information"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : `Add ${singular}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
