# How to integrate wdt-license-check into your theme

## Step 1 — Add the snippet file

Copy `wdt-license-check.liquid` into your theme's snippets folder:

```
your-theme/
└── snippets/
    └── wdt-license-check.liquid   ← paste here
```

## Step 2 — Call it in theme.liquid

Open `layout/theme.liquid` and add this line just before the closing `</body>` tag:

```liquid
  {%- comment -%} WDT License Verification {%- endcomment -%}
  {% render 'wdt-license-check' %}

</body>
```

### Full example of theme.liquid bottom section:

```liquid
    {{ content_for_layout }}

  </main>

  {% sections 'footer-group' %}

  {%- comment -%} WDT License Verification Banner {%- endcomment -%}
  {% render 'wdt-license-check' %}

</body>
</html>
```

---

## How it works

| Metafield State | What Visitor Sees |
|---|---|
| `wdt_licenses.verified` = `"true"` | Nothing — theme works normally |
| Metafield missing (not installed app yet) | Fixed top banner: "Theme license not verified" |
| App uninstalled (metafield deleted) | Banner reappears |

---

## Metafield Details

- **Namespace:** `wdt_licenses`
- **Key:** `verified`  
- **Type:** `single_line_text_field`
- **Value when active:** `"true"`
- **Owner:** Shop (not product/variant/customer)

This is set automatically by the WDT License Verifier app when the
merchant enters a valid ThemeForest purchase code.

---

## Testing Locally

To test the banner:
1. In Shopify Admin → Content → Metafields → Shop
2. Delete the `wdt_licenses.verified` metafield
3. Reload storefront → banner appears
4. Go to app → Register License → banner disappears

To test verified state:
1. Shopify Admin → Content → Metafields → Shop → Add definition
2. Namespace: `wdt_licenses`, Key: `verified`, Value: `true`
3. Reload storefront → banner gone

---

## Customizing the Banner

Edit `snippets/wdt-license-check.liquid`:

- **Background color:** Change `#1a1a2e` in `background-color`
- **Text:** Edit the message inside `.wdt-message` span
- **Button color:** Change `#ffd700` in `.wdt-verify-btn`
- **App URL:** Update the `href` in `.wdt-verify-btn` anchor to match your app handle

Current app link format:
```
/admin/apps/wdt-license-verifier
```
Replace `wdt-license-verifier` with your actual Shopify app handle
(found in Partners Dashboard → App → App handle).
