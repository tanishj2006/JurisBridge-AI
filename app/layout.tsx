import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "JurisBridge AI",
  description: "AI-Powered Legal Document Analysis & Comparison",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden max-w-full">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen overflow-x-hidden max-w-full">
        {children}
      </body>
    </html>
  );
}
