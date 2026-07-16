var _a;
import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useLoaderData, useNavigate, useActionData, useNavigation, Form, Link, useRouteError } from "@remix-run/react";
import { createReadableStreamFromReadable, redirect, json } from "@remix-run/node";
import { isbot } from "isbot";
import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp, DeliveryMethod, AppDistribution, LATEST_API_VERSION, boundary } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { Page, Banner, Layout, Card, BlockStack, InlineStack, Text, Badge, Divider, Button, Box, List, TextField, Spinner, CalloutCard } from "@shopify/polaris";
import { useState } from "react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
const prisma = new PrismaClient();
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: LATEST_API_VERSION,
  scopes: ((_a = process.env.SCOPES) == null ? void 0 : _a.split(",")) ?? ["read_themes"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.SingleMerchant,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks"
    }
  },
  hooks: {
    afterAuth: async ({ session }) => {
      shopify.registerWebhooks({ session });
    }
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true
  },
  ...process.env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] } : {}
});
const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
const authenticate = shopify.authenticate;
shopify.unauthenticated;
shopify.login;
shopify.registerWebhooks;
shopify.sessionStorage;
const streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        }
      }
    );
    setTimeout(abort, streamTimeout + 1e3);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest,
  streamTimeout
}, Symbol.toStringTag, { value: "Module" }));
const links$1 = () => [];
function App$1() {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width,initial-scale=1" }),
      /* @__PURE__ */ jsx("link", { rel: "preconnect", href: "https://cdn.shopify.com/" }),
      /* @__PURE__ */ jsx(
        "link",
        {
          rel: "stylesheet",
          href: "https://unpkg.com/@shopify/polaris@12.0.0/build/esm/styles.css"
        }
      ),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$1,
  links: links$1
}, Symbol.toStringTag, { value: "Module" }));
const db = new PrismaClient();
const LICENSE_SECRET = process.env.LICENSE_SECRET || "changeme";
function generateLicenseKey(purchaseCode, shopDomain) {
  const hash = crypto.createHmac("sha256", LICENSE_SECRET).update(`${purchaseCode}:${shopDomain}`).digest("hex").toUpperCase().slice(0, 16);
  return `WDT-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
}
async function isCodeAlreadyRegistered(purchaseCode, shopDomain) {
  const existing = await db.license.findUnique({
    where: { purchaseCode }
  });
  if (!existing) return false;
  return existing.shopDomain !== shopDomain;
}
async function upsertLicense(shopDomain, saleData) {
  const licenseKey = generateLicenseKey(saleData.purchaseCode, shopDomain);
  const existing = await db.license.findUnique({
    where: { purchaseCode: saleData.purchaseCode }
  });
  if (existing) {
    await db.license.update({
      where: { purchaseCode: saleData.purchaseCode },
      data: {
        supportedUntil: saleData.supportedUntil,
        lastCheckedAt: /* @__PURE__ */ new Date(),
        status: "ACTIVE"
      }
    });
    return { licenseKey: existing.licenseKey, isNew: false };
  }
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
      storefront: "buddhathemes"
    }
  });
  return { licenseKey, isNew: true };
}
async function getLicensesForShop(shopDomain) {
  return db.license.findMany({
    where: { shopDomain },
    orderBy: { verifiedAt: "desc" },
    include: {
      downloads: { orderBy: { downloadedAt: "desc" }, take: 1 }
    }
  });
}
async function getLicenseByCode(purchaseCode, shopDomain) {
  return db.license.findFirst({
    where: { purchaseCode, shopDomain }
  });
}
async function getThemeItem(itemId) {
  return db.themeItem.findUnique({ where: { id: itemId } });
}
async function loader$5({ request, params }) {
  const { session } = await authenticate.admin(request);
  const { licenseKey } = params;
  if (!licenseKey) {
    throw new Response("Missing license key", { status: 400 });
  }
  const license = await getLicenseByCode(licenseKey, session.shop);
  if (!license || license.status !== "ACTIVE") {
    throw new Response("License not found or inactive", { status: 403 });
  }
  const theme = await getThemeItem(license.envatoItemId);
  if (!(theme == null ? void 0 : theme.downloadUrl)) {
    throw new Response("Download not available", { status: 404 });
  }
  await logDownload(license.id, theme.version || "unknown");
  return redirect(theme.downloadUrl);
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
function isSupportActive(supportedUntil) {
  return /* @__PURE__ */ new Date() < supportedUntil;
}
async function loader$4({ request, params }) {
  const { session } = await authenticate.admin(request);
  const { licenseKey } = params;
  if (!licenseKey) return redirect("/app");
  const license = await getLicenseByCode(licenseKey, session.shop);
  if (!license) {
    return json({ error: "License not found or not registered to this store.", license: null, theme: null });
  }
  const theme = await getThemeItem(license.envatoItemId);
  return json({
    error: null,
    license: {
      ...license,
      soldAt: license.soldAt.toISOString(),
      supportedUntil: license.supportedUntil.toISOString(),
      supportActive: isSupportActive(license.supportedUntil)
    },
    theme: theme ? { name: theme.name, version: theme.version, downloadUrl: theme.downloadUrl } : null
  });
}
function DownloadPage() {
  const { error, license, theme } = useLoaderData();
  const navigate = useNavigate();
  if (error || !license) {
    return /* @__PURE__ */ jsx(Page, { title: "Download Theme", backAction: { content: "Dashboard", onAction: () => navigate("/app") }, children: /* @__PURE__ */ jsx(Banner, { title: "License not found", tone: "critical", children: /* @__PURE__ */ jsx("p", { children: error || "This license key is not registered to your store." }) }) });
  }
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: `Download — ${license.envatoItemName}`,
      backAction: { content: "Dashboard", onAction: () => navigate("/app") },
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", blockAlign: "center", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: license.envatoItemName }),
            /* @__PURE__ */ jsx(Badge, { tone: license.supportActive ? "success" : "warning", children: license.supportActive ? "Support Active" : "Support Expired" })
          ] }),
          /* @__PURE__ */ jsx(Divider, {}),
          (theme == null ? void 0 : theme.downloadUrl) ? /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "Current Version" }),
              /* @__PURE__ */ jsx(Text, { as: "p", fontWeight: "semibold", children: theme.version || "Latest" })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "License Key" }),
              /* @__PURE__ */ jsx(Text, { as: "p", fontWeight: "semibold", children: license.licenseKey })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "License Type" }),
              /* @__PURE__ */ jsx(Text, { as: "p", fontWeight: "semibold", children: license.licenseType })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
              /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "Purchase Date" }),
              /* @__PURE__ */ jsx(Text, { as: "p", children: formatDate(new Date(license.soldAt)) })
            ] }),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsxs(
              Button,
              {
                variant: "primary",
                size: "large",
                url: `/app/download-file/${license.licenseKey}`,
                children: [
                  "⬇ Download ",
                  theme.name,
                  " ",
                  theme.version
                ]
              }
            ),
            /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", variant: "bodySm", children: "You can download the latest theme zip from here. Keep your purchase code safe for future re-downloads and support." })
          ] }) : /* @__PURE__ */ jsx(Banner, { tone: "info", title: "Download link not available", children: /* @__PURE__ */ jsxs("p", { children: [
            "Your license is valid. Please contact",
            " ",
            /* @__PURE__ */ jsx("strong", { children: "support@buddhathemes.com" }),
            "with your license key ",
            /* @__PURE__ */ jsx("strong", { children: license.licenseKey }),
            " to receive the latest theme files."
          ] }) })
        ] }) }) }),
        /* @__PURE__ */ jsx(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
          /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Support Access" }),
          license.supportActive ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs(Text, { as: "p", children: [
              "Your support is active until",
              " ",
              /* @__PURE__ */ jsx("strong", { children: formatDate(new Date(license.supportedUntil)) }),
              "."
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                url: "https://buddhathemes.com/support",
                external: true,
                variant: "primary",
                children: "Open Support Ticket"
              }
            ),
            /* @__PURE__ */ jsxs(Text, { variant: "bodySm", as: "p", tone: "subdued", children: [
              "Include your license key when submitting: ",
              /* @__PURE__ */ jsx("strong", { children: license.licenseKey })
            ] })
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(Banner, { tone: "warning", children: /* @__PURE__ */ jsxs("p", { children: [
              "Support expired on ",
              formatDate(new Date(license.supportedUntil)),
              "."
            ] }) }),
            /* @__PURE__ */ jsx(
              Button,
              {
                url: "https://themeforest.net/downloads",
                external: true,
                children: "Renew Support on Envato"
              }
            )
          ] })
        ] }) }) })
      ] })
    }
  );
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: DownloadPage,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
const ENVATO_API_BASE = "https://api.envato.com/v3/market";
const ENVATO_TOKEN = process.env.ENVATO_PERSONAL_TOKEN;
const VALID_ITEM_IDS = (process.env.BUDDHATHEMES_ITEM_IDS || "").split(",").map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id));
async function verifyPurchaseCode(purchaseCode) {
  var _a2;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(purchaseCode.trim())) {
    return { success: false, error: "INVALID_CODE" };
  }
  try {
    const response = await fetch(
      `${ENVATO_API_BASE}/author/sale?code=${encodeURIComponent(purchaseCode.trim())}`,
      {
        headers: {
          Authorization: `Bearer ${ENVATO_TOKEN}`,
          "User-Agent": "WDT-License-Verifier/1.0"
        }
      }
    );
    if (response.status === 404) {
      return { success: false, error: "INVALID_CODE" };
    }
    if (!response.ok) {
      console.error(`Envato API error: ${response.status} ${response.statusText}`);
      return { success: false, error: "API_ERROR" };
    }
    const sale = await response.json();
    const itemId = (_a2 = sale == null ? void 0 : sale.item) == null ? void 0 : _a2.id;
    if (!itemId || !VALID_ITEM_IDS.includes(itemId)) {
      return { success: false, error: "WRONG_ITEM" };
    }
    const soldAt = new Date(sale.sold_at);
    const supportedUntil = new Date(sale.supported_until);
    const supportActive = supportedUntil > /* @__PURE__ */ new Date();
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
        amount: sale.amount
      }
    };
  } catch (err) {
    console.error("Envato API fetch failed:", err);
    return { success: false, error: "API_ERROR" };
  }
}
function getErrorMessage(error) {
  const messages = {
    INVALID_CODE: "Purchase code not found. Please check the code and try again. You can find your purchase code in your Envato downloads page.",
    WRONG_ITEM: "This purchase code is valid on Envato but does not belong to a buddhathemes Shopify theme. Please use the correct purchase code.",
    SUPPORT_EXPIRED: "Your purchase code is valid but your support period has expired. You can still download the theme, but please renew support to access priority help.",
    API_ERROR: "Unable to reach Envato servers. Please try again in a few minutes.",
    ALREADY_REGISTERED: "This purchase code is already registered to another store. Each license can only be used on one Shopify store."
  };
  return messages[error];
}
const METAFIELD_NAMESPACE = "wdt_licenses";
const METAFIELD_KEY = "verified";
const METAFIELD_KEY_DETAIL = "license_detail";
async function setShopLicenseVerified(admin, licenseKey, itemName, supportedUntil) {
  var _a2, _b;
  try {
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
            ownerId: "shop",
            // shop-level metafield
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            value: "true",
            type: "single_line_text_field"
          },
          {
            // Detail record — useful for admin display
            ownerId: "shop",
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY_DETAIL,
            value: JSON.stringify({
              licenseKey,
              itemName,
              verifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
              supportedUntil: supportedUntil.toISOString()
            }),
            type: "json"
          }
        ]
      }
    });
    const result = await verifiedResponse.json();
    const userErrors = ((_b = (_a2 = result == null ? void 0 : result.data) == null ? void 0 : _a2.metafieldsSet) == null ? void 0 : _b.userErrors) ?? [];
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
async function getShopLicenseStatus(admin) {
  var _a2, _b, _c;
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
    const shop = (_a2 = data == null ? void 0 : data.data) == null ? void 0 : _a2.shop;
    const verified = ((_b = shop == null ? void 0 : shop.verifiedFlag) == null ? void 0 : _b.value) === "true";
    let detail = null;
    if ((_c = shop == null ? void 0 : shop.licenseDetail) == null ? void 0 : _c.value) {
      try {
        detail = JSON.parse(shop.licenseDetail.value);
      } catch {
      }
    }
    return { verified, detail };
  } catch (err) {
    console.error("Failed to read license metafield:", err);
    return { verified: false, detail: null };
  }
}
async function loader$3({ request }) {
  await authenticate.admin(request);
  return json({});
}
async function action$1({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const purchaseCode = String(formData.get("purchaseCode") || "").trim();
  if (!purchaseCode) {
    return json({
      error: "Please enter your purchase code.",
      errorType: null,
      success: null
    });
  }
  const alreadyTaken = await isCodeAlreadyRegistered(purchaseCode, shopDomain);
  if (alreadyTaken) {
    return json({
      error: getErrorMessage("ALREADY_REGISTERED"),
      errorType: "ALREADY_REGISTERED",
      success: null
    });
  }
  const result = await verifyPurchaseCode(purchaseCode);
  if (!result.success) {
    return json({
      error: getErrorMessage(result.error),
      errorType: result.error,
      success: null
    });
  }
  const { licenseKey, isNew } = await upsertLicense(shopDomain, result.data);
  await setShopLicenseVerified(
    admin,
    licenseKey,
    result.data.itemName,
    result.data.supportedUntil
  );
  return json({
    error: null,
    errorType: null,
    success: {
      licenseKey,
      isNew,
      itemName: result.data.itemName,
      buyerUsername: result.data.buyerUsername,
      licenseType: result.data.licenseType,
      soldAt: result.data.soldAt.toISOString(),
      supportedUntil: result.data.supportedUntil.toISOString(),
      supportActive: result.data.supportActive
    }
  });
}
function VerifyPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [purchaseCode, setPurchaseCode] = useState("");
  const isSubmitting = navigation.state === "submitting";
  const success = actionData == null ? void 0 : actionData.success;
  const error = actionData == null ? void 0 : actionData.error;
  return /* @__PURE__ */ jsx(
    Page,
    {
      title: "Register Theme License",
      backAction: { content: "Dashboard", onAction: () => navigate("/app") },
      children: /* @__PURE__ */ jsxs(Layout, { children: [
        /* @__PURE__ */ jsx(Layout.Section, { children: success ? /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
          /* @__PURE__ */ jsx(
            Banner,
            {
              title: success.isNew ? "License verified successfully! 🎉" : "License already registered — details updated",
              tone: "success",
              children: /* @__PURE__ */ jsxs("p", { children: [
                "Your copy of ",
                /* @__PURE__ */ jsx("strong", { children: success.itemName }),
                " has been verified and registered to this store."
              ] })
            }
          ),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Your License Details" }),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsx(
              Box,
              {
                background: "bg-surface-secondary",
                padding: "400",
                borderRadius: "200",
                children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "p", children: "YOUR LICENSE KEY" }),
                  /* @__PURE__ */ jsx(
                    Text,
                    {
                      variant: "headingLg",
                      as: "p",
                      fontWeight: "bold",
                      children: success.licenseKey
                    }
                  ),
                  /* @__PURE__ */ jsx(Text, { variant: "bodySm", tone: "subdued", as: "p", children: "Save this key — use it when contacting support or entering in theme settings." })
                ] })
              }
            ),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "300", children: [
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "Theme" }),
                /* @__PURE__ */ jsx(Text, { as: "p", fontWeight: "semibold", children: success.itemName })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "Buyer" }),
                /* @__PURE__ */ jsx(Text, { as: "p", fontWeight: "semibold", children: success.buyerUsername })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "License Type" }),
                /* @__PURE__ */ jsx(Text, { as: "p", fontWeight: "semibold", children: success.licenseType })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "Purchase Date" }),
                /* @__PURE__ */ jsx(Text, { as: "p", fontWeight: "semibold", children: formatDate(new Date(success.soldAt)) })
              ] }),
              /* @__PURE__ */ jsxs(InlineStack, { align: "space-between", children: [
                /* @__PURE__ */ jsx(Text, { as: "p", tone: "subdued", children: "Support Until" }),
                /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Text, { as: "p", fontWeight: "semibold", children: formatDate(new Date(success.supportedUntil)) }),
                  /* @__PURE__ */ jsx(Badge, { tone: success.supportActive ? "success" : "warning", children: success.supportActive ? "Active" : "Expired" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(Divider, {}),
            /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
              /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "What's unlocked:" }),
              /* @__PURE__ */ jsxs(List, { type: "bullet", children: [
                /* @__PURE__ */ jsxs(List.Item, { children: [
                  "✅ ",
                  /* @__PURE__ */ jsx("strong", { children: "Theme Downloads" }),
                  " — Go to Dashboard to download the latest version"
                ] }),
                /* @__PURE__ */ jsx(List.Item, { children: success.supportActive ? "✅ Priority Support — Active until " + formatDate(new Date(success.supportedUntil)) : "⚠️ Support Expired — Renew on Envato to re-activate" }),
                /* @__PURE__ */ jsxs(List.Item, { children: [
                  "✅ ",
                  /* @__PURE__ */ jsx("strong", { children: "License Key" }),
                  " — Use ",
                  /* @__PURE__ */ jsx("code", { children: success.licenseKey }),
                  " when submitting support tickets"
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(InlineStack, { gap: "300", children: [
              /* @__PURE__ */ jsx(Button, { variant: "primary", onClick: () => navigate("/app"), children: "Go to Dashboard" }),
              !success.supportActive && /* @__PURE__ */ jsx(
                Button,
                {
                  url: "https://themeforest.net/downloads",
                  external: true,
                  children: "Renew Support on Envato"
                }
              )
            ] })
          ] }) })
        ] }) : (
          /* Verify form */
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingMd", as: "h2", children: "Enter Your ThemeForest Purchase Code" }),
            /* @__PURE__ */ jsxs(Text, { as: "p", tone: "subdued", children: [
              "Your purchase code is a unique identifier (UUID format) found in your Envato downloads. It looks like: ",
              /* @__PURE__ */ jsx("code", { children: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" })
            ] }),
            error && /* @__PURE__ */ jsx(
              Banner,
              {
                title: "Verification failed",
                tone: "critical",
                onDismiss: () => {
                },
                children: /* @__PURE__ */ jsx("p", { children: error })
              }
            ),
            /* @__PURE__ */ jsx(Form, { method: "post", children: /* @__PURE__ */ jsxs(BlockStack, { gap: "400", children: [
              /* @__PURE__ */ jsx(
                TextField,
                {
                  label: "Purchase Code",
                  name: "purchaseCode",
                  value: purchaseCode,
                  onChange: setPurchaseCode,
                  placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                  helpText: "Paste your full ThemeForest purchase code here",
                  autoComplete: "off",
                  disabled: isSubmitting,
                  error: (actionData == null ? void 0 : actionData.errorType) === "INVALID_CODE" ? "Invalid purchase code format" : void 0
                }
              ),
              /* @__PURE__ */ jsxs(InlineStack, { gap: "300", blockAlign: "center", children: [
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "primary",
                    submit: true,
                    loading: isSubmitting,
                    disabled: !purchaseCode.trim(),
                    size: "large",
                    children: isSubmitting ? "Verifying..." : "Verify & Register"
                  }
                ),
                isSubmitting && /* @__PURE__ */ jsxs(InlineStack, { gap: "200", blockAlign: "center", children: [
                  /* @__PURE__ */ jsx(Spinner, { size: "small" }),
                  /* @__PURE__ */ jsx(Text, { as: "span", tone: "subdued", children: "Checking with Envato..." })
                ] })
              ] })
            ] }) })
          ] }) })
        ) }),
        /* @__PURE__ */ jsxs(Layout.Section, { variant: "oneThird", children: [
          /* @__PURE__ */ jsx(
            CalloutCard,
            {
              title: "Where to find your purchase code",
              illustration: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
              primaryAction: {
                content: "Open Envato Downloads",
                url: "https://themeforest.net/downloads",
                external: true
              },
              children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
                /* @__PURE__ */ jsxs(Text, { as: "p", children: [
                  "1. Log in to ",
                  /* @__PURE__ */ jsx("strong", { children: "themeforest.net" })
                ] }),
                /* @__PURE__ */ jsxs(Text, { as: "p", children: [
                  "2. Click ",
                  /* @__PURE__ */ jsx("strong", { children: "Downloads" }),
                  " in the top menu"
                ] }),
                /* @__PURE__ */ jsx(Text, { as: "p", children: "3. Find your theme purchase" }),
                /* @__PURE__ */ jsxs(Text, { as: "p", children: [
                  "4. Click ",
                  /* @__PURE__ */ jsx("strong", { children: '"License certificate & purchase code"' })
                ] }),
                /* @__PURE__ */ jsxs(Text, { as: "p", children: [
                  "5. Copy the ",
                  /* @__PURE__ */ jsx("strong", { children: "Item Purchase Code" })
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ jsx(Card, { children: /* @__PURE__ */ jsxs(BlockStack, { gap: "200", children: [
            /* @__PURE__ */ jsx(Text, { variant: "headingSm", as: "h3", children: "Supported Themes" }),
            /* @__PURE__ */ jsxs(Text, { as: "p", tone: "subdued", children: [
              "This app supports all ",
              /* @__PURE__ */ jsx("strong", { children: "buddhathemes" }),
              " Shopify themes purchased on ThemeForest, including Lollipop and other themes in our catalog."
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                url: "https://themeforest.net/user/buddhathemes/portfolio",
                external: true,
                variant: "plain",
                children: "View buddhathemes portfolio →"
              }
            )
          ] }) })
        ] })
      ] })
    }
  );
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: VerifyPage,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
async function loader$2({ request }) {
  const { session, admin } = await authenticate.admin(request);
  try {
    const licenses = await getLicensesForShop(session.shop);
    const licenseStatus = await getShopLicenseStatus(admin);
    return json({
      shop: session.shop,
      storeVerified: licenseStatus.verified,
      licenseDetail: licenseStatus.detail,
      licenses: licenses.map((l) => {
        var _a2;
        return {
          ...l,
          soldAt: l.soldAt.toISOString(),
          supportedUntil: l.supportedUntil.toISOString(),
          verifiedAt: l.verifiedAt.toISOString(),
          supportActive: isSupportActive(l.supportedUntil),
          lastDownload: ((_a2 = l.downloads[0]) == null ? void 0 : _a2.version) ?? null
        };
      })
    });
  } catch (error) {
    console.error("Dashboard Loader Error:", error);
    return json({
      shop: session.shop,
      storeVerified: false,
      licenseDetail: null,
      licenses: []
    });
  }
}
function Index() {
  return /* @__PURE__ */ jsx("h1", { children: "Hello Shopify App" });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  loader: loader$2
}, Symbol.toStringTag, { value: "Module" }));
const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);
  if (!admin && topic !== "APP_UNINSTALLED") {
    throw new Response();
  }
  switch (topic) {
    case "APP_UNINSTALLED":
      console.log(`App uninstalled from shop: ${shop}`);
      break;
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }
  throw new Response();
};
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action
}, Symbol.toStringTag, { value: "Module" }));
const loader$1 = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$1
}, Symbol.toStringTag, { value: "Module" }));
const polarisStyles = "/assets/styles-BeiPL2RV.css";
const links = () => [{ rel: "stylesheet", href: polarisStyles }];
const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};
function App() {
  const { apiKey } = useLoaderData();
  return /* @__PURE__ */ jsxs(AppProvider, { isEmbeddedApp: true, apiKey, children: [
    /* @__PURE__ */ jsxs(NavMenu, { children: [
      /* @__PURE__ */ jsx(Link, { to: "/app", rel: "home", children: "Dashboard" }),
      /* @__PURE__ */ jsx(Link, { to: "/app/verify", children: "Register License" })
    ] }),
    /* @__PURE__ */ jsx(Outlet, {})
  ] });
}
function ErrorBoundary() {
  const error = useRouteError();
  return boundary.error(error);
}
const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ErrorBoundary,
  default: App,
  headers,
  links,
  loader
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BYcF86ME.js", "imports": ["/assets/jsx-runtime-BMrMXMSG.js", "/assets/components-C_M7i1r3.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-Bb7oxfoh.js", "imports": ["/assets/jsx-runtime-BMrMXMSG.js", "/assets/components-C_M7i1r3.js"], "css": [] }, "routes/app.download-file.$licenseKey": { "id": "routes/app.download-file.$licenseKey", "parentId": "routes/app", "path": "download-file/:licenseKey", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.download-file._licenseKey-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app.download.$licenseKey": { "id": "routes/app.download.$licenseKey", "parentId": "routes/app", "path": "download/:licenseKey", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.download._licenseKey-BQmhtLdj.js", "imports": ["/assets/jsx-runtime-BMrMXMSG.js", "/assets/date-CoU5Uvw7.js", "/assets/components-C_M7i1r3.js", "/assets/context-D1t0TB5J.js"], "css": [] }, "routes/app.verify": { "id": "routes/app.verify", "parentId": "routes/app", "path": "verify", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.verify-DM55eiMg.js", "imports": ["/assets/jsx-runtime-BMrMXMSG.js", "/assets/date-CoU5Uvw7.js", "/assets/components-C_M7i1r3.js", "/assets/context-D1t0TB5J.js"], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-BD8UrI0D.js", "imports": ["/assets/jsx-runtime-BMrMXMSG.js"], "css": [] }, "routes/webhooks": { "id": "routes/webhooks", "parentId": "root", "path": "webhooks", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/webhooks-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/auth.$": { "id": "routes/auth.$", "parentId": "root", "path": "auth/*", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/auth._-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": true, "module": "/assets/app-CspzoOEV.js", "imports": ["/assets/jsx-runtime-BMrMXMSG.js", "/assets/components-C_M7i1r3.js", "/assets/context-D1t0TB5J.js"], "css": [] } }, "url": "/assets/manifest-81ee46f9.js", "version": "81ee46f9" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": false, "v3_relativeSplatPath": false, "v3_throwAbortReason": false, "v3_routeConfig": false, "v3_singleFetch": false, "v3_lazyRouteDiscovery": false, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/app.download-file.$licenseKey": {
    id: "routes/app.download-file.$licenseKey",
    parentId: "routes/app",
    path: "download-file/:licenseKey",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/app.download.$licenseKey": {
    id: "routes/app.download.$licenseKey",
    parentId: "routes/app",
    path: "download/:licenseKey",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/app.verify": {
    id: "routes/app.verify",
    parentId: "routes/app",
    path: "verify",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route4
  },
  "routes/webhooks": {
    id: "routes/webhooks",
    parentId: "root",
    path: "webhooks",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/auth.$": {
    id: "routes/auth.$",
    parentId: "root",
    path: "auth/*",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
