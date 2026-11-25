"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Bottom sheet on phones, centred dialog from `sm` up. The body scrolls; the optional footer
 * stays pinned above the home indicator so primary actions are always reachable.
 */
export default function Sheet({
  label,
  onClose,
  footer,
  className = "sm:max-w-md",
  children,
}: {
  label: string;
  onClose: () => void;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // iOS Safari only honours scroll lock when it's on <html> as well as <body>.
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      [html.style.overflow, document.body.style.overflow] = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`sheet-in flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-panel shadow-2xl sm:max-h-[88dvh] sm:rounded-2xl ${className}`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />
        <div className={`overflow-y-auto overscroll-contain px-5 pt-3 sm:pt-5 ${footer ? "pb-4" : "pb-safe-5"}`}>
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-line px-5 pt-3 pb-safe-3">{footer}</div>}
      </div>
    </div>
  );
}
