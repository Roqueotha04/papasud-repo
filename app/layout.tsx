import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "./components/SiteNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raíz Tech · Gestión agronómica",
  description:
    "Plataforma de gestión para empresas agronómicas, especializada en el cultivo de papa: stock, trazabilidad, órdenes de trabajo y carga en el campo sin conexión.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg font-sans text-ink">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
          <SiteNav />
          <div className="flex flex-1 flex-col pt-6">{children}</div>
        </div>
      </body>
    </html>
  );
}
