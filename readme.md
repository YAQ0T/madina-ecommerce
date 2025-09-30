## eCommerce Project Documentation: "Al-Madina Al-Munawwara"

### 1. Introduction

"Al-Madina Al-Munawwara" is an eCommerce platform specialized in selling carpentry supplies, upholstery fabrics, and materials for sofa-making. The goal is to provide an easy and efficient online experience for customers to browse and order products across the West Bank and Israel.

### 2. Business Overview

- **Brand Name:** Al-Madina Al-Munawwara
- **Products:** Carpentry materials, upholstery fabrics, sofa-making supplies
- **Inventory:** In-stock and ready for online sale

### 3. Website Goals

- Sell products directly online
- Provide detailed product information
- Support two languages: Arabic and Hebrew
- Facilitate ordering and delivery within Palestine and Israel

### 4. Website Features

- Customer registration and login
- Shopping cart with online or cash-on-delivery payment
- Merchant dashboard for managing products and orders
- Product filtering by category, price, or type
- Bilingual support (Arabic + Hebrew)
- Live chat or WhatsApp support link
- Informational pages: About Us, FAQs, Terms, and Policies

### 5. Technology Stack

- **Frontend:** React.js
- **Backend:** Node.js (Express)
- **Database:** MongoDB or PostgreSQL (to be determined)
- **Hosting & Domain:** To be acquired later

### 6. Website Structure

- Home Page
- Products
- About Us
- Contact
- Login
- My Account
- FAQ
- Privacy Policy
- Terms & Conditions

### 7. Additional Notes

- No branding visuals or product images yet; to be added later
- Static content (About Us, policies) will be created based on client input
- Future expansion may include a mobile app and additional payment options

### 8. Image Utilities

To download all product and variant images currently stored in MongoDB, use the helper script located in the `server` project:

```bash
cd server
npm run download:images
```

The script collects every unique image URL from products and variants, then streams them into `server/downloads/images` by default. You can override the destination folder or control concurrency using command-line flags:

```bash
node scripts/download-images.js --out ./my-folder --concurrency 8
```

If any downloads fail, the script exits with a non-zero status so it can be used in automated workflows.

### 9. Exporting Image Manifests

To generate a quick reference of which documents own which image URLs, export manifest files with the accompanying script:

```bash
cd server
npm run export:image-manifests
```

By default the script writes two JSON Lines files under `server/downloads/manifests/`:

- `products.jsonl` — each line is a JSON object shaped like `{ "_id": "<productId>", "images": ["<url>", ...] }`.
- `variants.jsonl` — each line uses the same structure for variant documents.

Every JSON object appears entirely on a single line so it's easy to process with standard command-line tools. You can customize the output paths via CLI flags:

```bash
node scripts/export-image-manifests.js --product-out ./manifests/products.jsonl --variant-out ./manifests/variants.jsonl
```

The command exits with a non-zero code if either manifest cannot be written, which makes it safe to plug into automated workflows or CI jobs.
