import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function signUploadParams(params: Record<string, string | number>) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) throw new Error("CLOUDINARY_API_SECRET is not configured");
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return signature;
}

export { cloudinary };
