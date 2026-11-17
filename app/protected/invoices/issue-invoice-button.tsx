
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type IssueInvoiceButtonProps = {
  invoiceId: string;
};

export default function IssueInvoiceButton({
  invoiceId,
}: IssueInvoiceButtonProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleIssueInvoice = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to issue this invoice? Once issued, its financial details should no longer be editable."
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: issueError } = await supabase.rpc(
      "issue_sales_invoice",
      {
        p_invoice_id: invoiceId,
      }
    );

    if (issueError) {
      setError(issueError.message);
      setLoading(false);
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleIssueInvoice}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Issuing Invoice..." : "Issue Invoice"}
      </button>

      {error && (
        <p className="mt-2 max-w-sm text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
