/**
 * Shopify Metafield Manager
 * 
 * After successful Envato verification, we write a shop metafield:
 *   namespace: wdt_licenses
 *   key:       verified
 *   value:     "true"
 * 
 * The theme Liquid snippet reads this metafield.
 * If missing or not "true" → banner shown on storefront.
 * If "true" → banner hidden permanently.
 */

const METAFIELD_NAMESPACE = "wdt_licenses";
const METAFIELD_KEY = "verified";
const METAFIELD_KEY_DETAIL = "license_detail"; // optional: stores license key + expiry

/**
 * Write verified=true metafield to the shop
 * Called after successful Envato purchase code verification
 */
export async function setShopLicenseVerified(
  admin: any,
  licenseKey: string,
  itemName: string,
  supportedUntil: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    // Write the primary verified flag
    const verifiedResponse = await admin.graphql(`
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `, {
      variables: {
        metafields: [
          {
            // Primary flag — theme reads this
            ownerId: "shop", // shop-level metafield
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            value: "true",
            type: "single_line_text_field",
          },
          {
            // Detail record — useful for admin display
            ownerId: "shop",
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY_DETAIL,
            value: JSON.stringify({
              licenseKey,
              itemName,
              verifiedAt: new Date().toISOString(),
              supportedUntil: supportedUntil.toISOString(),
            }),
            type: "json",
          },
        ],
      },
    });

    const result = await verifiedResponse.json();
    const userErrors = result?.data?.metafieldsSet?.userErrors ?? [];

    if (userErrors.length > 0) {
      console.error("Metafield write errors:", userErrors);
      return { success: false, error: userErrors[0].message };
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to write license metafield:", err);
    return { success: false, error: "Failed to update store license status." };
  }
}

/**
 * Read current license status from shop metafields
 * Used to display current status in the app dashboard
 */
export async function getShopLicenseStatus(admin: any): Promise<{
  verified: boolean;
  detail: { licenseKey: string; itemName: string; verifiedAt: string; supportedUntil: string } | null;
}> {
  try {
    const response = await admin.graphql(`
      query GetLicenseMetafields {
        shop {
          verifiedFlag: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
            value
          }
          licenseDetail: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY_DETAIL}") {
            value
          }
        }
      }
    `);

    const data = await response.json();
    const shop = data?.data?.shop;

    const verified = shop?.verifiedFlag?.value === "true";
    let detail = null;

    if (shop?.licenseDetail?.value) {
      try {
        detail = JSON.parse(shop.licenseDetail.value);
      } catch {}
    }

    return { verified, detail };
  } catch (err) {
    console.error("Failed to read license metafield:", err);
    return { verified: false, detail: null };
  }
}

/**
 * Remove license metafields (on revoke/uninstall)
 */
export async function revokeShopLicense(admin: any): Promise<void> {
  try {
    // First get the metafield IDs
    const response = await admin.graphql(`
      query GetMetafieldIds {
        shop {
          verifiedFlag: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
            id
          }
          licenseDetail: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY_DETAIL}") {
            id
          }
        }
      }
    `);

    const data = await response.json();
    const shop = data?.data?.shop;
    const ids = [
      shop?.verifiedFlag?.id,
      shop?.licenseDetail?.id,
    ].filter(Boolean);

    if (ids.length === 0) return;

    // Delete them
    await admin.graphql(`
      mutation DeleteMetafields($metafieldIds: [ID!]!) {
        metafieldsDelete(metafieldIds: $metafieldIds) {
          deletedMetafieldIds
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: { metafieldIds: ids },
    });
  } catch (err) {
    console.error("Failed to revoke license metafield:", err);
  }
}
