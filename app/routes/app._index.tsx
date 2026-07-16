import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
  EmptyState,
  DataTable,
  Banner,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getLicensesForShop } from "../lib/license.server";
import { formatDate, isSupportActive } from "../lib/date";
import { getShopLicenseStatus } from "../lib/metafield.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);

  try {
    const licenses = await getLicensesForShop(session.shop);
    const licenseStatus = await getShopLicenseStatus(admin);

    return json({
      shop: session.shop,
      storeVerified: licenseStatus.verified,
      licenseDetail: licenseStatus.detail,
      licenses: licenses.map((l) => ({
        ...l,
        soldAt: l.soldAt.toISOString(),
        supportedUntil: l.supportedUntil.toISOString(),
        verifiedAt: l.verifiedAt.toISOString(),
        supportActive: isSupportActive(l.supportedUntil),
        lastDownload: l.downloads[0]?.version ?? null,
      })),
    });
  } catch (error) {
    console.error("Dashboard Loader Error:", error);

    return json({
      shop: session.shop,
      storeVerified: false,
      licenseDetail: null,
      licenses: [],
    });
  }
}

export default function Index() {
  const { shop, licenses, storeVerified, licenseDetail } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const hasLicenses = licenses.length > 0;
  const activeCount = licenses.filter((l) => l.supportActive).length;

  return (
    <Page
      title="WDT Theme License Manager"
      subtitle="Manage your buddhathemes Shopify theme licenses"
      primaryAction={{
        content: "Register New License",
        onAction: () => navigate("/app/verify"),
      }}
    >
      <Layout>
        {/* Store verification status — most important banner */}
        <Layout.Section>
          {storeVerified ? (
            <Banner
              title="✅ Store license verified — theme is active"
              tone="success"
            >
              <p>
                Your storefront license banner is hidden. Theme is fully active on <strong>{shop}</strong>.
                {licenseDetail && (
                  <> License key: <strong>{licenseDetail.licenseKey}</strong></>
                )}
              </p>
            </Banner>
          ) : (
            <Banner
              title="⚠️ License not verified — your storefront is showing a warning banner"
              tone="critical"
              action={{
                content: "Verify License Now",
                onAction: () => navigate("/app/verify"),
              }}
            >
              <p>
                Your theme is installed on <strong>{shop}</strong> but the license has not been verified.
                Visitors to your store will see a warning banner until you register your ThemeForest purchase code.
              </p>
            </Banner>
          )}
        </Layout.Section>

        {/* License count summary */}
        {hasLicenses && (
          <Layout.Section>
            <Banner
              title={`${licenses.length} theme${licenses.length > 1 ? "s" : ""} registered for ${shop}`}
              tone={activeCount === licenses.length ? "success" : "warning"}
            >
              <p>
                {activeCount} active support {activeCount === 1 ? "plan" : "plans"}.{" "}
                {licenses.length - activeCount > 0 &&
                  `${licenses.length - activeCount} license(s) with expired support.`}
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h2">
                  Registered Licenses
                </Text>
                <Button variant="primary" onClick={() => navigate("/app/verify")}>
                  + Register License
                </Button>
              </InlineStack>

              <Divider />

              {!hasLicenses ? (
                <EmptyState
                  heading="No licenses registered yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  action={{
                    content: "Register Your First License",
                    onAction: () => navigate("/app/verify"),
                  }}
                >
                  <p>
                    Enter your ThemeForest purchase code to verify your theme license,
                    unlock updates, and get support access.
                  </p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                  headings={[
                    "Theme",
                    "License Key",
                    "License Type",
                    "Purchased",
                    "Support Until",
                    "Status",
                  ]}
                  rows={licenses.map((l) => [
                    l.envatoItemName,
                    <Text
                      key={l.licenseKey}
                      variant="bodySm"
                      as="span"
                      tone="subdued"
                      fontWeight="semibold"
                    >
                      {l.licenseKey}
                    </Text>,
                    l.licenseType,
                    formatDate(new Date(l.soldAt)),
                    formatDate(new Date(l.supportedUntil)),
                    <Badge
                      key={l.id}
                      tone={l.supportActive ? "success" : "warning"}
                    >
                      {l.supportActive ? "Support Active" : "Support Expired"}
                    </Badge>,
                  ])}
                  footerContent={`${licenses.length} license(s) registered`}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* How to find purchase code */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                How to find your purchase code
              </Text>
              <Text as="p" tone="subdued">
                1. Log in to your{" "}
                <Text as="span" fontWeight="semibold">Envato Market</Text> account
              </Text>
              <Text as="p" tone="subdued">
                2. Go to <Text as="span" fontWeight="semibold">Downloads</Text>
              </Text>
              <Text as="p" tone="subdued">
                3. Find your buddhathemes purchase and click{" "}
                <Text as="span" fontWeight="semibold">License certificate & purchase code</Text>
              </Text>
              <Text as="p" tone="subdued">
                4. Copy the purchase code (UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
              </Text>
              <Divider />
              <Button
                url="https://themeforest.net/downloads"
                external
                variant="plain"
              >
                Go to Envato Downloads →
              </Button>
            </BlockStack>
          </Card>

          {/* Support card */}
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">Need help?</Text>
              <Text as="p" tone="subdued">
                Contact buddhathemes support with your license key ready.
              </Text>
              <Button
                url={process.env.SUPPORT_URL || "https://buddhathemes.com/support"}
                external
              >
                Contact Support
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
