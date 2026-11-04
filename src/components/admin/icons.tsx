// Small line icons for the dashboard (1.8px stroke, 24px grid).
type P = React.SVGProps<SVGSVGElement>;
const b = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IHome = (p: P) => <svg {...b} {...p}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>;
export const ITraffic = (p: P) => <svg {...b} {...p}><path d="M4 18h16" /><path d="M6 15l4-5 3.5 3L18 7" /><path d="M15 7h3v3" /></svg>;
export const IStar = (p: P) => <svg {...b} {...p}><path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" /></svg>;
export const IInbox = (p: P) => <svg {...b} {...p}><path d="M4 13.5 6.5 5h11l2.5 8.5V19H4z" /><path d="M4 13.5h4.5l1 2h5l1-2H20" /></svg>;
export const ICheck = (p: P) => <svg {...b} {...p}><rect x="4" y="4" width="16" height="16" rx="5" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>;
export const IFlag = (p: P) => <svg {...b} {...p}><path d="M6 21V4" /><path d="M6 4h10l-2 4 2 4H6" /></svg>;
export const IPulse = (p: P) => <svg {...b} {...p}><path d="M3 12h4l2.5-6 4 12 2.5-6H21" /></svg>;
export const IUser = (p: P) => <svg {...b} {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></svg>;
export const IUsers = (p: P) => <svg {...b} {...p}><circle cx="9" cy="8.5" r="3.5" /><path d="M2.8 19.5c.7-3.3 3.2-5 6.2-5s5.5 1.7 6.2 5" /><path d="M15.5 5.2a3.4 3.4 0 0 1 0 6.6M18 14.8c1.7.6 2.9 2.2 3.3 4.7" /></svg>;
export const ITap = (p: P) => <svg {...b} {...p}><path d="M9 11V6a2 2 0 0 1 4 0v5" /><path d="M13 9.5a2 2 0 0 1 4 0V13" /><path d="M17 11.5a2 2 0 0 1 3 1.7V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.7-2.3L5 15.4a1.8 1.8 0 0 1 2.7-2.4L9 14.3" /></svg>;
export const IUnlock = (p: P) => <svg {...b} {...p}><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 7.6-1.7" /></svg>;
export const IShield = (p: P) => <svg {...b} {...p}><path d="M12 3.5 19 6v5.5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>;
export const ISpark = (p: P) => <svg {...b} {...p}><path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" /></svg>;
export const IEye = (p: P) => <svg {...b} {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>;
export const IRefresh = (p: P) => <svg {...b} {...p}><path d="M20 11a8 8 0 0 0-14.3-4.7L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.3 4.7L20 16" /><path d="M20 20v-4h-4" /></svg>;
export const IDownload = (p: P) => <svg {...b} {...p}><path d="M12 4v11" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5" /><path d="M5 20h14" /></svg>;
export const IBell = (p: P) => <svg {...b} {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
export const IArrowUp = (p: P) => <svg {...b} strokeWidth={2.2} {...p}><path d="M7 17 17 7M9 7h8v8" /></svg>;
export const IArrowDown = (p: P) => <svg {...b} strokeWidth={2.2} {...p}><path d="M7 7l10 10M17 9v8H9" /></svg>;
export const IInfo = (p: P) => <svg {...b} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></svg>;
