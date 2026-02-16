import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  children: ReactNode;
  closeHref: string;
};

export function Modal({ title, children, closeHref }: ModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card">
        <header className="modal-header">
          <h2>{title}</h2>
          <a href={closeHref} className="button button-ghost">
            Cerrar
          </a>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
