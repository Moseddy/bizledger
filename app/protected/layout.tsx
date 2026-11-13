
import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

const navigation = [
  { name: "Dashboard", href: "/protected" },
  { name: "Transactions", href: "/protected/transactions" },
  { name: "Reports", href: "/protected/reports" },
  { name: "Add Business", href: "/protected/businesses/new" },
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          {/* Logo */}
          <Link
            href="/protected"
            className="text-xl font-bold tracking-tight"
          >
            BizLedger<span className="text-primary">.</span>
          </Link>

          {/* Navigation links */}
          <div className="order-3 flex w-full items-center gap-5 overflow-x-auto pb-1 text-sm font-medium sm:order-none sm:w-auto sm:pb-0">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-muted-foreground transition hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Account controls */}
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </nav>

      {/* Main application content */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">
        {children}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-center text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} BizLedger. All rights reserved.</p>
          <p>Simple business financial management.</p>
        </div>
      </footer>
    </main>
  );
}
