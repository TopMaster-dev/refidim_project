import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Refidim",
  description:
    "Prospecção e qualificação de leads via WhatsApp e e-mail com IA. Apenas oportunidades prontas chegam ao humano.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
