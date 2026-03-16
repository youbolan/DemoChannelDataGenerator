# Data Model: Demo Channel Data Generator

**Feature Branch**: `001-channel-data-generator`
**Date**: 2026-03-16

## Source Entities (Input — Read Only)

### Customer

Source: User-uploaded customer source file (CSV or XLSX)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `CustomerCode` | string | ✅ | Primary key — used to match mapping rows and identify the customer |
| `CustomerName` | string | ✅ | Paired with `CustomerCode` from the same row |
| `Type` | enum: `Ecommerce`, `Retail`, `Wholesale` | ✅ | Determines scheduling, quantity multipliers, and pricing rules |
| `Contact` | string | | Maps to `ShipToFirstName` |
| `Contact2` | string | | Maps to `ShipToLastName` |
| `ShipName` | string | | Maps to `ShipToName`; fallback: `CustomerName` |
| `ShipCompany` | string | | Maps to `ShipToCompany`; fallback: `CustomerName` |
| `ShipAddressLine1` | string | | Maps to `ShipToAddressLine1`; fallback: `BillToAddressLine1` |
| `ShipAddressLine2` | string | | Maps to `ShipToAddressLine2`; fallback: `BillToAddressLine2` |
| `ShipDescription` | string | | Maps to `ShipToAddressLine3`; fallback: `BillToAddressLine3` |
| `ShipCity` | string | | Maps to `ShipToCity`; fallback: `BillToCity` |
| `ShipState` | string | | Maps to `ShipToState`; fallback: `BillToState` |
| `ShipPostalCode` | string | | Maps to `ShipToPostalCode`; fallback: `BillToPostalCode` |
| `ShipCounty` | string | | Maps to `ShipToCounty`; fallback: `BillToCounty` |
| `ShipCountry` | string | | Maps to `ShipToCountry`; fallback: `BillToCountry` |
| `ShipEmail` | string | | Maps to `ShipToEmail`; fallback: `BillToEmail` |
| `ShipDaytimePhone` | string | | Maps to `ShipToDaytimePhone`; fallback: `BillToDaytimePhone` |

**Validation Rules**:
- `CustomerCode` must be non-empty and non-whitespace
- `Type` must be one of `Ecommerce`, `Retail`, `Wholesale` (case-insensitive match recommended)

---

### Customer Channel Mapping

Source: User-uploaded customer-channel mapping file (CSV or XLSX)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `CustomerCode` | string | ✅ | Foreign key to Customer |
| `Channel` | string | ✅ | Canonical business channel identifier — used for shipment splitting and filenames (FR-008b) |
| `ChannelNum` | string | ✅ | Supporting mapped channel number |
| `ChannelAccountNum` | string | ✅ | Supporting mapped channel account number |

**Validation Rules**:
- Each `CustomerCode` must map to exactly ONE row. Zero matches → skip customer. Multiple matches → skip customer (FR-008a).
- `Channel` must be non-empty — if missing, the customer is skipped (Edge Case: line 86 of spec).

---

### SKU Record

Source: User-uploaded SKU source file (CSV or XLSX)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `SKU` | string | ✅ | Unique product identifier drawn from the pool |

**Validation Rules**:
- File must contain at least 3 unique SKU values (to satisfy the 1–3 styles per order rule)
- SKU values must be non-empty and non-whitespace

---

## Generated Entities (Output)

### Sales Order Row

Output: Sales order file (CSV or XLSX, user-selected format)

| Column # | Header | Type | Source / Rule |
|----------|--------|------|---------------|
| 1 | `OrderNumber` | string | `yyyyMMdd-sequenceNumber` (FR-004); sequence always starts at 1 |
| 2 | `ChannelOrderID` | string | Unique per order, stable across all rows of the order (FR-006) |
| 3 | `CustomerCode` | string | From Customer source row |
| 4 | `CustomerName` | string | From same Customer source row as `CustomerCode` (FR-007) |
| 5 | `Channel` | string | From Customer Channel Mapping row |
| 6 | `ChannelNum` | string | From same mapping row (FR-008) |
| 7 | `ChannelAccountNum` | string | From same mapping row (FR-008) |
| 8 | `OrderDate` | string | From resolved date range (FR-002) |
| 9 | `ShipToName` | string | Mapped from `ShipName`, fallback: `CustomerName` |
| 10 | `ShipToFirstName` | string | Mapped from `Contact` |
| 11 | `ShipToLastName` | string | Mapped from `Contact2` |
| 12 | `ShipToCompany` | string | Mapped from `ShipCompany`, fallback: `CustomerName` |
| 13 | `ShipToAddressLine1` | string | Mapped from `ShipAddressLine1`, fallback: `BillToAddressLine1` |
| 14 | `ShipToAddressLine2` | string | Mapped from `ShipAddressLine2`, fallback: `BillToAddressLine2` |
| 15 | `ShipToAddressLine3` | string | Mapped from `ShipDescription`, fallback: `BillToAddressLine3` |
| 16 | `ShipToCity` | string | Mapped from `ShipCity`, fallback: `BillToCity` |
| 17 | `ShipToState` | string | Mapped from `ShipState`, fallback: `BillToState` |
| 18 | `ShipToPostalCode` | string | Mapped from `ShipPostalCode`, fallback: `BillToPostalCode` |
| 19 | `ShipToCounty` | string | Mapped from `ShipCounty`, fallback: `BillToCounty` |
| 20 | `ShipToCountry` | string | Mapped from `ShipCountry`, fallback: `BillToCountry` |
| 21 | `ShipToEmail` | string | Mapped from `ShipEmail`, fallback: `BillToEmail` |
| 22 | `ShipToDaytimePhone` | string | Mapped from `ShipDaytimePhone`, fallback: `BillToDaytimePhone` |
| 23 | `BillToName` | string | May copy from `ShipToName` (FR-010) |
| 24 | `BillToCompany` | string | May copy from `ShipToCompany` |
| 25 | `BillToAddressLine1` | string | May copy from `ShipToAddressLine1` |
| 26 | `BillToAddressLine2` | string | May copy from `ShipToAddressLine2` |
| 27 | `BillToAddressLine3` | string | May copy from `ShipToAddressLine3` |
| 28 | `BillToCity` | string | May copy from `ShipToCity` |
| 29 | `BillToState` | string | May copy from `ShipToState` |
| 30 | `BillToPostalCode` | string | May copy from `ShipToPostalCode` |
| 31 | `BillToCounty` | string | May copy from `ShipToCounty` |
| 32 | `BillToCountry` | string | May copy from `ShipToCountry` |
| 33 | `BillToEmail` | string | May copy from `ShipToEmail` |
| 34 | `BillToDaytimePhone` | string | May copy from `ShipToDaytimePhone` |
| 35 | `SKU` | string | Drawn from SKU pool; unique within order (FR-011) |
| 36 | `OrderQty` | integer | Ecommerce: 1–4; Retail: 2–8; Wholesale: 4–16 (FR-013) |
| 37 | `Price` | decimal | $12–$80 Ecommerce; ×0.8 Retail; WSP Wholesale (FR-014) |
| 38 | `ExtAmount` | decimal | `OrderQty × Price` |
| 39 | `SubTotalAmount` | decimal | `Σ(ExtAmount) − DiscountAmount` |
| 40 | `DiscountAmount` | decimal | 35% of orders have discount; rate = 0 (FR-015) |
| 41 | `TaxAmount` | decimal | Always `0` (FR-015) |
| 42 | `ShippingAmount` | decimal | 90% of orders; $0.00–$18.00 (FR-015) |
| 43 | `TotalAmount` | decimal | `SubTotalAmount + ShippingAmount`; must be within range (FR-014) |
| 44 | `OrderType` | integer | Always `1` |
| 45 | `OrderStatus` | integer | Always `0` |
| 46 | `Currency` | string | Always `USD` |
| 47 | `UOM` | string | Always `EA` |
| 48 | `Stockable` | string | Always `TRUE` |
| 49 | `Costable` | string | Always `TRUE` |
| 50 | `Taxable` | string | Always `TRUE` |
| 51 | `IsProfit` | string | Always `TRUE` |
| 52 | `ShipQty` | integer | Always `0` (initial order state) |
| 53 | `OpenQty` | integer | Equals `OrderQty` |
| 54 | `Financial Status` | string | Always `' '` (single space) |
| 55 | `Fulfillment Status` | string | Always `' '` (single space) |
| 56 | `PaidAmount` | decimal | Always `0` |
| 57 | `Balance` | decimal | Equals `TotalAmount` |

**Row count**: Multiple rows per order when `numStyles > 1`. Shared fields (`OrderNumber`, `ChannelOrderID`, customer/channel/address fields, `SubTotalAmount`, `DiscountAmount`, `TaxAmount`, `ShippingAmount`, `TotalAmount`, status fields, `PaidAmount`, `Balance`) repeat identically on every row of the same order.

---

### Shipment Master Row

Input to shipment processing; same schema as the sales order output but used as a master dataset.

Processing behavior:
- Group by `ChannelOrderID` → order groups
- Only `Tracking Number` column may be modified (add where missing)
- Row order and all other columns preserved exactly

---

### Channel Shipment File Row

Output: One file per distinct `Channel` value (CSV or XLSX, user-selected format)

| Column # | Header | Type | Source |
|----------|--------|------|--------|
| 1 | `Channel Order ID` | string | From `ChannelOrderID` |
| 2 | `Ship Date` | string | From `ShipmentDate` parameter |
| 3 | `TimeZone` | string | Constant: `UTC-8` |
| 4 | `Carrier` | string | Randomly assigned per order group: `UPS` or `FedEx` (FR-021) |
| 5 | `Tracking Number` | string | Generated or reused per order group (FR-022) |
| 6 | `Shipping Service` | string | From source (if present) |
| 7 | `2nd Tracking Number` | string | From source (if present) |
| 8 | `Package` | string | From source (if present) |
| 9 | `Shipping Fee` | string | From source (if present) |
| 10 | `Weight` | string | From source (if present) |
| 11 | `Length` | string | From source (if present) |
| 12 | `Width` | string | From source (if present) |
| 13 | `Height` | string | From source (if present) |
| 14 | `Note` | string | From source (if present) |
| 15 | `SKU` | string | From source `SKU` column |
| 16 | `Ship Qty` | integer | Equals source `OrderQty` (FR-024) |

---

## Tracking Number Formats

| Carrier | Format | Example |
|---------|--------|---------|
| UPS | `1Z` + 16 alphanumeric chars | `1Z999AA10123456784` |
| FedEx | 12 digits OR 15 digits | `449044304137` |

---

## Relationships

```text
Customer 1──* Sales Order Row (via CustomerCode)
Customer 1──1 Customer Channel Mapping (via CustomerCode; 0 or 2+ = skip)
SKU Record *──* Sales Order Row (each order uses 1–3 distinct SKUs)
Sales Order Row *──1 Shipment Order Group (via ChannelOrderID)
Shipment Order Group *──1 Channel Shipment File (via Channel)
```

## State Transitions

Orders have no runtime state transitions within the generator. They are created in a fixed initial state:
- `OrderStatus = 0`
- `Financial Status = ' '`
- `Fulfillment Status = ' '`
- `ShipQty = 0`, `OpenQty = OrderQty`
- `PaidAmount = 0`, `Balance = TotalAmount`

Shipment processing transitions only the `Tracking Number` field from empty → generated value. All other fields are immutable.
