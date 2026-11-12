
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BusinessForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "",
    phone: "",
    email: "",
    address: "",
  });

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const supabase = createClient();

      // Verify the logged-in user.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in before registering a business.");
      }

      // Save the business.
      const { error: insertError } = await supabase
        .from("businesses")
        .insert({
          business_name: formData.business_name.trim(),
          business_type: formData.business_type || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess("Your business has been registered successfully!");

      setFormData({
        business_name: "",
        business_type: "",
        phone: "",
        email: "",
        address: "",
      });

      router.refresh();

      setTimeout(() => {
        router.push("/protected");
      }, 1200);

    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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

      <div>
        <label htmlFor="business_name" className="font-medium text-gray-700">
          Business name *
        </label>

        <input
          id="business_name"
          name="business_name"
          type="text"
          required
          maxLength={150}
          value={formData.business_name}
          onChange={handleChange}
          placeholder="e.g. Edwin's Ventures"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="business_type" className="font-medium text-gray-700">
          Business type
        </label>

        <select
          id="business_type"
          name="business_type"
          value={formData.business_type}
          onChange={handleChange}
          className={inputClass}
        >
          <option value="">Select business type</option>
          <option value="Retail">Retail</option>
          <option value="Wholesale">Wholesale</option>
          <option value="Food and Restaurant">Food and Restaurant</option>
          <option value="Fashion">Fashion</option>
          <option value="Technology">Technology</option>
          <option value="Professional Services">Professional Services</option>
          <option value="Manufacturing">Manufacturing</option>
          <option value="Agriculture">Agriculture</option>
          <option value="Transportation">Transportation</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="phone" className="font-medium text-gray-700">
          Business phone
        </label>

        <input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="e.g. 08012345678"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="email" className="font-medium text-gray-700">
          Business email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="business@example.com"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="address" className="font-medium text-gray-700">
          Business address
        </label>

        <textarea
          id="address"
          name="address"
          rows={3}
          value={formData.address}
          onChange={handleChange}
          placeholder="Enter your business address"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Registering business..." : "Register Business"}
      </button>
    </form>
  );
}
