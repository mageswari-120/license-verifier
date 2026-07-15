/**
 * Seed — buddhathemes ThemeForest Shopify themes
 * Run: npx prisma db seed
 *
 * Update these with your REAL ThemeForest item IDs and download URLs
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding buddhathemes theme catalog...");

  // ⚠️ Replace these with your actual ThemeForest item IDs
  // Find them in: themeforest.net → your item → the number in the URL
  const themes = [
    {
      id: 11111111, // ← Replace with actual ThemeForest item ID
      name: "Lollipop - Multipurpose Shopify Theme",
      slug: "lollipop",
      storefront: "buddhathemes",
      version: "2.1.0",
      // Replace with your actual download URL (S3, Cloudways storage, etc.)
      downloadUrl: "https://your-storage.com/downloads/lollipop-v2.1.0.zip",
      active: true,
    },
    {
      id: 22222222, // ← Replace with actual ThemeForest item ID
      name: "Elegance - Premium Shopify Theme",
      slug: "elegance",
      storefront: "buddhathemes",
      version: "1.5.0",
      downloadUrl: "https://your-storage.com/downloads/elegance-v1.5.0.zip",
      active: true,
    },
    // Add more themes here...
  ];

  for (const theme of themes) {
    await db.themeItem.upsert({
      where: { id: theme.id },
      create: theme,
      update: {
        version: theme.version,
        downloadUrl: theme.downloadUrl,
        updatedAt: new Date(),
      },
    });
    console.log(`✓ ${theme.name} (ID: ${theme.id})`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
