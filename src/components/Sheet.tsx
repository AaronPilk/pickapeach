"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Close } from "./Icons";

// Bottom sheet on phones (drag down to dismiss, momentum-aware), centered card on desktop.
export default function Sheet({
  open,
  onClose,
  title,
  label,
  children,
  footer,
  hideHead,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  label: string;
  children: ReactNode;
  footer?: ReactNode;
  hideHead?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const drag = useRef<{ y0: number; y: number; t: number; v: number; active: boolean; pid: number } | null>(null);

  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement as HTMLElement;
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 480);
    lastFocus.current?.focus?.();
    return () => clearTimeout(t);
  }, [open]);

  // Lock page scroll while open.
  useEffect(() => {
    if (!mounted) return;
    const y = window.scrollY;
    const s = document.body.style;
    const prev = { position: s.position, top: s.top, width: s.width };
    s.position = "fixed";
    s.top = `-${y}px`;
    s.width = "100%";
    return () => {
      s.position = prev.position;
      s.top = prev.top;
      s.width = prev.width;
      window.scrollTo(0, y);
    };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const setY = (y: number) => {
    if (panel.current) panel.current.style.transform = y ? `translateY(${y}px)` : "";
  };

  const onDown = useCallback((e: React.PointerEvent) => {
    if (window.matchMedia("(min-width: 700px)").matches) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const fromBody = body.current?.contains(e.target as Node);
    if (fromBody && (body.current!.scrollTop > 0 || (e.target as HTMLElement).closest("input,button,a,select,textarea,label"))) return;
    drag.current = { y0: e.clientY, y: 0, t: performance.now(), v: 0, active: false, pid: e.pointerId };
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.pid !== e.pointerId) return;
    const dy = e.clientY - d.y0;
    if (!d.active) {
      if (Math.abs(dy) < 8) return;
      if (dy < 0) {
        drag.current = null;
        return;
      }
      d.active = true;
      panel.current?.setAttribute("data-dragging", "true");
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    const y = dy > 0 ? dy : -rubber(-dy, 300);
    d.v = (y - d.y) / Math.max(1, now - d.t);
    d.y = y;
    d.t = now;
    setY(y);
  }, []);

  const onUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    panel.current?.removeAttribute("data-dragging");
    const h = panel.current?.offsetHeight || 500;
    // Project where the flick is heading; dismiss if it lands past a third of the sheet.
    const projected = d.y + d.v * 180;
    if (projected > h * 0.33 || d.v > 0.6) {
      setY(0);
      onClose();
    } else {
      setY(0);
    }
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(
    <>
      <div className="scrim" data-open={shown} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className="sheet glass-thick"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-open={shown}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div className="sheet-handle" aria-hidden>
          <i />
        </div>
        {!hideHead && (
          <div className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn btn-glass" onClick={onClose} aria-label="Close">
              <Close />
            </button>
          </div>
        )}
        <div className="sheet-body" ref={body}>
          {children}
        </div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </>,
    document.body,
  );
}

function rubber(overshoot: number, dim: number, c = 0.55) {
  return (overshoot * dim * c) / (dim + c * overshoot);
}
