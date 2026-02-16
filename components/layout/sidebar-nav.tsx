"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/usuarios", label: "Usuarios" },
  { href: "/suscripciones", label: "Suscripciones" },
  { href: "/auditoria", label: "Auditoria" },
  { href: "/configuracion", label: "Configuracion" },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <aside className="panel-sidebar">
      <div className="panel-brand">
        <span className="panel-logo" />
        <div>
          <p className="panel-brand-title">ACME INC.</p>
          <p className="panel-brand-subtitle">Admin panel</p>
        </div>
        <button
          type="button"
          className="hamburger-button"
          onClick={toggleMenu}
          aria-label="Abrir menú"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <div className={`panel-nav-container ${isMenuOpen ? "is-open" : ""}`}>
        <nav className="panel-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "panel-nav-link is-active" : "panel-nav-link"}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form action="/auth/logout" method="post" className="panel-logout-form">
          <button type="submit" className="button button-ghost">
            Cerrar sesion
          </button>
        </form>
      </div>

      <div
        className={`menu-overlay ${isMenuOpen ? "is-visible" : ""}`}
        onClick={closeMenu}
        aria-hidden="true"
      />
    </aside>
  );
}
