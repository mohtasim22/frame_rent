import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";

export const uploadsEnabled = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

/** Everything uploaded by this app lands in one folder, never the account root. */
export const UPLOAD_FOLDER = "framerent/products";

/**
 * Signs one upload.
 *
 * The browser uploads the file straight to Cloudinary — it never passes through
 * this server, which keeps large files off a free-tier dyno entirely. What the
 * server controls is WHO may upload and WHERE it lands: without a signature
 * from here, Cloudinary rejects the request.
 *
 * The alternative, an unsigned upload preset, puts the preset name in the
 * browser bundle, and anyone who reads it can upload to the account.
 */
export function signUpload(): {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
} {
  if (!uploadsEnabled) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.round(Date.now() / 1000);

  // Every parameter signed here must also be sent by the browser, and the
  // browser must send nothing else that Cloudinary signs — the signature covers
  // the exact set.
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: UPLOAD_FOLDER },
    env.CLOUDINARY_API_SECRET!,
  );

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    timestamp,
    folder: UPLOAD_FOLDER,
    signature,
  };
}
