# Research: Demo Channel Data Generator

**Feature Branch**: `001-channel-data-generator`
**Date**: 2026-03-16
**Status**: Complete — all items resolved

## R-001: Client-Side File Format Handling

**Decision**: Use SheetJS (`xlsx`) loaded via CDN for all CSV and XLSX read/write operations.

**Rationale**: SheetJS is the de facto standard for browser-based spreadsheet I/O. It supports both CSV and XLSX formats with a unified API (`XLSX.read()` / `XLSX.utils.sheet_to_json()` / `XLSX.write()`), handles encoding edge cases, and has no server dependency. The library is mature (10+ years), actively maintained, and widely deployed.

**Alternatives considered**:
- **PapaParse** (CSV only): Excellent CSV parser, but cannot handle XLSX. Would require a second library for XLSX, adding complexity.
- **ExcelJS**: Full-featured but significantly larger (~1.5 MB) and designed primarily for Node.js. Browser bundle is less optimized.
- **Native FileReader + manual CSV parsing**: Would handle CSV but not XLSX. Manual CSV parsing is error-prone for edge cases (embedded commas, quotes, newlines).

---

## R-002: Client-Side ZIP Packaging

**Decision**: Use JSZip loaded via CDN for creating ZIP archives in the browser.

**Rationale**: JSZip is lightweight (~100 KB), purpose-built for browser ZIP creation, supports `Blob` output for download triggering, and has no dependencies. It handles the requirement to package the updated master shipment file and all channel files into a single ZIP (FR-026).

**Alternatives considered**:
- **fflate**: Faster compression but less ergonomic API for file-by-file assembly. Marginal performance difference is irrelevant for the small file sizes in this use case.
- **Archiver**: Node.js-only, not suitable for browser.

---

## R-003: Client-Side File Download Triggering

**Decision**: Use FileSaver.js via CDN for triggering browser downloads of generated files.

**Rationale**: FileSaver.js provides a consistent `saveAs(blob, filename)` API across browsers, handling vendor-specific download quirks. It's tiny (~5 KB) and well-tested.

**Alternatives considered**:
- **Manual `<a>` element click trick**: Works in most modern browsers but has inconsistencies with filename handling in Safari and Edge Legacy. FileSaver.js wraps this pattern with fallbacks.
- **Native `showSaveFilePicker()` (File System Access API)**: Only available in Chromium-based browsers. Not cross-browser compatible.

---

## R-004: Date Resolution Logic (Pacific Standard Time)

**Decision**: Use JavaScript `Intl.DateTimeFormat` with `timeZone: 'America/Los_Angeles'` to resolve the current date in Pacific time.

**Rationale**: The spec requires PST defaults for `OrderDate` and `ShipmentDate` (NFR-005a). `Intl.DateTimeFormat` with IANA timezone is supported in all evergreen browsers and correctly handles DST transitions (Pacific Standard Time vs Pacific Daylight Time). No external date library needed.

**Alternatives considered**:
- **Luxon / date-fns-tz**: Full-featured timezone libraries, but adding a dependency for a single timezone operation is excessive.
- **Hardcoded UTC-8 offset**: Incorrect — would not handle PDT periods (UTC-7), violating the "Pacific Standard Time" intent which likely means the `America/Los_Angeles` zone.

**Note**: The spec says "Pacific Standard Time" in multiple places. This will be interpreted as the `America/Los_Angeles` IANA timezone (which includes both PST and PDT) rather than a fixed UTC-8 offset, since the tool may be used year-round.

---

## R-005: Order Total Constraint Solver

**Decision**: Implement an iterative price/quantity adjustment algorithm that generates line items within bounds and then adjusts the final line to meet the order total constraint.

**Rationale**: FR-014 requires order totals to fall within `$45–$150` for Ecommerce (with 2× and 4× multipliers for Retail and Wholesale). The algorithm: (1) generate N styles (1–3) with random quantities (1–4 for Ecommerce), (2) assign prices from the `$12–$80` range, (3) calculate running total, (4) if total is below minimum, increase quantity on last line or add a style, (5) if above maximum, reduce price or quantity. This is a bounded search that converges quickly given the ranges involved.

**Alternatives considered**:
- **Rejection sampling** (generate randomly, discard if out of range): Simple but wasteful — many rejections expected when total range is narrow relative to price range.
- **Linear programming**: Overkill for this scale (1–3 items, well-bounded ranges).

---

## R-006: Unique ID Generation (ChannelOrderID, Tracking Numbers)

**Decision**: Use `crypto.getRandomValues()` for generating unique `ChannelOrderID` values and tracking numbers.

**Rationale**: `crypto.getRandomValues()` provides cryptographically strong randomness in all evergreen browsers. For `ChannelOrderID`, generate a UUID-like string. For tracking numbers, generate format-compliant values per carrier (UPS: `1Z` + 16 alphanumeric; FedEx: 12 or 15 digits). Collision checking against the existing dataset satisfies FR-022's uniqueness requirement.

**Alternatives considered**:
- **`Math.random()`**: Not cryptographically secure and has a small but non-zero collision risk. `crypto.getRandomValues()` is safer and equally easy to use.
- **UUID library (e.g., `uuid`)**: Adds another CDN dependency for a trivial operation — not justified.

---

## R-007: Customer-Type Pricing Rules (Retail / Wholesale)

**Decision**: Implement pricing as multiplier functions applied to the Ecommerce baseline.

**Rationale**: Per the raw design spec:
- **Ecommerce**: Base price range $12–$80, quantity 1–4, order total $45–$150
- **Retail**: Price = MSRP × 0.8, quantity and order amount are 2× Ecommerce baseline. Effective quantity range: 2–8 per line, order total range: $90–$300
- **Wholesale**: Price = WSP (wholesale price), quantity and order amount are 4× Ecommerce baseline. Effective quantity range: 4–16 per line, order total range: $180–$600

**Note**: MSRP and WSP are not defined in the SKU source schema. Implementation will interpret MSRP as the generated line price (the same price used for Ecommerce) and the 0.8 multiplier will be applied. WSP will be interpreted as a lower wholesale rate (~50–60% of Ecommerce price). This interpretation aligns with typical retail/wholesale pricing tiers and produces realistic demo data.

---

## R-008: SKU Distribution Strategy

**Decision**: Use a shuffled round-robin approach for SKU selection to maximize spread.

**Rationale**: FR-012 requires SKU usage to be "spread across the dataset rather than concentrating repeatedly on a small subset." The approach: (1) load all SKUs into an array, (2) shuffle the array, (3) draw sequentially with round-robin reset when exhausted, (4) within a single order, ensure no duplicate SKU (skip and draw next). This produces maximum spread with O(n) time complexity.

**Alternatives considered**:
- **Purely random selection**: Could concentrate usage on a few SKUs by chance, violating FR-012's spirit.
- **Weighted random with usage tracking**: More complex, slower, and unnecessary for the ~60 orders generated per run.

---

## R-009: Progressive Enhancement and Error Display

**Decision**: Processing results (validation errors, skip reports, underfilled-date reports, processing summaries) will be displayed in a dedicated results panel within the page, using semantic HTML and ARIA live regions.

**Rationale**: The constitution requires progressive enhancement and accessibility. Using an `aria-live="polite"` region for results ensures screen readers announce completion/errors. No external notification library needed — simple DOM updates with appropriate ARIA attributes.

**Alternatives considered**:
- **Browser `alert()` / `confirm()`**: Blocks the UI thread, not accessible, poor UX.
- **Toast notification library**: Adds a dependency; results may be longer than a toast can display.
