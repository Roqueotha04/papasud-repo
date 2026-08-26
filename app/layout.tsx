import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import { getUsuarioActual } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Papasud Tech · Gestión agronómica",
  description:
    "Sistema de gestión de Papasud: stock, trazabilidad, órdenes de trabajo e indicadores de la operación de papa.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const usuario = await getUsuarioActual();

  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg font-sans text-ink">
        <div className="flex min-h-dvh flex-col md:flex-row">
          <Sidebar usuario={usuario} />
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
