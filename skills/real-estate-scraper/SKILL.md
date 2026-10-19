---
name: real-estate-scraper
description: Extract and parse structured real estate listings from Spanish property portals (Fotocasa, Habitaclia, Pisos.com, YaEncontre, and Idealista via bookmarklet). Use when importing property prices, dimensions, addresses, coordinates, and photo galleries into HabiTrack.
---

# Real Estate Scraper

Provides extraction rules, selectors, and fallback strategies for ingesting property listings from leading Spanish real estate web portals.

## When to Use

- Parsing raw HTML or API payloads from real estate portals into structured JSON.
- Troubleshooting scraping failures caused by anti-bot measures or DOM changes.
- Updating or extending bookmarklet ingestion scripts.
- Normalizing property data against `propertySchema`.

## Steps

### 1. Identify Target Portal & Method
Select the appropriate extraction pipeline based on portal domain:
- **Fotocasa (`fotocasa.es`):** Hydration JSON extraction.
- **Habitaclia & Pisos.com:** OpenGraph meta tags and Schema.org JSON-LD.
- **Idealista (`idealista.com`):** Client-side bookmarklet (bypasses Cloudflare).

### 2. Parse Listing Data
1. **Fotocasa:**
   - Target `<script type="application/json" id="__initial_props__">`.
   - Extract `realEstateAdDetailEntityV2` or `realEstate` object.
   - Filter photos by `type === 'image'`.
2. **Habitaclia / Pisos.com:**
   - Extract `<script type="application/ld+json">` with `@type: "SingleFamilyResidence"` or `"Apartment"`.
   - Fallback to OpenGraph tags: `og:title`, `og:image`, `og:price:amount`.
3. **Idealista Bookmarklet:**
   - Execute extraction script in the user's active browser session to overcome Cloudflare bot blocking.
   - Copy structured payload to clipboard and ingest via `/api/propiedades/import`.

### 3. Schema Normalization & Validation
1. Validate extracted payload strictly against `propertySchema` from `src/schemas/property.schema.js`.
2. Ensure mandatory fields are present and typed:
   - `precio`: numeric positive value.
   - `superficie_m2`: numeric.
   - `titulo`: non-empty string.
   - `enlace`: valid URI string.

## Gotchas

- **Idealista anti-bot protection**: Server-side HTTP requests to `idealista.com` will fail with 403 Forbidden due to Cloudflare Bot Management. Always route Idealista imports through the client bookmarklet or browser extension.
- **Dynamic CSS class names**: Major portals frequently cycle randomized CSS class names. Prioritize structured JSON-LD (`application/ld+json`) and meta tags over CSS query selectors.
