/**
 * S2-04: Client-side photo processing.
 * Re-encodes the image onto an HTML5 canvas to completely strip all EXIF,
 * IPTC, and GPS location metadata before uploading to Supabase Storage.
 */

export interface ProcessedImageResult {
  blob: Blob;
  filename: string;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function stripExifAndProcessPhoto(
  file: File,
  maxDimension = 1600
): Promise<ProcessedImageResult> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Invalid image format. Only JPEG, PNG, and WebP are supported.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Image exceeds the maximum allowed size of 5 MB.");
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down proportionally if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to create canvas rendering context."));
        return;
      }

      // Drawing to canvas strips all EXIF/GPS metadata
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to encode stripped image."));
            return;
          }

          const safeFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
          resolve({ blob, filename: safeFilename });
        },
        "image/jpeg",
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image file."));
    };

    img.src = objectUrl;
  });
}
