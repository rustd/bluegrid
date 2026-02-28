import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlueGrid — Kelp Restoration Intelligence",
  description: "AI-powered site selection for kelp restoration. Built for Blue Frontier × OceanTech Hackathon 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
