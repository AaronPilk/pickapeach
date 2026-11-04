"use client";

// Client-side media prep for the Creator Studio.
// Photos are cropped to 4:5 and re-encoded at 1080x1350 (this also strips EXIF/GPS data).
// Clips are checked (type, size, length, codec) and get a 9:16 poster frame.

export const PHOTO_W = 1080;
export const PHOTO_H = 1350;
export const POSTER_W = 720;
export const POSTER_H = 1280;
export const CLIP_MAX_BYTES = 50 * 1024 * 1024;
export const CLIP_MAX_SECONDS = 60;

export type Decoded = { src: CanvasImageSource; w: number; h: number; close: () => void };

export async function decodeImage(file: File): Promise<Decoded> {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif|gif|avif)$/i.test(file.name)) throw new Error("That file isn't an image.");
  if (file.size > 40 * 1024 * 1024) throw new Error("That image is over 40 MB. Pick a smaller one.");
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("Your browser can't open this image. Try a JPG or PNG.");
    }
    return { src: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  }
}

// Crop in source-pixel space → JPEG blob at the target size.
export async function renderCrop(img: Decoded, crop: { sx: number; sy: number; sw: number; sh: number }, outW = PHOTO_W, outH = PHOTO_H, quality = 0.86): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = outW;
  c.height = outH;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(img.src, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, outW, outH);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't process that photo."))), "image/jpeg", quality));
}

export type ClipInfo = { duration: number; width: number; height: number; poster: Blob; vertical: boolean };

export async function inspectClip(file: File): Promise<ClipInfo> {
  if (!/^video\//.test(file.type) && !/\.(mp4|mov|m4v|webm)$/i.test(file.name)) throw new Error("That file isn't a video.");
  if (file.size > CLIP_MAX_BYTES) throw new Error("Clips can be up to 50 MB. Trim it or export at a lower quality.");
  if (await looksHevcOnly(file)) {
    throw new Error("This video is HEVC, which won't play on Android or Chrome. Export it as H.264 MP4 (on iPhone: Settings → Camera → Formats → Most Compatible).");
  }
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  try {
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error("timeout")), 15000);
      v.onloadedmetadata = () => {
        clearTimeout(t);
        res();
      };
      v.onerror = () => {
        clearTimeout(t);
        rej(new Error("decode"));
      };
    });
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Your browser can't read this video. Export it as an MP4 (H.264) and try again.");
  }
  const duration = v.duration;
  if (!isFinite(duration) || duration <= 0) {
    URL.revokeObjectURL(url);
    throw new Error("Couldn't read the length of this video.");
  }
  if (duration > CLIP_MAX_SECONDS + 0.5) {
    URL.revokeObjectURL(url);
    throw new Error(`Clips can be up to ${CLIP_MAX_SECONDS} seconds. This one is ${Math.round(duration)}s.`);
  }
  const width = v.videoWidth;
  const height = v.videoHeight;
  // Grab a frame a little way in for the poster (avoids black first frames).
  await new Promise<void>((res) => {
    v.onseeked = () => res();
    v.currentTime = Math.min(1, duration / 3);
    setTimeout(res, 4000);
  });
  const c = document.createElement("canvas");
  c.width = POSTER_W;
  c.height = POSTER_H;
  const ctx = c.getContext("2d")!;
  const s = Math.max(POSTER_W / width, POSTER_H / height);
  const dw = width * s;
  const dh = height * s;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  ctx.drawImage(v, (POSTER_W - dw) / 2, (POSTER_H - dh) / 2, dw, dh);
  const poster = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't make a poster for this clip."))), "image/jpeg", 0.82));
  URL.revokeObjectURL(url);
  return { duration, width, height, poster, vertical: height > width };
}

// MP4/MOV store the codec name ("avc1" = H.264, "hvc1"/"hev1" = HEVC) in the moov box,
// which can sit at the start or the end of the file. Scan both ends.
async function looksHevcOnly(file: File) {
  const chunk = 4 * 1024 * 1024;
  const parts = [file.slice(0, chunk), file.size > chunk ? file.slice(Math.max(chunk, file.size - chunk)) : null].filter(Boolean) as Blob[];
  let hevc = false;
  let avc = false;
  for (const p of parts) {
    const b = new Uint8Array(await p.arrayBuffer());
    hevc ||= find(b, "hvc1") || find(b, "hev1");
    avc ||= find(b, "avc1");
  }
  return hevc && !avc;
}
function find(b: Uint8Array, s: string) {
  const c0 = s.charCodeAt(0), c1 = s.charCodeAt(1), c2 = s.charCodeAt(2), c3 = s.charCodeAt(3);
  for (let i = 0; i < b.length - 3; i++) if (b[i] === c0 && b[i + 1] === c1 && b[i + 2] === c2 && b[i + 3] === c3) return true;
  return false;
}

// Upload with progress (fetch can't report upload progress, XHR can).
export function upload(blob: Blob, kind: "photo" | "poster" | "clip", onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/creator/media?kind=${kind}`);
    xhr.setRequestHeader("content-type", blob.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: { src?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.src) resolve(data.src);
      else reject(new Error(data.error || (xhr.status === 401 ? "Your session expired. Log in again." : "Upload failed. Check your connection and try again.")));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(blob);
  });
}
