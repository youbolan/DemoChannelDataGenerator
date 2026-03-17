(function attachValidators(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  const utils = app.utils;

  const SALES_ORDER_HEADERS = [
    "OrderNumber", "OrderType", "OrderStatus", "OrderDate", "ShipDate", "DueDate", "BillDate",
    "EtaArrivalDate", "EarliestShipDate", "LatestShipDate", "SignatureFlag", "CustomerCode",
    "CustomerName", "Terms", "TermsDays", "Currency", "SubTotalAmount", "SalesAmount",
    "TotalAmount", "TaxableAmount", "NonTaxableAmount", "TaxRate", "TaxAmount", "DiscountRate",
    "DiscountAmount", "ShippingAmount", "ShippingTaxAmount", "MiscAmount", "MiscTaxAmount",
    "ChargeAndAllowanceAmount", "ChannelAmount", "PaidAmount", "CreditAmount", "Balance",
    "DepositAmount", "SalesRep", "SalesRep2", "SalesRep3", "SalesRep4", "CommissionRate",
    "CommissionRate2", "CommissionRate3", "CommissionRate4", "TotalWeight", "ActualWeight",
    "CancelCode", "SalesDivision", "CustomerSource", "Fulfillment Status", "Financial Status",
    "AmountRefunded", "IsEdi", "ShippingCarrier", "ShippingClass", "MainTrackingNumber",
    "MainReturnTrackingNumber", "ChannelNum", "ChannelAccountNum", "ChannelOrderID",
    "SecondaryChannelOrderID", "ShippingAccount", "RefNum", "CustomerPoNum", "Carton",
    "EndBuyerUserID", "EndBuyerName", "EndBuyerEmail", "ShipToName", "ShipToFirstName",
    "ShipToLastName", "ShipToCompany", "ShipToAddressLine1", "ShipToAddressLine2",
    "ShipToAddressLine3", "ShipToCity", "ShipToState", "ShipToPostalCode", "ShipToCounty",
    "ShipToCountry", "ShipToEmail", "ShipToDaytimePhone", "BillToName", "BillToCompany",
    "BillToAddressLine1", "BillToAddressLine2", "BillToAddressLine3", "BillToCity",
    "BillToState", "BillToPostalCode", "BillToCounty", "BillToCountry", "BillToEmail",
    "BillToDaytimePhone", "Notes", "ShippingCode", "WarehouseCode", "ShipmentID",
    "DepartmentCode", "DivisionCode", "Seq", "ItemDate", "SKU", "UPC", "CustomerSKU",
    "SKUTitle", "LotNum", "Description", "UOM", "PackType", "PackQty", "PackPrice", "OrderPack",
    "ShipPack", "CancelledPack", "OpenPack", "OrderQty", "ShipQty", "CancelledQty", "OpenQty",
    "PriceRule", "Price", "DiscountPrice", "ExtAmount", "ItemTotalAmount", "ShipAmount",
    "CancelledAmount", "OpenAmount", "Stockable", "Taxable", "Costable", "IsProfit",
    "LotInDate", "LotExpDate", "DBChannelOrderLineRowID", "ItemShippingAmount", "ShippingCost",
    "ItemTaxAmount", "ItemShippingTaxAmount", "ItemDiscountRate", "ItemDiscountAmount",
    "ItemNotes", "ItemCancelCode", "Lineitem fulfillment status", "Lineitem taxable",
    "ChannelItemID", "EAN", "MPN", "ExternalBarcode", "PodInfo"
  ];

  const REQUIRED_ADDRESS_FIELDS = [
    "ShipToName", "ShipToFirstName", "ShipToLastName", "ShipToCompany", "ShipToAddressLine1",
    "ShipToCity", "ShipToState", "ShipToPostalCode",
    "ShipToCounty", "ShipToCountry", "ShipToEmail", "ShipToDaytimePhone", "BillToName",
    "BillToCompany", "BillToAddressLine1", "BillToAddressLine2", "BillToAddressLine3",
    "BillToCity", "BillToState", "BillToPostalCode", "BillToCounty", "BillToCountry",
    "BillToEmail", "BillToDaytimePhone",
  ];

  const SHIPMENT_ALIAS_GROUPS = {
    ChannelOrderID: ["ChannelOrderID", "Channel Order ID", "channelOrderID"],
    OrderQty: ["OrderQty", "Order Qty"],
    Channel: ["Channel"],
    Carrier: ["Carrier"],
    TrackingNumber: ["Tracking Number"],
    ShipDate: ["Ship Date"],
    SKU: ["SKU"],
    ShippingService: ["Shipping Service"],
    SecondTrackingNumber: ["2nd Tracking Number"],
    Package: ["Package"],
    ShippingFee: ["Shipping Fee"],
    Weight: ["Weight"],
    Length: ["Length"],
    Width: ["Width"],
    Height: ["Height"],
    Note: ["Note"],
  };

  function createError(category, detail) {
    const error = new Error(`[ERROR] ${category}: ${detail}`);
    error.category = category;
    error.detail = detail;
    return error;
  }

  function normalizeHeader(header) {
    return String(header || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function validateRequiredFiles(files) {
    const missing = Object.entries(files).find(([, file]) => !file);
    if (missing) {
      throw createError("MISSING_FILE", `${missing[0]} is required.`);
    }
  }

  function validateColumns(rows, requiredColumns, fileName) {
    const available = rows.length > 0 ? Object.keys(rows[0]) : [];
    const missing = requiredColumns.filter((column) => !available.includes(column));
    if (missing.length > 0) {
      throw createError("MISSING_COLUMN", `${fileName}: ${missing.join(", ")}`);
    }
  }

  function validateDate(dateStr) {
    if (utils.isBlank(dateStr)) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw createError("INVALID_DATE", `${dateStr} is not in YYYY-MM-DD format.`);
    }

    const parsed = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || utils.formatIsoDate(parsed) !== dateStr) {
      throw createError("INVALID_DATE", `${dateStr} is not a valid calendar date.`);
    }

    return parsed;
  }

  function validateSalesOrderSchema(rows, expectedHeaders = SALES_ORDER_HEADERS) {
    if (!rows.length) {
      throw createError("INSUFFICIENT_DATA", "No sales-order rows were generated.");
    }

    const actualHeaders = Object.keys(rows[0]);
    if (actualHeaders.length !== expectedHeaders.length) {
      throw createError(
        "INVALID_FORMAT",
        `Sales order header count ${actualHeaders.length} does not match ${expectedHeaders.length}.`
      );
    }

    expectedHeaders.forEach((header, index) => {
      if (actualHeaders[index] !== header) {
        throw createError(
          "INVALID_FORMAT",
          `Sales order header mismatch at column ${index + 1}: expected ${header}, received ${actualHeaders[index] || "(missing)"}.`
        );
      }
    });

    rows.forEach((row, rowIndex) => {
      const headers = Object.keys(row);
      if (headers.length !== expectedHeaders.length) {
        throw createError("INVALID_FORMAT", `Row ${rowIndex + 1} has an invalid column count.`);
      }

      REQUIRED_ADDRESS_FIELDS.forEach((field) => {
        if (utils.isBlank(row[field])) {
          throw createError("INVALID_FORMAT", `Row ${rowIndex + 1} has blank ${field}.`);
        }
      });
    });
  }

  function getShipmentAliasLookup() {
    const lookup = {};
    Object.entries(SHIPMENT_ALIAS_GROUPS).forEach(([canonical, aliases]) => {
      aliases.forEach((alias) => {
        lookup[normalizeHeader(alias)] = canonical;
      });
    });
    return lookup;
  }

  function normalizeShipmentHeaders(rows) {
    if (!rows.length) {
      throw createError("INSUFFICIENT_DATA", "Shipment file contains no rows.");
    }

    const aliasLookup = getShipmentAliasLookup();
    return rows.map((row) => {
      const normalized = {};
      Object.entries(row).forEach(([header, value]) => {
        const canonical = aliasLookup[normalizeHeader(header)];
        if (canonical) {
          normalized[canonical] = value;
        } else {
          normalized[header] = value;
        }
      });
      return normalized;
    });
  }

  function validateShipmentRows(rows) {
    const normalizedRows = normalizeShipmentHeaders(rows);
    const available = new Set(Object.keys(normalizedRows[0]));
    ["ChannelOrderID", "OrderQty", "Channel", "SKU"].forEach((required) => {
      if (!available.has(required)) {
        throw createError("MISSING_COLUMN", `Shipment input missing required field ${required}.`);
      }
    });
    return normalizedRows;
  }

  app.validators = {
    SALES_ORDER_HEADERS,
    SHIPMENT_ALIAS_GROUPS,
    REQUIRED_ADDRESS_FIELDS,
    createError,
    normalizeHeader,
    normalizeShipmentHeaders,
    validateColumns,
    validateDate,
    validateRequiredFiles,
    validateSalesOrderSchema,
    validateShipmentRows,
  };
})(window);
