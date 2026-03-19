(function attachOrderGenerator(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  const { addressEngine, dateResolver, fileIO, pricingEngine, utils, validators } = app;

  const CUSTOMER_REQUIRED_COLUMNS = ["CustomerCode", "CustomerName"];
  const MAPPING_REQUIRED_COLUMNS = ["CustomerCode", "Channel", "ChannelNum", "ChannelAccountNum"];
  const SKU_REQUIRED_COLUMNS = ["SKU"];

  function normalizeCustomerType(type) {
    const normalized = String(type || "").trim().toLowerCase();
    if (normalized === "retail") {
      return "Retail";
    }
    if (normalized === "wholesale") {
      return "Wholesale";
    }
    return "Ecommerce";
  }

  function isCustomerEligible(customer, weekday) {
    const code = String(customer.CustomerCode || "").toLowerCase();
    if (code.startsWith("wh-") || code.startsWith("re-") || code.startsWith("cu-")) {
      return weekday === 3 || weekday === 5;
    }

    const type = normalizeCustomerType(customer.Type);
    if (type === "Retail") {
      return weekday === 1;
    }
    if (type === "Wholesale") {
      return weekday === 3;
    }
    return true;
  }

  function buildMappingLookup(mappingRows) {
    return mappingRows.reduce((accumulator, row) => {
      const customerCode = String(row.CustomerCode || "").trim();
      if (!accumulator[customerCode]) {
        accumulator[customerCode] = [];
      }
      accumulator[customerCode].push(row);
      return accumulator;
    }, {});
  }

  function buildOrderRow(shared, line, totals) {
    const row = {};
    validators.SALES_ORDER_HEADERS.forEach(header => {
      row[header] = "";
    });

    row.OrderNumber = shared.OrderNumber;
    
    const code = String(shared.CustomerCode || "").toLowerCase();
    if (code.startsWith("cu-")) {
      row.OrderType = "3";
    } else if (code.startsWith("re-")) {
      row.OrderType = "8";
    } else if (code.startsWith("wh-")) {
      row.OrderType = "0";
    } else {
      row.OrderType = "1";
    }

    row.OrderStatus = "0";
    row.OrderDate = shared.OrderDate;
    row.CustomerCode = shared.CustomerCode;
    row.CustomerName = shared.CustomerName;
    row.Currency = "USD";
    row.SubTotalAmount = totals.SubTotalAmount;
    row.TotalAmount = totals.TotalAmount;
    row.TaxAmount = totals.TaxAmount;
    row.DiscountAmount = totals.DiscountAmount;
    row.ShippingAmount = totals.ShippingAmount;
    row.PaidAmount = "0";
    row.Balance = totals.Balance;
    row["Fulfillment Status"] = " ";
    row["Financial Status"] = " ";
    row.ChannelNum = shared.ChannelNum;
    row.ChannelAccountNum = shared.ChannelAccountNum;
    row.ChannelOrderID = shared.ChannelOrderID;

    row.ShipToName = shared.ShipToName;
    row.ShipToFirstName = shared.ShipToFirstName;
    row.ShipToLastName = shared.ShipToLastName;
    row.ShipToCompany = shared.ShipToCompany;
    row.ShipToAddressLine1 = shared.ShipToAddressLine1;
    row.ShipToAddressLine2 = shared.ShipToAddressLine2;
    row.ShipToAddressLine3 = shared.ShipToAddressLine3;
    row.ShipToCity = shared.ShipToCity;
    row.ShipToState = shared.ShipToState;
    row.ShipToPostalCode = shared.ShipToPostalCode;
    row.ShipToCounty = shared.ShipToCounty;
    row.ShipToCountry = shared.ShipToCountry;
    row.ShipToEmail = shared.ShipToEmail;
    row.ShipToDaytimePhone = shared.ShipToDaytimePhone;

    row.BillToName = shared.BillToName;
    row.BillToCompany = shared.BillToCompany;
    row.BillToAddressLine1 = shared.BillToAddressLine1;
    row.BillToAddressLine2 = shared.BillToAddressLine2;
    row.BillToAddressLine3 = shared.BillToAddressLine3;
    row.BillToCity = shared.BillToCity;
    row.BillToState = shared.BillToState;
    row.BillToPostalCode = shared.BillToPostalCode;
    row.BillToCounty = shared.BillToCounty;
    row.BillToCountry = shared.BillToCountry;
    row.BillToEmail = shared.BillToEmail;
    row.BillToDaytimePhone = shared.BillToDaytimePhone;

    row.SKU = line.SKU;
    row.UOM = "EA";
    row.OrderQty = line.OrderQty;
    row.ShipQty = "0";
    row.OpenQty = line.OrderQty;
    row.Price = line.Price;
    row.ExtAmount = line.ExtAmount;
    row.Stockable = "TRUE";
    row.Taxable = "TRUE";
    row.Costable = "TRUE";
    row.IsProfit = "TRUE";

    return row;
  }

  function validateGeneratedOrders(rows, summary) {
    validators.validateSalesOrderSchema(rows, validators.SALES_ORDER_HEADERS);

    const sequenceTracker = {};
    const skuTracker = {};

    rows.forEach((row) => {
      const orderDate = row.OrderDate;
      const sequence = Number(String(row.OrderNumber).split("-").pop());
      if (!sequenceTracker[orderDate]) {
        sequenceTracker[orderDate] = new Set();
      }
      sequenceTracker[orderDate].add(sequence);

      const orderIdentifier = row.OrderNumber || row.ChannelOrderID;
      if (!skuTracker[orderIdentifier]) {
        skuTracker[orderIdentifier] = new Set();
      }
      if (skuTracker[orderIdentifier].has(row.SKU)) {
        throw validators.createError("INVALID_FORMAT", `Duplicate SKU ${row.SKU} within order ${orderIdentifier}.`);
      }
      skuTracker[orderIdentifier].add(row.SKU);
    });

    Object.entries(summary.ordersPerDate).forEach(([date, count]) => {
      const seen = Array.from(sequenceTracker[date] || []).sort((left, right) => left - right);
      if (seen.length !== count) {
        throw validators.createError("INVALID_FORMAT", `Sequence gap detected for ${date}.`);
      }
      seen.forEach((sequence, index) => {
        if (sequence !== index + 1) {
          throw validators.createError("INVALID_FORMAT", `Non-consecutive order sequence on ${date}.`);
        }
      });
    });
  }

  async function generateSalesOrders(options) {
    const [customerSource, mappingSource, skuSource] = await Promise.all([
      options.customerFile ? fileIO.readFile(options.customerFile) : Promise.resolve(fileIO.parseDefaultData(app.defaultData.customer, "Customer_source.csv")),
      options.mappingFile ? fileIO.readFile(options.mappingFile) : Promise.resolve(fileIO.parseDefaultData(app.defaultData.mapping, "Customer-Channel-ChannelAccountMapping.csv")),
      options.skuFile ? fileIO.readFile(options.skuFile) : Promise.resolve(fileIO.parseDefaultData(app.defaultData.sku, "SKU_Only.csv")),
    ]);

    validators.validateColumns(customerSource.rows, CUSTOMER_REQUIRED_COLUMNS, customerSource.fileName);
    validators.validateColumns(mappingSource.rows, MAPPING_REQUIRED_COLUMNS, mappingSource.fileName);
    validators.validateColumns(skuSource.rows, SKU_REQUIRED_COLUMNS, skuSource.fileName);

    const skuPool = Array.from(
      new Set(
        skuSource.rows
          .map((row) => String(row.SKU || "").trim())
          .filter((sku) => !utils.isBlank(sku))
      )
    );

    if (skuPool.length < 3) {
      throw validators.createError("INSUFFICIENT_DATA", "At least 3 unique SKU values are required.");
    }

    const mappingLookup = buildMappingLookup(mappingSource.rows);
    const skipReports = [];
    const eligibleCustomers = customerSource.rows.reduce((accumulator, row) => {
      const customerCode = String(row.CustomerCode || "").trim();
      const mappings = mappingLookup[customerCode] || [];

      accumulator.push({
        ...row,
        Type: normalizeCustomerType(row.Type),
        mapping: mappings.length > 0 ? mappings[0] : { ChannelNum: "", ChannelAccountNum: "", Channel: "" },
      });
      return accumulator;
    }, []);

    if (!eligibleCustomers.length) {
      throw validators.createError("INSUFFICIENT_DATA", "No eligible customers remain after mapping validation.");
    }

    const resolvedDates = dateResolver.resolveDateRange(options.orderDate);
    const resolvedShipmentDate = dateResolver.resolveShipmentDate(options.shipmentDate);
    const skuRoundRobin = utils.createRoundRobinPool(skuPool);
    const rows = [];
    const ordersPerDate = {};
    const underfilledDates = [];

    resolvedDates.forEach((descriptor) => {
      const todaysCustomers = eligibleCustomers.filter((customer) => isCustomerEligible(customer, descriptor.weekday));
      let sequence = 1;
      let customerIndex = 0;

      if (!todaysCustomers.length) {
        ordersPerDate[descriptor.isoDate] = 0;
        underfilledDates.push({
          Date: descriptor.isoDate,
          Expected: 20,
          Generated: 0,
        });
        return;
      }

      while (sequence <= 20) {
        const customer = todaysCustomers[customerIndex % todaysCustomers.length];
        customerIndex += 1;

        const skuCount = Math.min(utils.randomInt(1, 3), skuPool.length);
        const selectedSkus = skuRoundRobin.drawUnique(skuCount);
        const shipTo = addressEngine.populateShipTo(customer);
        const billTo = addressEngine.populateBillTo(customer, shipTo);
        const { lines, totals } = pricingEngine.createLineItems(selectedSkus, customer.Type, customer.CustomerCode);
        const [yyyy, mm, dd] = descriptor.isoDate.split('-');
        const yy = yyyy.slice(-2);
        const yymmddDate = `${yy}${mm}${dd}`;
        const chNum = customer.mapping.ChannelNum;
        const seqStr = String(sequence).padStart(6, '0');
        const channelOrderID = chNum ? `${chNum}-${yymmddDate}-${seqStr}` : "";

        const shared = {
          OrderNumber: `${descriptor.compactDate}-${sequence}`,
          ChannelOrderID: channelOrderID,
          CustomerCode: customer.CustomerCode,
          CustomerName: customer.CustomerName,
          ChannelNum: customer.mapping.ChannelNum,
          ChannelAccountNum: customer.mapping.ChannelAccountNum,
          OrderDate: descriptor.isoDate,
          ShipmentDate: resolvedShipmentDate.isoDate,
          ...shipTo,
          ...billTo,
        };

        lines.forEach((line) => rows.push(buildOrderRow(shared, line, totals)));
        sequence += 1;
      }

      ordersPerDate[descriptor.isoDate] = sequence - 1;
      if (sequence - 1 < 20) {
        underfilledDates.push({
          Date: descriptor.isoDate,
          Expected: 20,
          Generated: sequence - 1,
        });
      }
    });

    const summary = {
      resolvedDateRange: resolvedDates.map((descriptor) => descriptor.isoDate),
      shipmentDate: resolvedShipmentDate.isoDate,
      ordersPerDate,
      totalRows: rows.length,
      skippedCustomers: skipReports,
      underfilledDates,
    };

    validateGeneratedOrders(rows, summary);

    const firstDate = summary.resolvedDateRange[0] || resolvedShipmentDate.isoDate;
    const filename = `sales-orders-${utils.sanitizeFilename(firstDate)}.${options.outputFormat}`;

    return {
      filename,
      headers: validators.SALES_ORDER_HEADERS,
      rows,
      summary,
    };
  }

  app.orderGenerator = {
    generateSalesOrders,
  };
})(window);
