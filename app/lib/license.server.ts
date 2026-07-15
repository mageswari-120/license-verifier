/**
 * License DB operations — create, fetch, refresh
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import type { EnvatoSaleData } from "./envato.server";

const db = new PrismaClient();

const LICENSE_SECRET = process.env.LICENSE_SECRET || "changeme";

/**
 * Generate a signed license key
 * Format: WDT-XXXX-XXXX-XXXX-XXXX
 */
function generateLicenseKey(purchaseCode: string, shopDomain: string): string {
  const hash = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(`${purchaseCode}:${shopDomain}`)
    .digest("hex")
    .toUpperCase()
    .slice(0, 16);

  return `WDT-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
}

/**
 * Check if a purchase code is already registered to a different store
 */
export async function isCodeAlreadyRegistered(
  purchaseCode: string,
  shopDomain: string
): Promise<boolean> {
  const existing = await db.license.findUnique({
    where: { purchaseCode },
  });

  if (!existing) return false;
  // Allow re-registration to same shop (re-install scenario)
  return existing.shopDomain !== shopDomain;
}

/**
 * Create or update a license record after successful Envato verification
 */
export async function upsertLicense(
  shopDomain: string,
  saleData: EnvatoSaleData
): Promise<{ licenseKey: string; isNew: boolean }> {
  const licenseKey = generateLicenseKey(saleData.purchaseCode, shopDomain);

  const existing = await db.license.findUnique({
    where: { purchaseCode: saleData.purchaseCode },
  });

  if (existing) {
    // Update support dates (they may have renewed support)
    await db.license.update({
      where: { purchaseCode: saleData.purchaseCode },
      data: {
        supportedUntil: saleData.supportedUntil,
        lastCheckedAt: new Date(),
        status: "ACTIVE",
      },
    });
    return { licenseKey: existing.licenseKey, isNew: false };
  }

  // New registration
  await db.license.create({
    data: {
      shopDomain,
      purchaseCode: saleData.purchaseCode,
      envatoItemId: saleData.itemId,
      envatoItemName: saleData.itemName,
      buyerUsername: saleData.buyerUsername,
      licenseType: saleData.licenseType,
      soldAt: saleData.soldAt,
      supportedUntil: saleData.supportedUntil,
      licenseKey,
      status: "ACTIVE",
      storefront: "buddhathemes",
    },
  });

  return { licenseKey, isNew: true };
}

/**
 * Get all licenses for a shop
 */
export async function getLicensesForShop(shopDomain: string) {
  return db.license.findMany({
    where: { shopDomain },
    orderBy: { verifiedAt: "desc" },
    include: {
      downloads: { orderBy: { downloadedAt: "desc" }, take: 1 },
    },
  });
}

/**
 * Get a single license by purchase code + shop (ownership check)
 */
export async function getLicenseByCode(
  purchaseCode: string,
  shopDomain: string
) {
  return db.license.findFirst({
    where: { purchaseCode, shopDomain },
  });
}

/**
 * Get theme download info from ThemeItem registry
 */
export async function getThemeItem(itemId: number) {
  return db.themeItem.findUnique({ where: { id: itemId } });
}

/**
 * Log a download event
 */
export async function logDownload(
  licenseId: number,
  version: string,
  ipAddress?: string
) {
  return db.download.create({
    data: { licenseId, version, ipAddress },
  });
}

/**
 * Generate a time-limited support token (30 days)
 */
export async function generateSupportToken(licenseId: number): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const record = await db.supportToken.create({
    data: { licenseId, expiresAt },
  });

  return record.token;
}

 