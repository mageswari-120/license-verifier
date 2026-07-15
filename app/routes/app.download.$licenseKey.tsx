import { json, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Banner,
  Badge,
  InlineStack,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  getLicenseByCode,
  getThemeItem,
} from "../lib/license.server";

import {
  isSupportActive,
  formatDate,
} from "../lib/date";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const { licenseKey } = params;

  if (!licenseKey) return redirect("/app");

  // Find license — must belong to this shop
  const license = await getLicenseByCode(licenseKey, session.shop);
  if (!license) {
    return json({ error: "License not found or not registered to this store.", license: null, theme: null });
  }

  const theme = await getThemeItem(license.envatoItemId);

  // Log the download view (actual download happens on button click via separate endpoint)
  return json({
    error: null,
    license: {
      ...license,
      soldAt: license.soldAt.toISOString(),
      supportedUntil: license.supportedUntil.toISOString(),
      supportActive: isSupportActive(license.supportedUntil),
    },
    theme: theme
      ? { name: theme.name, version: theme.version, downloadUrl: theme.downloadUrl }
      : null,
  });
}

export default function DownloadPage() {
  const { error, license, theme } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  if (error || !license) {
    return (
      <Page title="Download Theme" backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}>
        <Banner title="License not found" tone="critical">
          <p>{error || "This license key is not registered to your store."}</p>
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      title={`Download — ${license.envatoItemName}`}
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h2">{license.envatoItemName}</Text>
                <Badge tone={license.supportActive ? "success" : "warning"}>
                  {license.supportActive ? "Support Active" : "Support Expired"}
                </Badge>
              </InlineStack>

              <Divider />

              {theme?.downloadUrl ? (
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">Current Version</Text>
                    <Text as="p" fontWeight="semibold">{theme.version || "Latest"}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">License Key</Text>
                    <Text as="p" fontWeight="semibold">{license.licenseKey}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">License Type</Text>
                    <Text as="p" fontWeight="semibold">{license.licenseType}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">Purchase Date</Text>
                    <Text as="p">{formatDate(new Date(license.soldAt))}</Text>
                  </InlineStack>

                  <Divider />

                  <Button
                    variant="primary"
                    size="large"
                    url={`/app/download-file/${license.licenseKey}`}
                  >
                    ⬇ Download {theme.name} {theme.version}
                  </Button>

                  <Text as="p" tone="subdued" variant="bodySm">
                    You can download the latest theme zip from here. Keep your purchase code safe
                    for future re-downloads and support.
                  </Text>
                </BlockStack>
              ) : (
                <Banner tone="info" title="Download link not available">
                  <p>
                    Your license is valid. Please contact{" "}
                    <strong>support@buddhathemes.com</strong>with
                    your license key <strong>{license.licenseKey}</strong> to receive the latest
                    theme files.
                  </p>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Support section */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">Support Access</Text>
              {license.supportActive ? (
                <>
                  <Text as="p">
                    Your support is active until{" "}
                    <strong>{formatDate(new Date(license.supportedUntil))}</strong>.
                  </Text>
                  <Button
                    url="https://buddhathemes.com/support"
                    external
                    variant="primary"
                  >
                    Open Support Ticket
                  </Button>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Include your license key when submitting: <strong>{license.licenseKey}</strong>
                  </Text>
                </>
              ) : (
                <>
                  <Banner tone="warning">
                    <p>Support expired on {formatDate(new Date(license.supportedUntil))}.</p>
                  </Banner>
                  <Button
                    url="https://themeforest.net/downloads"
                    external
                  >
                    Renew Support on Envato
                  </Button>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
