# Feature Specification: Demo Channel Data Generator

**Feature Branch**: `001-channel-data-generator`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Create demo channel data generator for sales orders and shipment files, based on `My-Design/RawDesign.md`"

## Clarifications

### Session 2026-03-16

- Q: Which file-format policy should the generator support for inputs and outputs? -> A: Accept CSV and XLSX for inputs; allow user-selected output format separately for sales-order and shipment outputs.
- Q: How should starting sequence input be handled for multi-date runs? -> A: Date-to-sequence map optional; default missing dates to 1.
- Q: How should ambiguous or missing customer-to-channel mappings be handled? -> A: Skip only ambiguous/unmapped customers, continue processing others, and report skipped customers.
- Q: Should randomness be reproducible across runs? -> A: Always use non-deterministic randomness with no reproducibility guarantee.
- Q: What should happen when a date cannot reach 20 valid orders after eligibility/skip rules? -> A: Produce as many valid orders as possible (up to 20) and report the date as underfilled.
- Q: How should order and shipment dates be provided and defaulted? -> A: User can specify both; default order date is current date in Pacific Standard Time, and default shipment date is one day after current date in Pacific Standard Time.
- Q: Where should the authoritative sales-order schema come from? -> A: The sales-order schema is fully defined in this spec and does not depend on a separate template file.
- Q: Which field is the canonical shipment split and filename key? -> A: `Channel` is the canonical shipment split and filename key.
- Q: Missing Sales-Order Headers? -> A: Assemble headers from design fields.
- Q: How is the tool delivered and invoked? -> A: Vanilla static web app — HTML, CSS, and JavaScript only; runs entirely in the browser with no backend server.
- Q: Which JavaScript libraries are pre-approved for client-side file handling? -> A: SheetJS (xlsx) for CSV/XLSX read & write and JSZip for ZIP packaging, both loaded via CDN.
- Q: How does the user supply the starting sequence number for multi-date runs in the web UI? -> A: Not needed — always default to sequence 1 for all dates.
- Q: What is the web UI interaction model? -> A: Single page with two clearly separated sections — Section 1 for sales-order generation (file uploads + Generate button), Section 2 for shipment processing (master file upload + Process button).
- Q: Should FR-005 (return next sequence number) and SC-007 be kept now that sequence always starts at 1? -> A: Remove both — returning the next sequence number is unnecessary since every run always starts at 1.
- Q: When processing the shipment master file, should the system update only `Tracking Number`, or also update `Carrier` in the master file? -> A: Update both `Tracking Number` and `Carrier` in the master shipment file.
- Q: Which shipment master input schemas should the system accept? -> A: Accept both the generated sales-order output schema and a shipment-oriented master dataset, with normalization of documented header aliases as needed.
- Q: How strict should shipment-input header alias normalization be? -> A: Support the documented alias list with case-insensitive and spacing-insensitive matching, but do not use fuzzy matching beyond that.
- Q: How should `ShipmentDate` interact with `Ship Date` values during shipment processing? -> A: Channel output files always use the run's `ShipmentDate` value; the updated master file keeps any existing `Ship Date` values unchanged.
- Q: If the shipment input uses the sales-order schema, how should the updated master shipment file be formed? -> A: Append the required shipment-processing columns to create the updated master file while preserving original row order.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate sales-order exports from source files (Priority: P1)

An operations user uploads the customer source, customer-to-channel mapping, and SKU source files and receives a sales-order output file in the selected format that follows the required business rules for dates, order numbering, addresses, customer matching, line items, and totals.

**Why this priority**: The sales-order export is the core deliverable. Without it, there is no usable downstream shipment workflow.

**Independent Test**: Can be fully tested by providing valid input files and confirming that the generated sales-order output contains the required number of unique orders, valid rows, complete addresses, valid totals, and no rule violations.

**Acceptance Scenarios**:

1. **Given** valid customer, customer-channel mapping, and SKU source files, **When** the user runs sales-order generation with an order date on Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday, **Then** the system generates up to 20 unique orders for that date, no date exceeds 20 orders, and any underfilled date is reported.
2. **Given** valid source files and an order date on Monday, **When** the sales-order output is generated, **Then** the system generates up to 20 unique orders for each date in the Saturday-through-Monday window, uses sequential order numbers per date with no gaps, keeps each date capped at 20 orders, and reports any underfilled date.
3. **Given** no order date and no shipment date are provided, **When** generation starts, **Then** order date defaults to current Pacific Standard Time date and shipment date defaults to one day after current Pacific Standard Time date.
4. **Given** a customer record with missing shipping fields, **When** an order row is created for that customer, **Then** the system fills every required ship-to and bill-to field using the defined fallback hierarchy and outputs no blank required address fields.
5. **Given** an order containing multiple line items, **When** the order is generated, **Then** each line uses a distinct SKU within that order and the final order total remains within the allowed range for the applicable customer type.

---

### User Story 2 - Produce shipment files and ZIP package (Priority: P2)

A fulfillment user uploads either the generated sales-order output or a compatible shipment-oriented master dataset and receives an updated master shipment file, one shipment file per channel, and a ZIP package that contains all shipment outputs, using the selected shipment output format.

**Why this priority**: Shipment output is the next business-critical step after order generation and is required to support channel fulfillment testing.

**Independent Test**: Can be fully tested by supplying an order-derived shipment dataset with mixed channels and partially missing tracking numbers, then verifying that the updated master file, channel files, and ZIP package follow the required grouping, tracking, and schema rules.

**Acceptance Scenarios**:

1. **Given** a shipment dataset where some rows in an order group have no tracking number, **When** shipment processing runs, **Then** the system assigns one carrier and one tracking number per order group, preserves existing tracking numbers, and applies the shared tracking number to all rows in that group.
2. **Given** a shipment dataset containing rows for multiple channels, **When** the shipment outputs are generated, **Then** the system creates one file per channel in the selected shipment output format using the required column order, keeps each order group intact, and packages all outputs into a single ZIP file.

---

### User Story 3 - Support repeatable runs with customer-type rules (Priority: P3)

A data steward reruns the generator over time and needs the process to honor weekday restrictions and pricing behavior for Ecommerce, Retail, and Wholesale customers.

**Why this priority**: Repeatable execution and customer-type behavior are necessary for realistic demo data.

**Independent Test**: Can be fully tested by running the generator on different weekdays with mixed customer types and verifying type-specific scheduling, quantity and pricing behavior.

**Acceptance Scenarios**:

1. **Given** customers marked as Retail or Wholesale, **When** the order date does not match their allowed weekday, **Then** the system excludes those customer types from ineligible dates without breaking the overall daily order cap or order-number sequence rules.
3. **Given** customers marked as Retail or Wholesale on their allowed weekday, **When** orders are generated, **Then** the system applies the required quantity and pricing behavior for that customer type.

### Edge Cases

- A required input file is missing, unreadable, or lacks required columns such as `CustomerCode`, customer identity fields, channel mapping fields, or SKU values.
- Order date or shipment date is provided in an invalid date format.
- Order date is omitted and must be resolved from current Pacific Standard Time date at runtime.
- Shipment date is omitted and must default to one day after current Pacific Standard Time date.
- The order date is Monday, causing the resolved order window to span Saturday, Sunday, and Monday instead of a single date.
- A customer has blank shipping fields, blank billing fields, or both, requiring fallback population without leaving any required address field empty.
- A customer maps to multiple channel-account rows or has no matching mapping row; the system must skip that customer for the run, continue processing eligible customers, and report the skip reason.
- An order group already contains a tracking number on one row; the existing tracking number must be reused for the rest of the order group rather than replaced.
- An order group has no carrier value in the master shipment dataset; the system must assign one allowed carrier for that group and write it consistently to the updated master shipment file and channel outputs.
- A shipment master upload uses either sales-order headers or shipment-oriented headers with documented aliases; unsupported header names must fail with clear validation feedback rather than being guessed.
- A shipment master upload uses documented aliases that differ only by case or spacing; the system must normalize them successfully without requiring fuzzy interpretation of unrelated header names.
- A shipment-oriented master dataset already contains `Ship Date` values; shipment processing must preserve those values in the updated master file while still using the run-level `ShipmentDate` for channel output files.
- A shipment upload uses the sales-order output schema and therefore lacks shipment-processing columns such as `Carrier` and `Tracking Number`; the system must append the documented shipment-processing columns when forming the updated master shipment file.
- A channel name includes filename-invalid characters; the generated channel output filename must remain recognizable while becoming filesystem-safe.
- A row has `ChannelNum` and `ChannelAccountNum` but lacks a valid `Channel` value needed for shipment splitting and filenames.
- The resolved date window contains no valid weekday for Retail or Wholesale customers; those customer types produce no orders for that run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept three source inputs for sales-order generation: a customer source file, a customer-to-channel account mapping file, and a SKU source file, with CSV and XLSX accepted for each input.
- **FR-001a**: The system MUST allow the user to select sales-order output format independently from shipment output format, with each selection limited to CSV or XLSX.
- **FR-001b**: The system MUST accept optional user-provided `OrderDate` and `ShipmentDate` inputs.
- **FR-001c**: If `OrderDate` is not provided, the system MUST default it to the current date in Pacific Standard Time.
- **FR-001d**: If `ShipmentDate` is not provided, the system MUST default it to one day after the current date in Pacific Standard Time.
- **FR-001e**: The system MUST validate provided `OrderDate` and `ShipmentDate` values and fail with clear validation feedback when either date is invalid.
- **FR-002**: The system MUST derive the sales-order processing date range from `OrderDate` using these rules: Tuesday through Friday generate for the current date only, Monday generates for the prior Saturday through Monday inclusive, and Saturday or Sunday generate for the current date only.
- **FR-003**: The system MUST generate up to 20 unique orders for each date in the resolved sales-order processing range, with no individual date exceeding 20 orders.
- **FR-003a**: If a date cannot reach 20 valid orders after applying eligibility and skip rules, the system MUST still produce all valid orders for that date and MUST mark that date as underfilled in processing output reporting.
- **FR-004**: The system MUST assign each order a unique `OrderNumber` using the format `yyyyMMdd-sequenceNumber`, starting at sequence `1` for each date and increasing by one with no gaps for each subsequent order on the same date.
- **FR-004a**: The starting sequence number for every generated date MUST always be `1`. No date-to-sequence input map is accepted or required.
- **FR-006**: The system MUST create one unique `ChannelOrderID` per order and keep it stable across all rows belonging to that order.
- **FR-007**: The system MUST use `CustomerCode` as the customer key and MUST pair `CustomerCode` and `CustomerName` from the same customer-source row.
- **FR-008**: The system MUST populate channel assignment values for each order from a single matching customer-to-channel mapping row so that `ChannelNum` and `ChannelAccountNum` remain consistent within the order.
- **FR-008b**: The system MUST treat `Channel` as the canonical business channel identifier for shipment splitting and channel output filenames, while `ChannelNum` and `ChannelAccountNum` remain supporting mapped identifiers.
- **FR-008a**: If a customer has zero matching mapping rows or multiple matching mapping rows, the system MUST skip generating orders for that customer, continue processing all other eligible customers, and record the customer and reason in run output reporting.
- **FR-009**: The system MUST populate all required ship-to fields from customer-source shipping data when present and MUST apply the defined fallback hierarchy when shipping data is missing or blank so that no required ship-to field is empty.
- **FR-010**: The system MUST populate all required bill-to fields for every order row and MAY copy bill-to values from ship-to values when needed to satisfy completeness requirements.
- **FR-011**: The system MUST assign between 1 and 3 distinct styles per order and MUST never repeat the same SKU within a single order.
- **FR-012**: The system MUST draw all SKUs from the designated SKU source file and MUST spread SKU usage across the dataset rather than concentrating repeatedly on a small subset.
- **FR-013**: The system MUST generate Ecommerce line quantities in the range of 1 through 4 units per line and MUST scale quantity behavior for Retail and Wholesale orders according to their required multipliers.
- **FR-014**: The system MUST generate prices and extended amounts that keep each order total within the configured minimum and maximum for Ecommerce baseline orders and MUST apply the required customer-type pricing rules for Retail and Wholesale orders.
- **FR-015**: The system MUST apply the stated discount, tax, shipping-charge, payment, default-value, and status rules consistently so that subtotal, paid amount, balance, and total amount remain internally consistent on every order.
- **FR-016**: The system MUST restrict customer-type scheduling as follows: Ecommerce orders follow the general date logic, Retail orders may only be placed on Monday, and Wholesale orders may only be placed on Wednesday.
- **FR-017**: The system MUST include in the order output all fields required for downstream shipment processing, including `Channel` as the canonical shipment grouping field and the identifiers needed to preserve order grouping, channel grouping, SKU, and ship quantity relationships.
- **FR-017a**: The system MUST apply `ShipmentDate` consistently to channel shipment outputs and shipment-processing context for the run.
- **FR-018**: Before releasing the sales-order output, the system MUST validate that every row matches the canonical sales-order schema defined in this specification, including exact header names, header order, and header column count, and MUST also verify that every order number sequence is gap-free by date, no required address field is blank, no order total violates its allowed range, and no SKU repeats within the same order.
- **FR-019**: The system MUST support shipment processing from either the generated sales-order output schema or a shipment-oriented master dataset by grouping rows with the same `ChannelOrderID` business identifier as a single order.
- **FR-019a**: The system MUST normalize documented shipment-input header aliases needed to support the accepted shipment master schemas using case-insensitive and spacing-insensitive matching while preserving one canonical business meaning per field and failing with clear validation feedback on unsupported headers.
- **FR-019b**: The documented shipment-input alias set MUST include at least these canonical mappings: `ChannelOrderID` <- `ChannelOrderID`, `Channel Order ID`, `channelOrderID`; `OrderQty` <- `OrderQty`, `Order Qty`; `Channel` <- `Channel`; `Carrier` <- `Carrier`; `Tracking Number` <- `Tracking Number`; `Ship Date` <- `Ship Date`; `SKU` <- `SKU`.
- **FR-020**: During shipment processing, the system MUST preserve the original master dataset row order. For shipment-oriented master inputs, the system MUST preserve the original master schema and MUST modify only the `Tracking Number` and `Carrier` fields when completing shipment data for an order group.
- **FR-020a**: When the uploaded shipment master dataset already contains a `Ship Date` field, the updated master file MUST preserve the original `Ship Date` values rather than replacing them with the run-level `ShipmentDate`.
- **FR-020b**: When the uploaded shipment input uses the generated sales-order output schema, the system MUST create the updated master shipment file by appending the documented shipment-processing columns required for shipment completion while preserving the original sales-order columns and row order.
- **FR-021**: During shipment processing, the system MUST assign one carrier to each order group, using only the allowed carrier options when a carrier is not already set, and all rows in the same order group MUST share that carrier.
- **FR-022**: The system MUST reuse an existing tracking number for an order group when any row in that group already has one; otherwise it MUST generate one new tracking number for the order group, apply it to all rows in the group, and ensure the generated value does not already exist elsewhere in the dataset.
- **FR-023**: The system MUST create one shipment output file per distinct `Channel` value in the selected shipment output format, and each channel file MUST use the exact required shipment header names and header order.
- **FR-024**: The system MUST set shipment `Ship Qty` equal to the source order quantity for each line.
- **FR-025**: The system MUST derive channel output filenames from the `Channel` value and MUST replace invalid filename characters with underscores without changing the channel grouping itself.
- **FR-026**: The system MUST package the updated master shipment file and every channel shipment file into a single ZIP file for delivery.
- **FR-027**: The system MUST provide a processing summary that reports total rows processed, tracking numbers generated, tracking numbers reused, channel files produced, ZIP filename, counts of skipped customers by skip reason, and underfilled dates with expected-versus-generated order counts.
- **FR-028**: If required inputs are missing, malformed, or insufficient to satisfy mandatory output rules, the system MUST stop without producing a misleading partial output. Mapping ambiguities defined in FR-008a are handled as skip-and-report conditions, not full-run failures.
- **FR-029**: The system MUST use non-deterministic randomness for data generation decisions (including SKU selection distribution, quantity/price generation within rule bounds, carrier assignment when missing, and new tracking-number generation), and the same inputs are not required to produce identical outputs across runs.

### Non-Functional Requirements

- **NFR-001 Data Integrity**: Every generated file MUST preserve the exact header names, header order, and row-level field counts required by the business rules for that file type, and the sales-order schema authority MUST be this specification rather than a separate template file.
- **NFR-001a Format Consistency**: The selected sales-order and shipment output formats MUST be applied consistently to all generated artifacts in their respective output groups for a run.
- **NFR-002 Output Reliability**: The workflow MUST either complete with all required deliverables for the requested run or fail with clear validation feedback before any incomplete deliverable is treated as finished output. When skip-and-report conditions occur, completion output MUST include transparent skip reporting.
- **NFR-003 Processing Performance**: A standard run covering the maximum implied three-day window and its related shipment packaging MUST complete within 1 minute on a normal business workstation.
- **NFR-004 Data Protection**: The workflow MUST not overwrite existing tracking numbers, MUST not alter source files, and MUST limit changes in the updated shipment master file to the allowed `Tracking Number` and `Carrier` completion only.
- **NFR-005 Auditability**: Each run MUST make it possible to verify the resolved processing window and generated order counts by date.
- **NFR-005a Timezone Consistency**: Date default resolution MUST use Pacific Standard Time consistently for both `OrderDate` and `ShipmentDate`.
- **NFR-006 Variability Policy**: The workflow MUST document that outputs are intentionally non-deterministic and MUST not claim deterministic replayability for identical inputs.

### Key Entities *(include if feature involves data)*

- **Customer**: A source record keyed by `CustomerCode` that provides customer identity, type, billing data, shipping data, and contact details used to populate order outputs.
- **Customer Channel Mapping**: A mapping record that links a `CustomerCode` to the canonical `Channel` business identifier plus channel-specific account values such as `ChannelNum` and `ChannelAccountNum`.
- **SKU Record**: A sellable product entry from the SKU pool that provides the product identifier and pricing references used to build realistic order lines.
- **Sales Order**: A generated business order identified by `OrderNumber` and `ChannelOrderID`, tied to one customer, one channel mapping, one order date, and one or more order lines.
- **Sales Order Line**: A line within a sales order that carries one SKU, quantity, unit price, extended amount, and shipment-relevant quantities.
- **Shipment Order Group**: The collection of shipment rows sharing the same `ChannelOrderID`, which must remain together for carrier assignment, tracking-number assignment, and downstream channel outputs.
- **Channel Shipment File**: A channel-specific shipment file (CSV or XLSX) containing only rows for one `Channel` value, expressed in the required shipment header structure.

### Canonical Sales Order Schema

The sales order output must contain exactly the following headers in this order:
`OrderNumber`, `ChannelOrderID`, `CustomerCode`, `CustomerName`, `Channel`, `ChannelNum`, `ChannelAccountNum`, `OrderDate`, `ShipToName`, `ShipToFirstName`, `ShipToLastName`, `ShipToCompany`, `ShipToAddressLine1`, `ShipToAddressLine2`, `ShipToAddressLine3`, `ShipToCity`, `ShipToState`, `ShipToPostalCode`, `ShipToCounty`, `ShipToCountry`, `ShipToEmail`, `ShipToDaytimePhone`, `BillToName`, `BillToCompany`, `BillToAddressLine1`, `BillToAddressLine2`, `BillToAddressLine3`, `BillToCity`, `BillToState`, `BillToPostalCode`, `BillToCounty`, `BillToCountry`, `BillToEmail`, `BillToDaytimePhone`, `SKU`, `OrderQty`, `Price`, `ExtAmount`, `SubTotalAmount`, `DiscountAmount`, `TaxAmount`, `ShippingAmount`, `TotalAmount`, `OrderType`, `OrderStatus`, `Currency`, `UOM`, `Stockable`, `Costable`, `Taxable`, `IsProfit`, `ShipQty`, `OpenQty`, `Financial Status`, `Fulfillment Status`, `PaidAmount`, `Balance`.

### Delivery & Technical Constraints

- The tool MUST be implemented as a vanilla static web app using HTML, CSS, and JavaScript only.
- The tool MUST run entirely in the browser with no backend server or server-side processing.
- All file reading (CSV/XLSX inputs) and file writing (CSV/XLSX/ZIP outputs) MUST be performed client-side within the browser.
- No build toolchain, framework (React, Vue, etc.), or server runtime is permitted unless explicitly approved.
- The implementation MUST use **SheetJS** (`xlsx`) for reading and writing CSV and XLSX files and **JSZip** for creating ZIP packages, both loaded via CDN. No other third-party file-handling library may be substituted without explicit approval.
- The web app MUST be implemented as a **single HTML page** with two clearly separated UI sections:
  - **Section 1 — Sales Order Generation**: file upload controls for the three source files (customer, customer-channel mapping, SKU), optional `OrderDate` and `ShipmentDate` date inputs, output format selectors, and a Generate button.
  - **Section 2 — Shipment Processing**: a file upload control for the master shipment dataset and a Process button; outputs the updated master file, per-channel files, and ZIP package.

## Assumptions
- Statements that say "generate exactly `OrdersToGenerate` orders" are interpreted as "generate 20 orders per eligible date," because the same design also states that Monday runs must generate 20 orders for each date in the Saturday-through-Monday window.
- If the resolved run window does not contain an allowed weekday for Retail or Wholesale customers, those customer types produce no orders in that run rather than forcing orders onto an invalid day.
- `Channel` is the canonical shipment split and filename key, while `ChannelNum` and `ChannelAccountNum` remain supporting mapped identifiers.
- The exact sales-order header list is maintained directly in this specification as the authoritative schema definition for implementation and validation.
- The starting sequence number for every order date is always `1`; no per-date sequence input is accepted.
- If `OrderDate` is omitted, the runtime resolves it from the current Pacific Standard Time date.
- If `ShipmentDate` is omitted, the runtime resolves it to one day after the current Pacific Standard Time date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every run, 100% of generated orders use unique order numbers, and each date in the resolved window contains no more than 20 orders.
- **SC-002**: When `OrderDate` is Monday, the generator attempts up to 20 orders per date across Saturday, Sunday, and Monday, and each generated date remains capped at 20 orders with any shortfall explicitly reported as underfilled.
- **SC-003**: 100% of generated order rows contain all required ship-to and bill-to fields and match the required sales-order column count exactly.
- **SC-004**: 100% of generated orders comply with applicable SKU uniqueness, quantity, pricing, and order-total rules for their customer type.
- **SC-005**: 100% of shipment order groups exit processing with exactly one carrier and one shared tracking number, while 100% of pre-existing tracking numbers remain unchanged.
- **SC-006**: Every shipment run produces one updated master shipment file, one file per distinct channel, and one ZIP package containing all required shipment deliverables.
- **SC-007**: When unmapped or ambiguously mapped customers are present, 100% of skipped customers are reported with explicit reason codes, and no skipped customer appears in generated sales orders.
- **SC-008**: When any date is underfilled, 100% of underfilled dates are reported with expected-versus-generated counts and no false claim of full 20-order completion for those dates.
- **SC-009**: When `OrderDate` and/or `ShipmentDate` are omitted, 100% of runs resolve defaults using Pacific Standard Time rules (`OrderDate` = current date, `ShipmentDate` = current date + 1 day).
