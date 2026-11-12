
import BusinessForm from "./business-form";

export const metadata = {
  title: "Register Business | BizLedger",
};

export default function NewBusinessPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">
            BIZLEDGER
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Register your business
          </h1>

          <p className="mt-3 text-gray-600">
            Tell us about your business to get started with managing
            your finances.
          </p>
        </div>

        <BusinessForm />
      </div>
    </main>
  );
}
