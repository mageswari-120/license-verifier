/**
 * Envato API — Purchase Code Verification
 * buddhathemes ThemeForest storefront
 */

const ENVATO_API_BASE = "https://api.envato.com/v3/market";
const ENVATO_TOKEN = process.env.ENVATO_PERSONAL_TOKEN!;

// All buddhathemes Shopify theme item IDs on ThemeForest
// Add your real item IDs here
const VALID_ITEM_IDS: number[] = (process.env.BUDDHATHEMES_ITEM_IDS || "")
  .split(",")
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !isNaN(id));

export type EnvatoVerifyResult =
  | { success: true; data: EnvatoSaleData }
  | { success: false; error: EnvatoError };

export type EnvatoError =
  | "INVALID_CODE"        // Code not found in Envato
  | "WRONG_ITEM"          // Code valid but not for a buddhathemes item
  | "SUPPORT_EXPIRED"     // Code valid but support period ended
  | "API_ERROR"           // Envato API unreachable
  | "ALREADY_REGISTERED"; // Purchase code already tied to another store

export interface EnvatoSaleData {
  purchaseCode: string;
  itemId: number;
  itemName: string;
  buyerUsername: string;
  licenseType: string;
  soldAt: Date;
  supportedUntil: Date;
  supportActive: boolean;
  amount: string;
}

/**
 * Verify a purchase code against the Envato API
 * Uses the author token (buddhathemes) — only works for sales by this author
 */
export async function verifyPurchaseCode(
  purchaseCode: string
): Promise<EnvatoVerifyResult> {
  // Validate UUID format first (ThemeForest codes are UUIDs)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(purchaseCode.trim())) {
    return { success: false, error: "INVALID_CODE" };
  }

  try {
    const response = await fetch(
      `${ENVATO_API_BASE}/author/sale?code=${encodeURIComponent(purchaseCode.trim())}`,
      {
        headers: {
          Authorization: `Bearer ${ENVATO_TOKEN}`,
          "User-Agent": "WDT-License-Verifier/1.0",
        },
      }
    );

    // 404 = code not found
    if (response.status === 404) {
      return { success: false, error: "INVALID_CODE" };
    }

    // Other non-200 = API issue
    if (!response.ok) {
      console.error(`Envato API error: ${response.status} ${response.statusText}`);
      return { success: false, error: "API_ERROR" };
    }

    const sale = await response.json();

    // CRITICAL: Verify item belongs to buddhathemes
    const itemId = sale?.item?.id;
    if (!itemId || !VALID_ITEM_IDS.includes(itemId)) {
      return { success: false, error: "WRONG_ITEM" };
    }

    // Parse dates
    const soldAt = new Date(sale.sold_at);
    const supportedUntil = new Date(sale.supported_until);
    const supportActive = supportedUntil > new Date();

    return {
      success: true,
      data: {
        purchaseCode: purchaseCode.trim(),
        itemId,
        itemName: sale.item.name,
        buyerUsername: sale.buyer,
        licenseType: sale.license,
        soldAt,
        supportedUntil,
        supportActive,
        amount: sale.amount,
      },
    };
  } catch (err) {
    console.error("Envato API fetch failed:", err);
    return { success: false, error: "API_ERROR" };
  }
}

/**
 * Human-readable error messages for the Polaris UI
 */
export function getErrorMessage(error: EnvatoError): string {
  const messages: Record<EnvatoError, string> = {
    INVALID_CODE:
      "Purchase code not found. Please check the code and try again. You can find your purchase code in your Envato downloads page.",
    WRONG_ITEM:
      "This purchase code is valid on Envato but does not belong to a buddhathemes Shopify theme. Please use the correct purchase code.",
    SUPPORT_EXPIRED:
      "Your purchase code is valid but your support period has expired. You can still download the theme, but please renew support to access priority help.",
    API_ERROR:
      "Unable to reach Envato servers. Please try again in a few minutes.",
    ALREADY_REGISTERED:
      "This purchase code is already registered to another store. Each license can only be used on one Shopify store.",
  };
  return messages[error];
}
