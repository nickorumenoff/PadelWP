import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Padel WP — Reserva y juega pádel en Venezuela",
  description:
    "Reserva pistas, organiza partidas y encuentra jugadores de tu nivel en los mejores clubes de pádel de Venezuela.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white font-sans text-ink antialiased">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto min-h-[calc(100vh-64px)] max-w-6xl px-6 py-10">{children}</main>
          <footer className="border-t border-line py-8 text-center text-xs text-muted">
            Padel WP — hecho para la comunidad de pádel en Venezuela.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
