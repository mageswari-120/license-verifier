import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  getLicenseByCode,
  getThemeItem,
  logDownload,
} from "../lib/license.server";

/**
 * Secure download handler
 * - Validates license belongs to requesting shop
 * - Logs download event
 * - Redirects to actual download URL (or streams file)
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const { licenseKey } = params;

  if (!licenseKey) {
    throw new Response("Missing license key", { status: 400 });
  }

  // Validate license ownership
  const license = await getLicenseByCode(licenseKey, session.shop);
  if (!license || license.status !== "ACTIVE") {
    throw new Response("License not found or inactive", { status: 403 });
  }

  // Get theme download URL
  const theme = await getThemeItem(license.envatoItemId);
  if (!theme?.downloadUrl) {
    throw new Response("Download not available", { status: 404 });
  }

  // Log download event
  await logDownload(license.id, theme.version || "unknown");

  // Redirect to the actual file (S3, Cloudways, Google Drive share, etc.)
  return redirect(theme.downloadUrl);
}
