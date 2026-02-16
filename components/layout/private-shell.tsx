import type { ReactNode } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";

type PrivateShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function PrivateShell({
  title,
  subtitle,
  children,
  actions,
}: PrivateShellProps) {
  return (
    <div className="panel-root">
      <div className="panel-shell">
        <SidebarNav />
        <main className="panel-main">
          <header className="panel-topbar">
            <div>
              <h1 className="panel-title">{title}</h1>
              <p className="panel-subtitle">{subtitle}</p>
            </div>
            <div className="panel-top-actions">{actions}</div>
          </header>
          <section className="panel-content">{children}</section>
        </main>
      </div>
    </div>
  );
}
