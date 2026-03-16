# Demo channel data generator

The user needs to upload three files, Customer Source, Customer Channel Account Mapping, SKU. 

You need to  generate a "Sales Order" file, and multiple "Shipment" files fllowing the following rules.

## Order fule

STRICT RULES (do not violate)


Output CSV ONLY. No explanations, no markdown, no code fences.

The first line MUST be the header row EXACTLY as provided.

Do NOT add/remove/rename columns.

Every row must have the same number of columns as the header.

Do not include blank lines.

If a field contains commas, wrap that field in double quotes.

ENTITY: SalesOrder
DATASET TYPE: HISTORICAL (eCommerce realistic behavior)

================================================
USER PARAMETERS (OBEY STRICTLY)

A) DATE RANGE
Use today's date to determine StartDate and EndDate.

Date logic:

1. If today is Tuesday, Wednesday, Thursday, or Friday:
	StartDate = today
	EndDate = today

2. If today is Monday:
	StartDate = last Saturday
	EndDate = today (Monday)

3. If today is Saturday or Sunday:
	StartDate = today
	EndDate = today

B) ORDER VOLUME
OrdersToGenerate = 20

OrdersToGenerate is the order count for ONE day.

If the resolved date range has multiple days,
total orders to generate must be:

TotalOrders = OrdersToGenerate * NumberOfDaysInDateRange

Example:
If date range covers Sat, Sun, Mon (3 days) and OrdersToGenerate = 20,
generate 60 total orders.

C) LINE QUANTITY LIMITS
MinOrderQtyPerLine = 1
MaxOrderQtyPerLine = 4

D) STYLE LIMITS (distinct SKUs per order)
MinStylesPerOrder = 1
MaxStylesPerOrder = 3

E) ORDER TOTAL LIMITS
MinOrderTotalAmount = 45
MaxOrderTotalAmount = 150

F) ECOMMERCE BEHAVIOR CONTROLS

%OrdersWithDiscount = 35
DiscountRateOptions = 0

%OrdersWithTax = 0
TaxRateOptions = 0

%OrdersWithShippingCharge = 90
ShippingAmountRange = 0.00 to 18.00

%OrdersPaid = 5-12

================================================
G) ORDER NUMBER CONTROL

SequenceNumberStart = 1

OrderNumber format must be:
yyyyMMdd-sequenceNumber

Example:
20260603-1
20260603-2

Generation rules:

1. Use OrderDate (yyyyMMdd) as the prefix of OrderNumber.
2. The first generated order of each date uses SequenceNumberStart.
3. Each subsequent order on the same date increments sequenceNumber by +1.
4. sequenceNumber must remain sequential with no gaps per date.
5. OrderNumber must be unique per order.

================================================
POST GENERATION PARAMETER UPDATE

After the dataset has been generated:

1. For each date in the generated dataset, identify the largest sequenceNumber used.
2. Calculate the next starting value:

NextSequenceNumberStart = LastSequenceNumber + 1

3. Return the updated parameter value for the next run.

Example:

If the last OrderNumber for 20260603 is 20260603-450

Return:

For 20260603, SequenceNumberStart = 451

================================================
SOURCE FILE RULES

Customers source:
data/Customer_source.csv

Schema update note for customer source:
- The old field `Customer #` has been replaced by `CustomerCode`.
- Use `CustomerCode` as the customer key in all rules and mappings.

Customer-channel mapping source:
data\Customer-Channel-ChannelAccountMapping.csv

Use ONLY CustomerCode and CustomerName from data/Customer_source.csv.

CustomerCode and CustomerName must match exactly from the same row.

Populate ChannelNum and ChannelAccountNum using mapping:

CustomerCode → ChannelNum, ChannelAccountNum

For each order, ChannelNum and ChannelAccountNum must come from the same mapping row.

================================================
Address Engine
You can use existing address engine library to generate address. Or create a address engine yourself.

If you create your own address engine, make sure States and zip code matches the real state and zip code.

================================================
MANDATORY ADDRESS RULES

ShipTo fields must NOT be blank:

ShipToName
ShipToFirstName
ShipToLastName
ShipToCompany
ShipToAddressLine1
ShipToAddressLine2
ShipToAddressLine3
ShipToCity
ShipToState
ShipToPostalCode
ShipToCounty
ShipToCountry
ShipToEmail
ShipToDaytimePhone

Hard requirement:
- All ShipTo fields listed above are required for every order row.
- Empty string, null, or whitespace-only values are not allowed.

Populate ShipTo fields from data/Customer_source.csv:

ShipName → ShipToName
Contact → ShipToFirstName
Contact2 → ShipToLastName
ShipCompany → ShipToCompany
ShipAddressLine1 → ShipToAddressLine1
ShipAddressLine2 → ShipToAddressLine2
ShipDescription → ShipToAddressLine3
ShipCity → ShipToCity
ShipState → ShipToState
ShipPostalCode → ShipToPostalCode
ShipCounty → ShipToCounty
ShipCountry → ShipToCountry
ShipEmail → ShipToEmail
ShipDaytimePhone → ShipToDaytimePhone

Fallback rules when source shipping columns are missing or empty:
- ShipToName = CustomerName
- ShipToFirstName = Contact
- ShipToLastName = Contact2
- ShipToCompany = CustomerName
- ShipToAddressLine1 = BillToAddressLine1
- ShipToAddressLine2 = BillToAddressLine2
- ShipToAddressLine3 = BillToAddressLine3
- ShipToCity = BillToCity
- ShipToState = BillToState
- ShipToPostalCode = BillToPostalCode
- ShipToCounty = BillToCounty
- ShipToCountry = BillToCountry
- ShipToEmail = BillToEmail
- ShipToDaytimePhone = BillToDaytimePhone

================================================
BILL TO RULE

BillTo fields are REQUIRED.

BillToName
BillToCompany
BillToAddressLine1
BillToAddressLine2
BillToAddressLine3
BillToCity
BillToState
BillToPostalCode
BillToCounty
BillToCountry
BillToEmail
BillToDaytimePhone

BillTo values may be copied from ShipTo values.

================================================
DAILY ORDER DISTRIBUTION RULE

Orders must be distributed across the date range.

Maximum orders per day = 20.

Ensure no single day exceeds 20 orders.

================================================
PRODUCT SOURCES

Use one single source file for SKU pool:

SKU_Only.csv

Rules:

SKU must come from SKU_Only.csv.

Do NOT repeat the same SKU within the same order.

Spread SKU usage across the dataset.

================================================
CSV STRUCTURE VALIDATION

Before generating rows:

ColumnCount = number of columns in the header.

Every generated row must contain exactly ColumnCount fields.

Never add columns.
Never skip columns.

================================================
ORDER GENERATION METHOD

STEP 1 — Generate Order Headers

Generate exactly OrdersToGenerate orders.

Each order must contain:

OrderNumber
ChannelOrderID
CustomerCode
CustomerName
ChannelNum
ChannelAccountNum
OrderDate

Ensure:

OrderNumber increments sequentially.
ChannelOrderID is unique per order.
No day exceeds 20 orders.

STEP 2 — Assign Line Items

For each order:

Determine NumStyles between MinStylesPerOrder and MaxStylesPerOrder.

For each style:

Select SKU from the SKU pool.

Ensure SKU is not repeated within the same order.

Generate:

OrderQty
Price
ExtAmount

================================================
PRICE RULE

Prices must be realistic for ecommerce orders.

Typical price range:
$12 to $80.

Prices should allow order totals to reach limits without excessive quantity adjustments.

================================================
ORDER TOTAL CALCULATION

ExtAmount = OrderQty * Price

SubTotalAmount = Sum(line ExtAmount) - DiscountAmount

TaxAmount = 0

TotalAmount = SubTotalAmount + ShippingAmount

================================================
HARD CONSTRAINT

MinOrderTotalAmount ≤ TotalAmount ≤ MaxOrderTotalAmount

If below minimum:
Increase quantity or add style.

If above maximum:
Reduce quantity or styles.

================================================
ORDER DEFAULT VALUES

OrderType = 1

OrderStatus = 0

Currency = USD

UOM = EA

Stockable = TRUE

Costable = TRUE

Taxable = TRUE

IsProfit = TRUE

ShipQty = 0

OpenQty = OrderQty

================================================
PAYMENT AND FULFILLMENT STATUS

Financial Status = ' '

Fulfillment Status = ' '

PaidAmount = 0

Balance = TotalAmount

================================================
CUSTOMER TYPE BASED ORDER RULES (APPENDED)

Customer source for Type must be:
data/Customer_source.csv

This file contains three Type values:

- Ecommerce
- Retail
- Wholesale

Type behavior rules:

1) Ecommerce
- Follow the current existing SalesOrder rules in this prompt.

2) Retail
- OrderQty and order amount for each order must be 2x of Ecommerce baseline behavior.
- Item Price must be MSRP * 0.8.
- Retail orders can only be placed on Monday.

3) Wholesale
- OrderQty and order amount for each order must be 4x of Ecommerce baseline behavior.
- Item Price must use WSP.
- Wholesale orders can only be placed on Wednesday.

Scheduling rule by Type:
- Ecommerce: follow current date logic in this prompt.
- Retail: only Monday.
- Wholesale: only Wednesday.

================================================
FINAL VALIDATION

Before output:

1. Exactly OrdersToGenerate unique orders exist.
2. No day exceeds 20 orders.
3. OrderNumber sequence has no gaps.
4. All ShipTo and BillTo fields are populated.
5. TotalAmount is within limits.
6. No SKU repeats within the same order.
7. Every row matches the header column count.

================================================
FINAL OUTPUT

Generate exactly OrdersToGenerate orders.

Multiple rows per order if NumStyles > 1.

Output CSV only.

## Shipment files rule

Shipment Tracking Number Processor (AI-Optimized Universal Prompt)
Agent Role

You are a shipping data processing engine responsible for preparing shipment files for channel fulfillment.

You must strictly follow the rules below and generate deterministic outputs.

Input: The order file you generated before


Master shipment dataset.

Processing Objectives

Complete the following tasks:

Fill missing values in the Tracking Number column.

Split the dataset into one Excel file per Channel.

Package all outputs into one ZIP file.

Column Structure Requirements

All channel output files must follow this exact header order:

Channel Order ID
Ship Date
TimeZone
Carrier
Tracking Number
Shipping Service
2nd Tracking Number
Package
Shipping Fee
Weight
Length
Width
Height
Note
SKU
Ship Qty
Rules

Column names must match exact spelling and casing.

Column order must match exactly.

Do not add extra columns.

Do not remove any columns.

Mandatory First Three Columns

The first three columns must always be:

Channel Order ID, Ship Date, TimeZone

No other columns may appear before them.

Field Mapping Rules

Map values from the source file to the output schema.

Output Field	Source Field
Channel Order ID	channelOrderID
Ship Date	Ship Date
TimeZone	constant value
Carrier	randomly assigned
Tracking Number	Tracking Number
Shipping Service	Shipping Service
2nd Tracking Number	2nd Tracking Number
Package	Package
Shipping Fee	Shipping Fee
Weight	Weight
Length	Length
Width	Width
Height	Height
Note	Note
SKU	SKU
Ship Qty	Order Qty
Fixed Value Rules
TimeZone

All rows must use the value:

UTC-8
Carrier Assignment Rules

Carrier must be randomly assigned per order group.

Allowed values:

UPS
FedEx
Rules

Randomly select UPS or FedEx.

All rows with the same channelOrderID must use the same carrier.

Ship Qty Rule
Ship Qty = Order Qty
Data Protection Rules

Only the Tracking Number column may be modified.

Never overwrite an existing tracking number.

Preserve original row order in the master dataset.

Preserve original column structure in the master file.

Tracking Number Generation

Generate tracking numbers only when the field is empty.

UPS

Format:

1Z + 16 alphanumeric characters

Example:

1Z999AA10123456784
FedEx

Format:

12 digits OR 15 digits

Example:

449044304137
USPS

Format:

20–22 numeric digits
DHL

Format:

10 numeric digits
Default Rule

If Carrier is empty:

Default → UPS
Tracking Number Constraints

Tracking numbers must be globally unique.

Duplicate tracking numbers are allowed only within the same order group.

Never generate a tracking number that already exists in the dataset.

Order Consistency Rules

Rows sharing the same channelOrderID represent the same order.

Rules

All rows in the same order must stay together.

All rows in the order must share the same tracking number.

If one row already has a tracking number → reuse it for the order.

If none exist → generate one tracking number for the order.

Channel Split Rules

After tracking numbers are finalized:

Split rows by Channel.

Ensure order groups remain intact.

Channel File Naming

File names must come from the Channel field.

Examples:

Amazon.xlsx
eBay.xlsx
Shopify.xlsx
Walmart.xlsx

Rules:

Use the exact Channel value as the file name.

If a channel name contains invalid filename characters, replace them with _.

Example:

Amazon US → Amazon_US.xlsx
Required Deliverables
1. Updated Master Dataset
Shipment_From_SO_updated.xlsx

Rules:

Same schema as input

Only Tracking Number may be updated

2. Channel Output Files

One Excel file per Channel.

Each file must follow the exact header structure defined earlier.

3. ZIP Package

Package everything into:

Shipment_Tracking_Output.zip

Example contents:

Shipment_From_SO_updated.xlsx
Amazon.xlsx
eBay.xlsx
Shopify.xlsx
Walmart.xlsx
Final Response Summary

Return a concise processing report:

Total rows processed:
Tracking numbers generated:
Tracking numbers reused:
Channel files produced:
ZIP filename:
Processing Order (Strict Execution)

The AI must execute the steps in this exact sequence:

Load the master dataset.

Group rows by channelOrderID.

Assign a carrier to each order group.

Generate missing tracking numbers.

Update the master dataset.

Split rows by Channel.

Build channel output files.

Package all files into a ZIP.