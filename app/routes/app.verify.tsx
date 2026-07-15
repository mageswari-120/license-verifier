import { json, redirect } from "@remix-run/node";
import { useActionData, useNavigation, useNavigate } from "@remix-run/react";
import { Form } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Button,
  Banner,
  Text,
  InlineStack,
  Box,
  Spinner,
  List,
  Divider,
  Badge,
  CalloutCard,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { verifyPurchaseCode, getErrorMessage } from "../lib/envato.server";
import {
  isCodeAlreadyRegistered,
  upsertLicense,
} from "../lib/license.server";

import { formatDate } from "../lib/date";
import { setShopLicenseVerified } from "../lib/metafield.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const formData = await request.formData();
  const purchaseCode = String(formData.get("purchaseCode") || "").trim();

  // Basic presence check
  if (!purchaseCode) {
    return json({
      error: "Please enter your purchase code.",
      errorType: null,
      success: null,
    });
  }

  // Step 1: Check if already registered to another shop
  const alreadyTaken = await isCodeAlreadyRegistered(purchaseCode, shopDomain);
  if (alreadyTaken) {
    return json({
      error: getErrorMessage("ALREADY_REGISTERED"),
      errorType: "ALREADY_REGISTERED",
      success: null,
    });
  }

  // Step 2: Verify against Envato API
  const result = await verifyPurchaseCode(purchaseCode);

  if (!result.success) {
    return json({
      error: getErrorMessage(result.error),
      errorType: result.error,
      success: null,
    });
  }

  // Step 3: Store in DB + generate license key
  const { licenseKey, isNew } = await upsertLicense(shopDomain, result.data);

  // Step 4: Write verified=true metafield to the shop
  // This is what the theme Liquid snippet reads to hide the banner
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
      supportActive: result.data.supportActive,
    },
  });
}

export default function VerifyPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [purchaseCode, setPurchaseCode] = useState("");

  const isSubmitting = navigation.state === "submitting";
  const success = actionData?.success;
  const error = actionData?.error;

  return (
    <Page
      title="Register Theme License"
      backAction={{ content: "Dashboard", onAction: () => navigate("/app") }}
    >
      <Layout>
        <Layout.Section>
          {/* Success state */}
          {success ? (
            <BlockStack gap="400">
              <Banner
                title={success.isNew ? "License verified successfully! 🎉" : "License already registered — details updated"}
                tone="success"
              >
                <p>
                  Your copy of <strong>{success.itemName}</strong> has been verified and registered to this store.
                </p>
              </Banner>

              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Your License Details
                  </Text>
                  <Divider />

                  {/* License key — prominent display */}
                  <Box
                    background="bg-surface-secondary"
                    padding="400"
                    borderRadius="200"
                  >
                    <BlockStack gap="200">
                      <Text variant="bodySm" tone="subdued" as="p">
                        YOUR LICENSE KEY
                      </Text>
                      <Text
                        variant="headingLg"
                        as="p"
                        fontWeight="bold"
                      >
                        {success.licenseKey}
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="p">
                        Save this key — use it when contacting support or entering in theme settings.
                      </Text>
                    </BlockStack>
                  </Box>

                  {/* Details grid */}
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="p" tone="subdued">Theme</Text>
                      <Text as="p" fontWeight="semibold">{success.itemName}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" tone="subdued">Buyer</Text>
                      <Text as="p" fontWeight="semibold">{success.buyerUsername}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" tone="subdued">License Type</Text>
                      <Text as="p" fontWeight="semibold">{success.licenseType}</Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" tone="subdued">Purchase Date</Text>
                      <Text as="p" fontWeight="semibold">
                        {formatDate(new Date(success.soldAt))}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" tone="subdued">Support Until</Text>
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" fontWeight="semibold">
                          {formatDate(new Date(success.supportedUntil))}
                        </Text>
                        <Badge tone={success.supportActive ? "success" : "warning"}>
                          {success.supportActive ? "Active" : "Expired"}
                        </Badge>
                      </InlineStack>
                    </InlineStack>
                  </BlockStack>

                  <Divider />

                  {/* Next steps */}
                  <BlockStack gap="200">
                    <Text variant="headingSm" as="h3">What's unlocked:</Text>
                    <List type="bullet">
                      <List.Item>
                        ✅ <strong>Theme Downloads</strong> — Go to Dashboard to download the latest version
                      </List.Item>
                      <List.Item>
                        {success.supportActive
                          ? "✅ Priority Support — Active until " + formatDate(new Date(success.supportedUntil))
                          : "⚠️ Support Expired — Renew on Envato to re-activate"}
                      </List.Item>
                      <List.Item>
                        ✅ <strong>License Key</strong> — Use <code>{success.licenseKey}</code> when submitting support tickets
                      </List.Item>
                    </List>
                  </BlockStack>

                  <InlineStack gap="300">
                    <Button variant="primary" onClick={() => navigate("/app")}>
                      Go to Dashboard
                    </Button>
                    {!success.supportActive && (
                      <Button
                        url="https://themeforest.net/downloads"
                        external
                      >
                        Renew Support on Envato
                      </Button>
                    )}
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          ) : (
            /* Verify form */
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Enter Your ThemeForest Purchase Code
                </Text>
                <Text as="p" tone="subdued">
                  Your purchase code is a unique identifier (UUID format) found in your Envato downloads.
                  It looks like: <code>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>
                </Text>

                {error && (
                  <Banner
                    title="Verification failed"
                    tone="critical"
                    onDismiss={() => {}}
                  >
                    <p>{error}</p>
                  </Banner>
                )}

                <Form method="post">
                  <BlockStack gap="400">
                    <TextField
                      label="Purchase Code"
                      name="purchaseCode"
                      value={purchaseCode}
                      onChange={setPurchaseCode}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      helpText="Paste your full ThemeForest purchase code here"
                      autoComplete="off"
                      disabled={isSubmitting}
                      error={
                        actionData?.errorType === "INVALID_CODE"
                          ? "Invalid purchase code format"
                          : undefined
                      }
                    />

                    <InlineStack gap="300" blockAlign="center">
                      <Button
                        variant="primary"
                        submit
                        loading={isSubmitting}
                        disabled={!purchaseCode.trim()}
                        size="large"
                      >
                        {isSubmitting ? "Verifying..." : "Verify & Register"}
                      </Button>

                      {isSubmitting && (
                        <InlineStack gap="200" blockAlign="center">
                          <Spinner size="small" />
                          <Text as="span" tone="subdued">
                            Checking with Envato...
                          </Text>
                        </InlineStack>
                      )}
                    </InlineStack>
                  </BlockStack>
                </Form>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>

        {/* Help sidebar */}
        <Layout.Section variant="oneThird">
          <CalloutCard
            title="Where to find your purchase code"
            illustration="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            primaryAction={{
              content: "Open Envato Downloads",
              url: "https://themeforest.net/downloads",
              external: true,
            }}
          >
            <BlockStack gap="200">
              <Text as="p">
                1. Log in to <strong>themeforest.net</strong>
              </Text>
              <Text as="p">
                2. Click <strong>Downloads</strong> in the top menu
              </Text>
              <Text as="p">
                3. Find your theme purchase
              </Text>
              <Text as="p">
                4. Click <strong>"License certificate & purchase code"</strong>
              </Text>
              <Text as="p">
                5. Copy the <strong>Item Purchase Code</strong>
              </Text>
            </BlockStack>
          </CalloutCard>

          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Supported Themes</Text>
              <Text as="p" tone="subdued">
                This app supports all <strong>buddhathemes</strong> Shopify themes
                purchased on ThemeForest, including Lollipop and other themes in our catalog.
              </Text>
              <Button
                url="https://themeforest.net/user/buddhathemes/portfolio"
                external
                variant="plain"
              >
                View buddhathemes portfolio →
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
