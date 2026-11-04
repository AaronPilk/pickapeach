"use client";

import { openCookieSettings } from "@/lib/consent";

export default function CookieSettingsButton({ className = "link-btn", label = "Cookie settings" }: { className?: string; label?: string }) {
  return (
    <button type="button" className={className} onClick={openCookieSettings}>
      {label}
    </button>
  );
}
