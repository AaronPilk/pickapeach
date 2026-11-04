"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Decoded } from "@/lib/media";

type Crop = { sx: number; sy: number; sw: number; sh: number };

// Full-screen 4:5 cropper. Drag to position (1:1 with the finger), pinch or use the
// slider to zoom. The image always covers the frame, so every photo comes out 4:5.
export default function Cropper({ img, onCancel, onDone }: { img: Decoded; onCancel: () => void; onDone: (crop: Crop) => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ w: 320, h: 400 });
  const [z, setZ] = useState(1);
  const [t, setT] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);

  const base = Math.max(frame.w / img.w, frame.h / img.h);
  const s = base * z;
  const dw = img.w * s;
  const dh = img.h * s;

  const clamp = useCallback(
    (x: number, y: number, scale: number) => {
      const w = img.w * scale;
      const h = img.h * scale;
      return { x: Math.min(0, Math.max(frame.w - w, x)), y: Math.min(0, Math.max(frame.h - h, y)) };
    },
    [frame, img],
  );

  // Size the frame to the screen (4:5), then center the image.
  useLayoutEffect(() => {
    const fit = () => {
      const maxW = Math.min(window.innerWidth - 32, 440);
      const maxH = window.innerHeight - 220;
      const w = Math.min(maxW, (maxH * 4) / 5);
      const f = { w: Math.round(w), h: Math.round((w * 5) / 4) };
      setFrame(f);
      const b = Math.max(f.w / img.w, f.h / img.h);
      setZ(1);
      setT({ x: (f.w - img.w * b) / 2, y: (f.h - img.h * b) / 2 });
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [img]);

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const zoomTo = (nz: number) => {
    nz = Math.min(4, Math.max(1, nz));
    const ns = base * nz;
    // Keep the point under the frame's center fixed while zooming.
    const cx = (frame.w / 2 - t.x) / s;
    const cy = (frame.h / 2 - t.y) / s;
    setT(clamp(frame.w / 2 - cx * ns, frame.h / 2 - cy * ns, ns));
    setZ(nz);
  };

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      zoomTo(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
      return;
    }
    if (pointers.current.size === 1) setT((p) => clamp(p.x + (cur.x - prev.x), p.y + (cur.y - prev.y), s));
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => zoomTo(z * (e.deltaY < 0 ? 1.06 : 1 / 1.06));

  const done = () => onDone({ sx: -t.x / s, sy: -t.y / s, sw: frame.w / s, sh: frame.h / s });

  const preview = img.src instanceof HTMLImageElement ? img.src.src : null;

  return createPortal(
    <div className="cropper" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="cropper-top">
        <button className="btn btn-plain" onClick={onCancel} style={{ color: "#fff" }}>Cancel</button>
        <b>Move and scale</b>
        <button className="btn btn-plain" onClick={done} style={{ fontWeight: 700 }}>Use photo</button>
      </div>
      <div
        ref={stage}
        className="cropper-frame"
        style={{ width: frame.w, height: frame.h }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
      >
        {preview ? (
          <img src={preview} alt="" draggable={false} style={{ width: dw, height: dh, transform: `translate3d(${t.x}px, ${t.y}px, 0)` }} />
        ) : (
          <BitmapCanvas img={img} w={dw} h={dh} x={t.x} y={t.y} />
        )}
        <div className="cropper-grid" aria-hidden />
      </div>
      <div className="cropper-bottom">
        <span className="t-foot" style={{ color: "rgba(255,255,255,0.7)" }}>Photos show at 4:5, like this frame</span>
        <input type="range" min={1} max={4} step={0.01} value={z} onChange={(e) => zoomTo(Number(e.target.value))} aria-label="Zoom" />
      </div>
    </div>,
    document.body,
  );
}

// ImageBitmaps can't go in an <img>, so draw once to a canvas and move it with transforms.
function BitmapCanvas({ img, w, h, x, y }: { img: Decoded; w: number; h: number; x: number; y: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const scale = Math.min(1, 2400 / Math.max(img.w, img.h));
    c.width = Math.round(img.w * scale);
    c.height = Math.round(img.h * scale);
    c.getContext("2d")!.drawImage(img.src, 0, 0, c.width, c.height);
  }, [img]);
  return <canvas ref={ref} style={{ width: w, height: h, transform: `translate3d(${x}px, ${y}px, 0)` }} />;
}
