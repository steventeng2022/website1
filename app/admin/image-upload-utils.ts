const MB = 1024 * 1024;

export const MAX_SOURCE_BYTES = 40 * MB;
export const MAX_UPLOAD_BYTES = 12 * MB;
export const MAX_GIF_BYTES = 12 * MB;
export const A4_LONG_EDGE_PX = 3508;

function outputName(file: File) {
  return `${file.name.replace(/\.[^.]+$/, "") || "photo"}.webp`;
}

async function renderWebp(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("瀏覽器無法處理這張圖片");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

/**
 * Keeps ordinary images untouched. Very large images are converted in the
 * browser before upload, retaining up to A4 at 300 DPI (2480 x 3508 px).
 */
export async function prepareImageUpload(file: File): Promise<File> {
  if (file.type === "image/gif") {
    if (file.size > MAX_GIF_BYTES) throw new Error(`${file.name} 的 GIF 必須小於 12 MB`);
    return file;
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(`${file.name} 超過 40 MB，請選擇較小的原始圖片`);
  }
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`${file.name} 無法讀取，請改用 JPG、PNG 或 WebP`);
  }

  try {
    const initialScale = Math.min(1, A4_LONG_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));

    for (const quality of [0.92, 0.86, 0.78, 0.7]) {
      const blob = await renderWebp(bitmap, width, height, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        return new File([blob], outputName(file), { type: "image/webp" });
      }
    }

    // Exceptionally detailed scans may still exceed the byte limit. Reduce
    // gently only after preserving A4 resolution has been attempted.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      width = Math.max(1, Math.round(width * 0.85));
      height = Math.max(1, Math.round(height * 0.85));
      const blob = await renderWebp(bitmap, width, height, 0.72);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        return new File([blob], outputName(file), { type: "image/webp" });
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error(`${file.name} 壓縮後仍超過 12 MB，請改用 JPG 或 WebP`);
}
