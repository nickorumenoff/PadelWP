"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers";

const baseLinks = [
  { href: "/", label: "Explorar" },
  { href: "/matches", label: "Partidas" },
  { href: "/tournaments", label: "Torneos" },
  { href: "/sponsors", label: "Patrocinadores" },
  { href: "/club-admin", label: "Mi club" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  const links =
    user?.role === "PLATFORM_ADMIN" ? [...baseLinks, { href: "/admin", label: "Admin" }] : baseLinks;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white text-sm font-bold">
            P
          </span>
          <span className="text-lg font-semibold text-brand-blue">
            Padel<span className="text-brand-green">WP</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                pathname === l.href ? "bg-brand-blue-50 text-brand-blue" : "text-muted hover:text-brand-blue"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              <Link href="/profile" className="text-sm font-medium text-ink hover:text-brand-blue">
                {user.name.split(" ")[0]}
                <span className="ml-2 badge-green">Nivel {user.level.toFixed(2)}</span>
              </Link>
              <button onClick={logout} className="btn-outline !px-4 !py-1.5 text-xs">
                Salir
              </button>
            </>
          ) : !loading ? (
            <>
              <Link href="/login" className="btn-outline !px-4 !py-1.5 text-xs">
                Iniciar sesión
              </Link>
              <Link href="/register" className="btn-primary !px-4 !py-1.5 text-xs">
                Crear cuenta
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
