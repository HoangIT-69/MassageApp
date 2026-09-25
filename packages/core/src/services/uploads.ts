import { readFile } from "node:fs/promises";
import path from "node:path";
import { MAX_PHOTO_BYTES } from "../constants";
import { AppError } from "../errors";
import type { ObjectStore } from "./object-store";

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function photoExtension(contentType: string): string {
  const ext = ALLOWED.get(contentType);
  if (!ext) throw new AppError("Chỉ nhận ảnh JPEG, PNG hoặc WebP", 400);
  return ext;
}

export function assertPhotoSize(size: number): void {
  if (size < 1 || size > MAX_PHOTO_BYTES) throw new AppError("Ảnh vượt quá 5 MB", 400);
}

const EXTENSIONS = new Set(["jpg", "png", "webp"]);

export function staffPhotoRelative(vendorId: string, staffId: string, ext: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(vendorId) || !/^[a-zA-Z0-9_-]+$/.test(staffId) || !EXTENSIONS.has(ext)) {
    throw new AppError("Đường dẫn ảnh không hợp lệ", 400);
  }
  return path.posix.join("staff", vendorId, `${staffId}.${ext}`);
}

export function attachmentPayload(key: string, body: Buffer): {
  data: Buffer;
  filename: `${string}.${string}`;
  metadata: { totalSize: number };
} {
  const base = path.posix.basename(key);
  if (!/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(base)) {
    throw new AppError("Đường dẫn ảnh không hợp lệ", 400);
  }
  const filename = base as `${string}.${string}`;
  return { data: body, filename, metadata: { totalSize: body.length } };
}

function contentTypeFor(key: string): string {
  const ext = path.posix.extname(key).slice(1);
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export async function loadPhotoBytes(store: ObjectStore, dataDir: string, key: string): Promise<Buffer> {
  const stored = await store.get(key);
  if (stored) return stored.body;
  const absolute = resolveUpload(dataDir, key);
  const body = await readFile(absolute);
  await store.put(key, body, contentTypeFor(key));
  return body;
}

export function resolveUpload(dataDir: string, relativePath: string): string {
  const root = path.resolve(dataDir, "uploads");
  const absolute = path.resolve(root, relativePath);
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new AppError("Đường dẫn ảnh không hợp lệ", 400);
  }
  return absolute;
}
