# Tasks: Demo Channel Data Generator

**Input**: Design documents from `/specs/001-channel-data-generator/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Story-specific tests are not explicitly requested in the spec. Constitution-driven verification (accessibility, performance, privacy/security checks) is REQUIRED and included in the Polish phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Static web app**: `index.html`, `css/`, `js/` at repository root
- CDN dependencies loaded in `index.html` `<head>`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, CDN dependencies, and base file structure

- [X] T001 Create project directory structure with `css/` and `js/` folders per plan.md
- [X] T002 Create `index.html` with CDN script tags for SheetJS (`xlsx`), JSZip, and FileSaver.js, plus `<script>` tags for all app JS modules in dependency order
- [X] T003 [P] Create `css/styles.css` with base layout, form styling, section separation, accessible color palette (WCAG 2.2 AA contrast), focus indicators, and responsive design
- [X] T004 [P] Create `js/utils.js` with shared helpers: `generateUUID()` using `crypto.getRandomValues()`, `sanitizeFilename()` replacing invalid chars with underscores, `formatDate(date)` for `yyyyMMdd`, and `randomInt(min, max)` utility

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure modules that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `js/fileIO.js` with SheetJS wrapper functions: `readFile(file)` returning array-of-objects via `XLSX.read()` + `XLSX.utils.sheet_to_json()`, `writeFile(data, headers, filename, format)` generating CSV or XLSX Blob via `XLSX.utils.json_to_sheet()` + `XLSX.write()`, and `downloadFile(blob, filename)` using `saveAs()` from FileSaver.js
- [X] T006 [P] Create `js/validators.js` with input validation functions: `validateRequiredFiles(files)` checking all 3 files present, `validateColumns(data, requiredColumns, fileName)` checking column headers exist, `validateDate(dateStr)` parsing and validating date strings, `validateSalesOrderSchema(rows, expectedHeaders)` verifying exact header names/order/count per canonical schema from spec.md, and error reporting using the error contract categories (`MISSING_FILE`, `INVALID_FORMAT`, `MISSING_COLUMN`, `INVALID_DATE`, `INSUFFICIENT_DATA`)
- [X] T007 [P] Create `js/dateResolver.js` with `resolveDateRange(orderDate)` that takes an optional order date string, defaults to current `America/Los_Angeles` date via `Intl.DateTimeFormat` if omitted, applies the weekday rules (Mon→Sat-Sun-Mon window; Tue-Sun→single date), and returns an array of date objects; also `resolveShipmentDate(shipmentDate)` defaulting to PST current date + 1 day

**Checkpoint**: Foundation ready — file I/O, validation, and date resolution available for all user stories

---

## Phase 3: User Story 1 — Generate Sales-Order Exports from Source Files (Priority: P1) 🎯 MVP

**Goal**: User uploads 3 source files and receives a complete sales-order output file following all business rules

**Independent Test**: Upload valid customer, mapping, and SKU files → verify output contains up to 20 orders per date, valid sequential order numbers, complete addresses, correct totals within range, no SKU repeats within orders, and exact canonical header schema

### Implementation for User Story 1

- [X] T008 [P] [US1] Create `js/addressEngine.js` with `populateShipTo(customerRow)` mapping 14 shipping fields from customer source with fallback hierarchy (ShipName→CustomerName, ShipCompany→CustomerName, Ship*→BillTo*), and `populateBillTo(shipToData)` copying from ShipTo values per FR-010; ensure no required address field is ever empty
- [X] T009 [P] [US1] Create `js/pricingEngine.js` with Ecommerce baseline logic: `generateLineItems(numStyles, skus, customerType)` producing 1–3 lines with quantities (1–4 Ecommerce), prices ($12–$80), and `ExtAmount = Qty × Price`; `calculateOrderTotals(lines, customerType)` computing `SubTotalAmount`, `DiscountAmount` (35% of orders get discount, rate=0), `TaxAmount` (always 0), `ShippingAmount` (90% of orders, $0–$18), `TotalAmount`; iterative adjustment to keep `TotalAmount` within $45–$150 for Ecommerce; include `PaidAmount=0`, `Balance=TotalAmount`
- [X] T010 [US1] Create `js/orderGenerator.js` with main generation pipeline: load and validate all 3 source files via `fileIO.js` and `validators.js`, build customer-to-mapping lookup (skip 0 or 2+ matches per FR-008a), resolve date range via `dateResolver.js`, for each date generate up to 20 orders by cycling eligible customers, assign `OrderNumber` as `yyyyMMdd-seq` starting at 1 (FR-004/FR-004a), generate unique `ChannelOrderID` via `utils.generateUUID()`, use shuffled round-robin SKU selection from `utils.js` for spread (FR-012), call `addressEngine.js` for address population, call `pricingEngine.js` for line items and totals, set default values (`OrderType=1`, `OrderStatus=0`, `Currency=USD`, `UOM=EA`, `Stockable=TRUE`, `Costable=TRUE`, `Taxable=TRUE`, `IsProfit=TRUE`, `ShipQty=0`, `OpenQty=OrderQty`, `Financial Status=' '`, `Fulfillment Status=' '`), collect skip reports and underfill reports, return complete row array and summary
- [X] T011 [US1] Add output validation in `js/orderGenerator.js`: after generation, call `validators.validateSalesOrderSchema()` to verify exact header match (57 columns per canonical schema), verify order number sequences are gap-free per date, verify no blank required address fields, verify no SKU repeats within same order, verify all order totals within allowed range; fail with clear validation feedback if any check fails (FR-018, FR-028)
- [X] T012 [US1] Wire Section 1 UI in `js/app.js`: add event listeners for the 3 file inputs (`customer-file`, `mapping-file`, `sku-file`), enable/disable `generate-btn` based on all files selected, read `order-date` and `shipment-date` inputs (default via `dateResolver.js`), read `order-output-format` select, on Generate click call `orderGenerator.js` pipeline, write output via `fileIO.writeFile()` + `fileIO.downloadFile()`, render processing summary (date range, orders per date, total rows, skip report table, underfill report) in `#order-results` div, render errors with `role="alert"`, move focus to `#order-results` after completion

**Checkpoint**: User Story 1 fully functional — user can upload files, generate sales orders, download output, and see processing summary

---

## Phase 4: User Story 2 — Produce Shipment Files and ZIP Package (Priority: P2)

**Goal**: User uploads a master shipment dataset and receives an updated master file, per-channel files, and a ZIP package

**Independent Test**: Upload a shipment dataset with mixed channels and partially missing tracking numbers → verify updated master has tracking filled, channel files use correct header schema, order groups stay intact, and ZIP contains all files

### Implementation for User Story 2

- [X] T013 [P] [US2] Create `js/shipmentProcessor.js` with `processShipments(masterData, shipmentDate, outputFormat)`: group rows by `ChannelOrderID` into order groups (FR-019), for each group assign carrier (`UPS` or `FedEx` randomly if not set, FR-021), reuse existing tracking number if any row in group has one, otherwise generate new tracking per carrier format (UPS: `1Z`+16 alphanum, FedEx: 12 or 15 digits) ensuring global uniqueness (FR-022), set `Ship Qty = OrderQty` (FR-024), preserve original row order and schema (FR-020), return updated master data and per-channel data splits
- [X] T014 [US2] Add channel splitting and ZIP packaging in `js/shipmentProcessor.js`: split rows by `Channel` value (FR-023), build channel output rows using exact shipment header schema (16 columns: `Channel Order ID`, `Ship Date`, `TimeZone=UTC-8`, `Carrier`, `Tracking Number`, `Shipping Service`, `2nd Tracking Number`, `Package`, `Shipping Fee`, `Weight`, `Length`, `Width`, `Height`, `Note`, `SKU`, `Ship Qty`), derive channel filenames from `Channel` value with `utils.sanitizeFilename()` (FR-025), create ZIP via JSZip containing updated master file + all channel files (FR-026), generate processing summary (total rows, tracking generated/reused, channel files list, ZIP filename) per FR-027
- [X] T015 [US2] Wire Section 2 UI in `js/app.js`: add event listener for `shipment-master-file` input, enable/disable `process-btn` based on file selected, read `shipment-output-format` select, on Process click call `shipmentProcessor.processShipments()`, download ZIP via `fileIO.downloadFile()`, render shipment processing summary in `#shipment-results` div, render errors with `role="alert"`, move focus to `#shipment-results` after completion

**Checkpoint**: User Stories 1 AND 2 both work independently — full end-to-end flow from order generation to shipment packaging

---

## Phase 5: User Story 3 — Support Repeatable Runs with Customer-Type Rules (Priority: P3)

**Goal**: Generator honors weekday restrictions and pricing/quantity behavior for Ecommerce, Retail, and Wholesale customers

**Independent Test**: Run on different weekdays with mixed customer types → verify Retail only on Monday (2× qty/pricing), Wholesale only on Wednesday (4× qty/pricing), Ecommerce on all eligible dates, excluded types produce no orders on ineligible days

### Implementation for User Story 3

- [X] T016 [US3] Add customer-type scheduling filter in `js/orderGenerator.js`: for each date in the resolved range, filter eligible customers by type — Ecommerce allowed on all dates (FR-016), Retail only on Monday, Wholesale only on Wednesday; if no eligible customers for a type on a date, that type produces no orders for that date; ensure daily cap and sequence rules still apply across mixed types
- [X] T017 [US3] Add Retail pricing rules in `js/pricingEngine.js`: when `customerType === 'Retail'`, multiply base quantity range by 2× (effective range 2–8 per line), apply `Price = basePrice × 0.8` (MSRP discount), multiply order total range by 2× (effective $90–$300), ensure iterative adjustment solver handles the Retail ranges
- [X] T018 [US3] Add Wholesale pricing rules in `js/pricingEngine.js`: when `customerType === 'Wholesale'`, multiply base quantity range by 4× (effective range 4–16 per line), apply WSP pricing (~50–60% of Ecommerce price per research.md R-007), multiply order total range by 4× (effective $180–$600), ensure iterative adjustment solver handles the Wholesale ranges

**Checkpoint**: All user stories independently functional — full customer-type behavior with weekday restrictions and pricing rules

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Constitution compliance verification, quality improvements, and final validation

- [ ] T019 [P] Accessibility verification: run Lighthouse accessibility audit on `index.html`, verify all `<input>` and `<select>` elements have `<label for="">` attributes, verify `<fieldset>`/`<legend>` wrapping for each section, verify `role="alert"` and `aria-live="polite"` on results panels, manual keyboard walkthrough (Tab through all controls, Enter/Space to activate buttons, verify visible focus indicators), verify color contrast ≥ 4.5:1 for normal text
- [ ] T020 [P] Performance budget validation: measure page load with Lighthouse (target LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1), verify total JS payload < 700 KB, verify full 3-day generation + shipment processing completes in < 60 seconds in browser (NFR-003)
- [ ] T021 [P] Security hardening: verify no secrets in client code, add `integrity` (SRI) attributes to CDN `<script>` tags where available, verify no data is sent to external servers, review all third-party scripts (SheetJS, JSZip, FileSaver.js) for network calls
- [ ] T022 Run `quickstart.md` validation: follow the quickstart guide end-to-end with sample data files to confirm all documented steps produce expected outcomes
- [ ] T023 Code cleanup: review all JS modules for consistent error handling, remove any debug logging, ensure consistent code style across all files, verify all functions have clear JSDoc comments

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion — can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on User Story 1 (Phase 3) completion — extends `orderGenerator.js` and `pricingEngine.js`
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — no dependencies on US1 (operates on independently uploadable shipment data)
- **User Story 3 (P3)**: Depends on User Story 1 (Phase 3) — extends `orderGenerator.js` and `pricingEngine.js` created in US1

### Within Each User Story

- Engines/modules before main pipeline
- Main pipeline before UI wiring
- Validation integrated into pipeline before UI
- Story complete before moving to next priority

### Parallel Opportunities

- T003 and T004 can run in parallel (different files)
- T005, T006, T007 can all run in parallel (different files, no interdependencies)
- T008 and T009 can run in parallel (different files)
- T013 can start as soon as Phase 2 is complete (independent of US1)
- T019, T020, T021 can all run in parallel (different concerns)

---

## Parallel Example: User Story 1

```bash
# Launch engine modules in parallel (different files, no dependencies):
Task T008: "Create js/addressEngine.js"
Task T009: "Create js/pricingEngine.js"

# Then sequentially:
Task T010: "Create js/orderGenerator.js" (depends on T008, T009)
Task T011: "Add output validation" (depends on T010)
Task T012: "Wire Section 1 UI" (depends on T010, T011)
```

## Parallel Example: User Story 2

```bash
# Can start immediately after Phase 2 (parallel with US1 if desired):
Task T013: "Create js/shipmentProcessor.js"
Task T014: "Add channel splitting and ZIP" (depends on T013)
Task T015: "Wire Section 2 UI" (depends on T014)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T007) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T008–T012)
4. **STOP and VALIDATE**: Upload test files, verify output file downloads with correct schema, addresses, totals
5. Deploy/demo if ready — MVP delivers core sales order generation

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (adds shipment packaging)
4. Add User Story 3 → Test independently → Deploy/Demo (adds customer-type rules)
5. Polish phase → Constitution compliance verified → Final release

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution compliance tasks (T019–T021) are REQUIRED before final sign-off
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
