import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Sasta Holiday CRM",
  description: "Lead and booking management for travel agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex" style={{ backgroundColor: "var(--background)" }}>
        <AuthGuard>
          <Sidebar />
          <main className="flex-1 min-h-screen overflow-y-auto ml-60">{children}</main>
        </AuthGuard>
      </body>
    </html>
  );
}
