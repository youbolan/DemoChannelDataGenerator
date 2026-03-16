# Feature Specification: Demo Channel Data Generator

**Feature Branch**: `001-channel-data-generator`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Create demo channel data generator for sales orders and shipment files, based on `My-Design/RawDesign.md`"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate sales-order exports from source files (Priority: P1)

An operations user uploads the customer source, customer-to-channel mapping, and SKU source files and receives a sales-order CSV that follows the required business rules for dates, order numbering, addresses, customer matching, line items, and totals.

**Why this priority**: The sales-order export is the core deliverable. Without it, there is no usable downstream shipment workflow.

**Independent Test**: Can be fully tested by providing valid input files and confirming that the generated sales-order CSV contains the required number of unique orders, valid rows, complete addresses, valid totals, and no rule violations.

**Acceptance Scenarios**:

1. **Given** valid customer, customer-channel mapping, and SKU source files, **When** the user runs sales-order generation on a Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday, **Then** the system generates 20 unique orders for that date and no date exceeds 20 orders.
2. **Given** valid source files and a Monday run date, **When** the sales-order CSV is generated, **Then** the system generates 20 unique orders for each date in the Saturday-through-Monday window, uses sequential order numbers per date with no gaps, and keeps each date capped at 20 orders.
3. **Given** a customer record with missing shipping fields, **When** an order row is created for that customer, **Then** the system fills every required ship-to and bill-to field using the defined fallback hierarchy and outputs no blank required address fields.
4. **Given** an order containing multiple line items, **When** the order is generated, **Then** each line uses a distinct SKU within that order and the final order total remains within the allowed range for the applicable customer type.

---

### User Story 2 - Produce shipment workbooks and ZIP package (Priority: P2)

A fulfillment user takes the generated order data and receives an updated master shipment workbook, one shipment workbook per channel, and a ZIP package that contains all shipment outputs.

**Why this priority**: Shipment output is the next business-critical step after order generation and is required to support channel fulfillment testing.

**Independent Test**: Can be fully tested by supplying an order-derived shipment dataset with mixed channels and partially missing tracking numbers, then verifying that the updated master file, channel files, and ZIP package follow the required grouping, tracking, and schema rules.

**Acceptance Scenarios**:

1. **Given** a shipment dataset where some rows in an order group have no tracking number, **When** shipment processing runs, **Then** the system assigns one carrier and one tracking number per order group, preserves existing tracking numbers, and applies the shared tracking number to all rows in that group.
2. **Given** a shipment dataset containing rows for multiple channels, **When** the shipment outputs are generated, **Then** the system creates one workbook per channel using the required column order, keeps each order group intact, and packages all outputs into a single ZIP file.

---

### User Story 3 - Support repeatable runs with customer-type rules (Priority: P3)

A data steward reruns the generator over time and needs the process to honor weekday restrictions and pricing behavior for Ecommerce, Retail, and Wholesale customers while also returning the next starting sequence number for future runs.

**Why this priority**: Repeatable execution and customer-type behavior are necessary for realistic demo data and for avoiding order-number collisions in future runs.

**Independent Test**: Can be fully tested by running the generator on different weekdays with mixed customer types and verifying type-specific scheduling, quantity and pricing behavior, and returned next-sequence values by order date.

**Acceptance Scenarios**:

1. **Given** a completed generation run, **When** the process finishes, **Then** it returns the next starting sequence number for each generated order date as the last used sequence plus one.
2. **Given** customers marked as Retail or Wholesale, **When** the run date does not match their allowed weekday, **Then** the system excludes those customer types from ineligible dates without breaking the overall daily order cap or order-number sequence rules.
3. **Given** customers marked as Retail or Wholesale on their allowed weekday, **When** orders are generated, **Then** the system applies the required quantity and pricing behavior for that customer type.

### Edge Cases

- A required input file is missing, unreadable, or lacks required columns such as `CustomerCode`, customer identity fields, channel mapping fields, or SKU values.
- The run date is Monday, causing the resolved order window to span Saturday, Sunday, and Monday instead of a single date.
- A customer has blank shipping fields, blank billing fields, or both, requiring fallback population without leaving any required address field empty.
- A customer maps to multiple channel-account rows or has no matching mapping row; the system must prevent mixed or ambiguous channel assignments within an order.
- An order group already contains a tracking number on one row; the existing tracking number must be reused for the rest of the order group rather than replaced.
- A channel name includes filename-invalid characters; the generated channel workbook name must remain recognizable while becoming filesystem-safe.
- The resolved date window contains no valid weekday for Retail or Wholesale customers; those customer types produce no orders for that run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept three source inputs for sales-order generation: a customer source file, a customer-to-channel account mapping file, and a SKU source file.
- **FR-002**: The system MUST derive the sales-order processing date range from the run date using these rules: Tuesday through Friday generate for the current date only, Monday generates for the prior Saturday through Monday inclusive, and Saturday or Sunday generate for the current date only.
- **FR-003**: The system MUST generate 20 unique orders for each date in the resolved sales-order processing range, with no individual date exceeding 20 orders.
- **FR-004**: The system MUST assign each order a unique `OrderNumber` using the format `yyyyMMdd-sequenceNumber`, starting at the provided starting sequence for that date and increasing by one with no gaps for each subsequent order on the same date.
- **FR-005**: The system MUST return the next starting sequence number for every generated order date as the largest sequence used for that date plus one.
- **FR-006**: The system MUST create one unique `ChannelOrderID` per order and keep it stable across all rows belonging to that order.
- **FR-007**: The system MUST use `CustomerCode` as the customer key and MUST pair `CustomerCode` and `CustomerName` from the same customer-source row.
- **FR-008**: The system MUST populate channel assignment values for each order from a single matching customer-to-channel mapping row so that `ChannelNum` and `ChannelAccountNum` remain consistent within the order.
- **FR-009**: The system MUST populate all required ship-to fields from customer-source shipping data when present and MUST apply the defined fallback hierarchy when shipping data is missing or blank so that no required ship-to field is empty.
- **FR-010**: The system MUST populate all required bill-to fields for every order row and MAY copy bill-to values from ship-to values when needed to satisfy completeness requirements.
- **FR-011**: The system MUST assign between 1 and 3 distinct styles per order and MUST never repeat the same SKU within a single order.
- **FR-012**: The system MUST draw all SKUs from the designated SKU source file and MUST spread SKU usage across the dataset rather than concentrating repeatedly on a small subset.
- **FR-013**: The system MUST generate Ecommerce line quantities in the range of 1 through 4 units per line and MUST scale quantity behavior for Retail and Wholesale orders according to their required multipliers.
- **FR-014**: The system MUST generate prices and extended amounts that keep each order total within the configured minimum and maximum for Ecommerce baseline orders and MUST apply the required customer-type pricing rules for Retail and Wholesale orders.
- **FR-015**: The system MUST apply the stated discount, tax, shipping-charge, payment, default-value, and status rules consistently so that subtotal, paid amount, balance, and total amount remain internally consistent on every order.
- **FR-016**: The system MUST restrict customer-type scheduling as follows: Ecommerce orders follow the general date logic, Retail orders may only be placed on Monday, and Wholesale orders may only be placed on Wednesday.
- **FR-017**: The system MUST include in the order output all fields required for downstream shipment processing, including the identifiers needed to preserve order grouping, channel grouping, SKU, and ship quantity relationships.
- **FR-018**: Before releasing the sales-order output, the system MUST validate that every row matches the required header column count, every order number sequence is gap-free by date, no required address field is blank, no order total violates its allowed range, and no SKU repeats within the same order.
- **FR-019**: The system MUST support shipment processing from the generated order data or its shipment-derived master dataset by grouping rows with the same `ChannelOrderID` as a single order.
- **FR-020**: During shipment processing, the system MUST preserve the original master dataset row order and original master schema and MUST modify only missing tracking-number values.
- **FR-021**: During shipment processing, the system MUST assign one carrier to each order group, using only the allowed carrier options when a carrier is not already set, and all rows in the same order group MUST share that carrier.
- **FR-022**: The system MUST reuse an existing tracking number for an order group when any row in that group already has one; otherwise it MUST generate one new tracking number for the order group, apply it to all rows in the group, and ensure the generated value does not already exist elsewhere in the dataset.
- **FR-023**: The system MUST create one shipment workbook per distinct channel and each channel workbook MUST use the exact required shipment header names and header order.
- **FR-024**: The system MUST set shipment `Ship Qty` equal to the source order quantity for each line.
- **FR-025**: The system MUST derive channel workbook filenames from the channel value and MUST replace invalid filename characters with underscores without changing the channel grouping itself.
- **FR-026**: The system MUST package the updated master shipment workbook and every channel workbook into a single ZIP file for delivery.
- **FR-027**: The system MUST provide a processing summary that reports total rows processed, tracking numbers generated, tracking numbers reused, channel files produced, and the ZIP filename.
- **FR-028**: If required inputs are missing, malformed, internally inconsistent, or insufficient to satisfy mandatory output rules, the system MUST stop without producing a misleading partial output.

### Non-Functional Requirements

- **NFR-001 Data Integrity**: Every generated file MUST preserve the exact header names, header order, and row-level field counts required by the business rules for that file type.
- **NFR-002 Output Reliability**: The workflow MUST either complete with all required deliverables for the requested run or fail with clear validation feedback before any incomplete deliverable is treated as finished output.
- **NFR-003 Processing Performance**: A standard run covering the maximum implied three-day window and its related shipment packaging MUST complete within 1 minute on a normal business workstation.
- **NFR-004 Data Protection**: The workflow MUST not overwrite existing tracking numbers, MUST not alter source files, and MUST limit changes in the updated shipment master file to the allowed tracking-number completion only.
- **NFR-005 Auditability**: Each run MUST make it possible to verify the resolved processing window, generated order counts by date, and returned next-sequence values for future reruns.

### Key Entities *(include if feature involves data)*

- **Customer**: A source record keyed by `CustomerCode` that provides customer identity, type, billing data, shipping data, and contact details used to populate order outputs.
- **Customer Channel Mapping**: A mapping record that links a `CustomerCode` to channel-specific account values such as `ChannelNum` and `ChannelAccountNum`, and may also supply the channel identity needed for shipment splitting.
- **SKU Record**: A sellable product entry from the SKU pool that provides the product identifier and pricing references used to build realistic order lines.
- **Sales Order**: A generated business order identified by `OrderNumber` and `ChannelOrderID`, tied to one customer, one channel mapping, one order date, and one or more order lines.
- **Sales Order Line**: A line within a sales order that carries one SKU, quantity, unit price, extended amount, and shipment-relevant quantities.
- **Shipment Order Group**: The collection of shipment rows sharing the same `ChannelOrderID`, which must remain together for carrier assignment, tracking-number assignment, and downstream channel outputs.
- **Channel Shipment File**: A channel-specific shipment workbook containing only rows for one channel, expressed in the required shipment header structure.
- **Sequence State**: The date-specific record of the last used order sequence that determines the next valid starting sequence for future runs.

## Assumptions

- Statements that say "generate exactly `OrdersToGenerate` orders" are interpreted as "generate 20 orders per eligible date," because the same design also states that Monday runs must generate 20 orders for each date in the Saturday-through-Monday window.
- If the resolved run window does not contain an allowed weekday for Retail or Wholesale customers, those customer types produce no orders in that run rather than forcing orders onto an invalid day.
- The shipment workflow depends on a channel identifier being available in the shipment source, even though the raw notes mix `Channel`, `ChannelNum`, and `ChannelAccountNum` terminology.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every run, 100% of generated orders use unique order numbers, and each date in the resolved window contains no more than 20 orders.
- **SC-002**: On Monday runs, the generator produces 60 unique orders across Saturday, Sunday, and Monday unless customer-type weekday restrictions make a subset of customer types ineligible, and each generated date still remains capped at 20 orders.
- **SC-003**: 100% of generated order rows contain all required ship-to and bill-to fields and match the required sales-order column count exactly.
- **SC-004**: 100% of generated orders comply with applicable SKU uniqueness, quantity, pricing, and order-total rules for their customer type.
- **SC-005**: 100% of shipment order groups exit processing with exactly one carrier and one shared tracking number, while 100% of pre-existing tracking numbers remain unchanged.
- **SC-006**: Every shipment run produces one updated master shipment workbook, one workbook per distinct channel, and one ZIP package containing all required shipment deliverables.
- **SC-007**: After each run, the system returns next starting sequence values for every generated order date with zero sequence collisions when those returned values are used for the next run.
