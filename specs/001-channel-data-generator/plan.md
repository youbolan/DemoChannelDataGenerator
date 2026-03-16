# Implementation Plan: Demo Channel Data Generator

**Branch**: `001-channel-data-generator` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-channel-data-generator/spec.md`

## Summary

Build a vanilla static web app (HTML, CSS, JavaScript only) that generates realistic demo sales-order and shipment data files for multi-channel commerce testing. The app runs entirely in the browser using SheetJS for CSV/XLSX I/O and JSZip for ZIP packaging, with no server-side processing. The single-page UI provides two sections: Section 1 accepts three source files (customer, customer-channel mapping, SKU) plus optional dates and format selectors to generate a sales-order output file; Section 2 accepts a master shipment dataset and produces an updated master file, per-channel shipment files, and a ZIP package.

## Technical Context

**Language/Version**: JavaScript (ES2020+), HTML5, CSS3 — no transpilation step
**Primary Dependencies**: SheetJS (`xlsx`) via CDN for CSV/XLSX read/write; JSZip via CDN for ZIP creation; FileSaver.js via CDN for client-side download triggers
**Storage**: N/A — all processing is in-memory; no database, no localStorage persistence required
**Testing**: Manual browser testing for acceptance scenarios; optional Playwright or Cypress for automated UI/integration tests (deferred to tasks phase)
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Edge, Safari — latest 2 major versions), responsive layout
**Project Type**: Static web app (single HTML page)
**Performance Goals**: Full 3-day window generation + shipment packaging completes in < 60 seconds in the browser on a mid-tier workstation (per NFR-003)
**Constraints**: No backend server, no build toolchain, no framework; all client-side; < 2 MB total payload (HTML + CSS + JS + CDN libs)
**Scale/Scope**: Single-user tool generating up to ~60 orders (3 days × 20) per run with corresponding shipment outputs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Static-First Architecture**: ✅ PASS — The spec mandates a vanilla static web app with no server runtime. All file I/O is client-side via SheetJS and JSZip. HTML/CSS/JS files can be served from any static host or opened directly from the file system.

- **Accessibility as a Release Gate**: ✅ PASS — The single-page form UI will use semantic HTML (`<form>`, `<fieldset>`, `<legend>`, `<label>`, `<button>`), proper heading hierarchy, visible focus indicators, aria attributes for status/error regions, and validated WCAG 2.2 AA color contrast ratios. Keyboard navigation will be verified manually. Automated checks via Lighthouse accessibility audit.

- **Performance Budgets**: ✅ PASS — Feature-level budgets:
  - LCP ≤ 2.5s (static HTML, no dynamic content blocking first render)
  - INP ≤ 200ms (all interactions are form inputs and button clicks)
  - CLS ≤ 0.1 (no dynamic layout shifts — all content is statically positioned)
  - Total JS payload: SheetJS (~500 KB) + JSZip (~100 KB) + FileSaver (~5 KB) + app JS (~50 KB) ≈ < 700 KB
  - Measurement: Lighthouse CLI on representative page load

- **Privacy and Security by Default**: ✅ PASS — No secrets in client code. No authentication. No data sent to external servers — all processing is local. Third-party scripts justified: SheetJS (file format parsing, no data exfil), JSZip (archive creation, no network), FileSaver.js (download trigger, no network). CDN scripts will use `integrity` attributes (SRI) when available. No user data persisted.

- **Verifiable Quality Before Publish**: ✅ PASS — Acceptance scenarios from the spec (SC-001 through SC-009) will be mapped to manual test procedures documented in tasks. Unit tests for core logic (date resolution, order generation, pricing rules, tracking assignment) will use a simple in-browser test harness or deferred to Playwright/Cypress integration. Preview validation: outputs will be visually inspectable in the browser before download.

## Project Structure

### Documentation (this feature)

```text
specs/001-channel-data-generator/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
index.html               # Single-page app entry point
css/
└── styles.css           # All styling
js/
├── app.js               # Main entry — UI wiring, event handlers
├── dateResolver.js      # Order date range resolution logic (FR-002)
├── orderGenerator.js    # Sales order generation engine (FR-003 through FR-018)
├── addressEngine.js     # Ship-to / Bill-to population and fallback (FR-009, FR-010)
├── pricingEngine.js     # Price, quantity, totals, customer-type rules (FR-013, FR-014, FR-015)
├── shipmentProcessor.js # Shipment tracking, carrier, channel split (FR-019 through FR-026)
├── fileIO.js            # SheetJS wrappers for read/write CSV/XLSX
├── validators.js        # Schema validation, input validation (FR-018, FR-028)
└── utils.js             # Shared helpers (unique ID gen, random, formatting)
```

**Structure Decision**: Single-project flat structure. No backend, no test directory initially (tests will be inline or use a lightweight browser harness). Each JS module maps to a distinct responsibility from the spec's functional requirements, keeping files focused and independently testable.

## Complexity Tracking

> No Constitution violations. Table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
