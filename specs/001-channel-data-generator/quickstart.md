# Quickstart: Demo Channel Data Generator

**Feature Branch**: `001-channel-data-generator`
**Date**: 2026-03-16

## Prerequisites

- A modern evergreen browser (Chrome, Firefox, Edge, or Safari — latest 2 major versions)
- Three source data files in CSV or XLSX format:
  1. **Customer source** — must contain columns: `CustomerCode`, `CustomerName`, `Type`, plus shipping/billing address fields
  2. **Customer-channel mapping** — must contain columns: `CustomerCode`, `Channel`, `ChannelNum`, `ChannelAccountNum`
  3. **SKU source** — must contain column: `SKU` (at least 3 unique values)

## Running the App

1. Open `index.html` in your browser (double-click or serve from any static file server).

2. The page loads with two sections:
   - **Section 1 — Sales Order Generation** (top)
   - **Section 2 — Shipment Processing** (bottom)

## Generating Sales Orders

1. In Section 1, upload the three required source files:
   - Click **Customer Source File** → select your customer CSV/XLSX
   - Click **Customer-Channel Mapping File** → select your mapping CSV/XLSX
   - Click **SKU Source File** → select your SKU CSV/XLSX

2. (Optional) Set the **Order Date** — defaults to today in Pacific time.

3. (Optional) Set the **Shipment Date** — defaults to tomorrow in Pacific time.

4. Select the **Sales Order Output Format** (CSV or XLSX).

5. Click **Generate Sales Orders**.

6. The results panel will show:
   - Orders generated per date
   - Any skipped customers (with reasons)
   - Any underfilled dates
   - The output file will auto-download

## Processing Shipments

1. In Section 2, upload the **Master Shipment File** (the sales order output or any compatible dataset).

2. Select the **Shipment Output Format** (CSV or XLSX).

3. Click **Process Shipments**.

4. The results panel will show:
   - Tracking numbers generated and reused
   - Channel files produced
   - A ZIP file will auto-download containing:
     - Updated master shipment file
     - One file per channel

## Key Behaviors

- **Monday orders** generate for Saturday, Sunday, and Monday (up to 20 orders each day)
- **Retail customers** only get orders on Mondays (2× quantity/pricing)
- **Wholesale customers** only get orders on Wednesdays (4× quantity/pricing)
- Customers without a valid 1:1 channel mapping are silently skipped and reported
- All processing happens locally in your browser — no data is sent anywhere

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MISSING_COLUMN" error | Check that your source file has the exact column names listed in Prerequisites |
| No orders generated | Check if all customers are Retail/Wholesale on a non-eligible weekday |
| ZIP download doesn't start | Ensure browser pop-up blocker is not blocking downloads |
| XLSX files don't open | Ensure you have a spreadsheet application that supports `.xlsx` format |

## Technology Stack

| Component | Library | CDN |
|-----------|---------|-----|
| CSV/XLSX I/O | SheetJS (`xlsx`) | cdnjs |
| ZIP packaging | JSZip | cdnjs |
| File download | FileSaver.js | cdnjs |
