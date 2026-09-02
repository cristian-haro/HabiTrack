---
name: real-estate-scraper
description: >-
  Extract and parse structured real estate data from Spanish property portals
  (Fotocasa, Habitaclia, Pisos.com, YaEncontre, and Idealista via bookmarklet).
  Use when extracting prices, surface areas (m²), rooms, bathrooms, addresses, coordinates,
  and photo galleries from property listings.
---

# Real Estate Scraper Skill for HabiTrack

This skill provides domain knowledge and parsing strategies for Spanish real estate portals to ensure high-fidelity extraction of property listings.

## Supported Portals & Strategies

### 1. Fotocasa (`fotocasa.es`)
- **Primary Method:** Parse `<script type="application/json" id="__initial_props__">`.
- **Key Entity Paths:**
  - `data.realEstateAdDetailEntityV2` or `data.realEstate`
  - Photos: `entity.multimedias` (filter by `type === 'image'`)
  - Features: `entity.features` (`PARKING`, `ELEVATOR`, `surface`, `rooms`, `bathrooms`)
  - Coordinates: `entity.address.coordinates.lat` / `lng`
  - Autonomous Community: `entity.address.autonomousCommunity`

### 2. Habitaclia & Pisos.com
- **Method:** Extract OpenGraph and Schema.org JSON-LD tags:
  - `<script type="application/ld+json">` with `@type: "SingleFamilyResidence"` or `"Apartment"`
  - Meta tags: `og:title`, `og:image`, `og:price:amount`, `og:description`

### 3. Idealista (`idealista.com`)
> [!IMPORTANT]
> Idealista enforces strict Cloudflare Bot Management (403 Forbidden) on cloud server requests.
> Direct scraping from backend servers (Vercel/AWS) will fail.

**Solution: 1-Click Client Bookmarklet**
To extract data directly from the user's authenticated browser session, generate or use the JavaScript bookmarklet:
```javascript
javascript:(function(){
    const data = {
        title: document.querySelector('.main-info__title-main')?.innerText.trim(),
        price: parseFloat(document.querySelector('.info-data-price')?.innerText.replace(/\D/g, '')),
        m2: parseFloat(document.querySelector('.info-features span')?.innerText),
        url: window.location.href,
        photos: Array.from(document.querySelectorAll('.carousel-photos img, .gallery-detail img')).map(img => img.src || img.dataset.src).filter(Boolean).join(', ')
    };
    navigator.clipboard.writeText(JSON.stringify(data));
    alert('¡Datos de la propiedad copiados al portapapeles!');
})();
```

## Validation
Always validate extracted data against `propertySchema` in [property.schema.js](file:///C:/Users/crist/Documents/GitHub/HabiTrack/src/schemas/property.schema.js) before storing in the database.
