import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { signUploadParams } from "@/lib/cloudinary";

// Generates a signature so the browser can upload directly to Cloudinary
// without the file ever passing through our server.
export async function POST() {
  try {
    await requireSession();
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "enroleasy/documents";
    const paramsToSign = { timestamp, folder };
    const signature = signUploadParams(paramsToSign);

    return NextResponse.json({
      timestamp,
      folder,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
