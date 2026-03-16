# UI Contracts: Demo Channel Data Generator

**Feature Branch**: `001-channel-data-generator`
**Date**: 2026-03-16

This document defines the user-facing interface contracts for the single-page static web app.

---

## Page Contract: `index.html`

### Section 1 — Sales Order Generation

#### Input Controls

| Control ID | Type | Label | Required | Constraints |
|------------|------|-------|----------|-------------|
| `customer-file` | `<input type="file">` | Customer Source File | ✅ | Accept: `.csv, .xlsx` |
| `mapping-file` | `<input type="file">` | Customer-Channel Mapping File | ✅ | Accept: `.csv, .xlsx` |
| `sku-file` | `<input type="file">` | SKU Source File | ✅ | Accept: `.csv, .xlsx` |
| `order-date` | `<input type="date">` | Order Date | ❌ | Default: current PST date; validated on submit |
| `shipment-date` | `<input type="date">` | Shipment Date | ❌ | Default: current PST date + 1 day; validated on submit |
| `order-output-format` | `<select>` | Sales Order Output Format | ✅ | Options: `CSV`, `XLSX`; default: `CSV` |
| `generate-btn` | `<button>` | Generate Sales Orders | — | Disabled until all 3 files selected |

#### Output Behavior

| Event | Output | Delivery |
|-------|--------|----------|
| Success | Sales order file in selected format | Browser download via FileSaver.js |
| Success | Processing summary | Displayed in `#order-results` panel |
| Validation error | Error message(s) | Displayed in `#order-results` panel with `role="alert"` |
| Skipped customers | Skip report table | Appended to `#order-results` panel |
| Underfilled dates | Underfill report | Appended to `#order-results` panel |

#### Results Panel: `#order-results`

```html
<div id="order-results" role="status" aria-live="polite">
  <!-- Populated dynamically after generation -->
  <!-- Contains: summary stats, skip report, underfill report, error messages -->
</div>
```

---

### Section 2 — Shipment Processing

#### Input Controls

| Control ID | Type | Label | Required | Constraints |
|------------|------|-------|----------|-------------|
| `shipment-master-file` | `<input type="file">` | Master Shipment File | ✅ | Accept: `.csv, .xlsx` |
| `shipment-output-format` | `<select>` | Shipment Output Format | ✅ | Options: `CSV`, `XLSX`; default: `XLSX` |
| `process-btn` | `<button>` | Process Shipments | — | Disabled until file selected |

#### Output Behavior

| Event | Output | Delivery |
|-------|--------|----------|
| Success | ZIP file containing: updated master + per-channel files | Browser download via FileSaver.js |
| Success | Processing summary | Displayed in `#shipment-results` panel |
| Validation error | Error message(s) | Displayed in `#shipment-results` panel with `role="alert"` |

#### Results Panel: `#shipment-results`

```html
<div id="shipment-results" role="status" aria-live="polite">
  <!-- Populated dynamically after processing -->
  <!-- Contains: rows processed, tracking generated/reused, channel files list, ZIP filename -->
</div>
```

---

## Processing Summary Contract (FR-027)

The processing summary displayed in the results panel MUST contain the following fields:

### Sales Order Summary

| Field | Description |
|-------|-------------|
| Resolved Date Range | Start and end dates of the processing window |
| Orders Generated per Date | Count by date (e.g., `2026-03-14: 20, 2026-03-15: 18`) |
| Total Rows Generated | Total number of output rows (orders × lines) |
| Skipped Customers | Table: `CustomerCode`, `CustomerName`, `Reason` |
| Underfilled Dates | Table: `Date`, `Expected`, `Generated` |

### Shipment Processing Summary

| Field | Description |
|-------|-------------|
| Total Rows Processed | Count of all rows in master dataset |
| Tracking Numbers Generated | Count of newly generated tracking numbers |
| Tracking Numbers Reused | Count of pre-existing tracking numbers kept |
| Channel Files Produced | List of channel filenames |
| ZIP Filename | Name of the output ZIP file |

---

## Error Contract

All validation errors follow this structure when displayed in the results panel:

```text
[ERROR] {category}: {detail}
```

Categories:
- `MISSING_FILE` — A required input file was not uploaded
- `INVALID_FORMAT` — File is not a valid CSV or XLSX
- `MISSING_COLUMN` — Required column missing from input file (lists column name and file)
- `INVALID_DATE` — Provided date value does not parse as a valid date
- `INSUFFICIENT_DATA` — Not enough data to generate any orders (e.g., 0 eligible customers after skip rules)

---

## Accessibility Contract

| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | All controls reachable via Tab; buttons activated via Enter/Space |
| Form labels | Every `<input>` and `<select>` has a visible `<label>` with `for` attribute |
| Error announcements | Error panels use `role="alert"` for immediate screen reader announcement |
| Status updates | Results panels use `role="status"` + `aria-live="polite"` |
| Focus management | After form submission, focus moves to results panel |
| Color contrast | All text meets WCAG 2.2 AA contrast ratio (≥ 4.5:1 for normal text, ≥ 3:1 for large text) |
| Fieldset grouping | Each section wrapped in `<fieldset>` with `<legend>` |
