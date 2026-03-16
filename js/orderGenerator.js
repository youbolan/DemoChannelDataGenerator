(function attachOrderGenerator(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  const { addressEngine, dateResolver, fileIO, pricingEngine, utils, validators } = app;

  const CUSTOMER_REQUIRED_COLUMNS = ["CustomerCode", "CustomerName", "Type"];
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
    return {
      OrderNumber: shared.OrderNumber,
      ChannelOrderID: shared.ChannelOrderID,
      CustomerCode: shared.CustomerCode,
      CustomerName: shared.CustomerName,
      Channel: shared.Channel,
      ChannelNum: shared.ChannelNum,
      ChannelAccountNum: shared.ChannelAccountNum,
      OrderDate: shared.OrderDate,
      ShipToName: shared.ShipToName,
      ShipToFirstName: shared.ShipToFirstName,
      ShipToLastName: shared.ShipToLastName,
      ShipToCompany: shared.ShipToCompany,
      ShipToAddressLine1: shared.ShipToAddressLine1,
      ShipToAddressLine2: shared.ShipToAddressLine2,
      ShipToAddressLine3: shared.ShipToAddressLine3,
      ShipToCity: shared.ShipToCity,
      ShipToState: shared.ShipToState,
      ShipToPostalCode: shared.ShipToPostalCode,
      ShipToCounty: shared.ShipToCounty,
      ShipToCountry: shared.ShipToCountry,
      ShipToEmail: shared.ShipToEmail,
      ShipToDaytimePhone: shared.ShipToDaytimePhone,
      BillToName: shared.BillToName,
      BillToCompany: shared.BillToCompany,
      BillToAddressLine1: shared.BillToAddressLine1,
      BillToAddressLine2: shared.BillToAddressLine2,
      BillToAddressLine3: shared.BillToAddressLine3,
      BillToCity: shared.BillToCity,
      BillToState: shared.BillToState,
      BillToPostalCode: shared.BillToPostalCode,
      BillToCounty: shared.BillToCounty,
      BillToCountry: shared.BillToCountry,
      BillToEmail: shared.BillToEmail,
      BillToDaytimePhone: shared.BillToDaytimePhone,
      SKU: line.SKU,
      OrderQty: line.OrderQty,
      Price: line.Price,
      ExtAmount: line.ExtAmount,
      SubTotalAmount: totals.SubTotalAmount,
      DiscountAmount: totals.DiscountAmount,
      TaxAmount: totals.TaxAmount,
      ShippingAmount: totals.ShippingAmount,
      TotalAmount: totals.TotalAmount,
      OrderType: 1,
      OrderStatus: 0,
      Currency: "USD",
      UOM: "EA",
      Stockable: "TRUE",
      Costable: "TRUE",
      Taxable: "TRUE",
      IsProfit: "TRUE",
      ShipQty: 0,
      OpenQty: line.OrderQty,
      "Financial Status": " ",
      "Fulfillment Status": " ",
      PaidAmount: 0,
      Balance: totals.Balance,
    };
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

      if (!skuTracker[row.ChannelOrderID]) {
        skuTracker[row.ChannelOrderID] = new Set();
      }
      if (skuTracker[row.ChannelOrderID].has(row.SKU)) {
        throw validators.createError("INVALID_FORMAT", `Duplicate SKU ${row.SKU} within order ${row.ChannelOrderID}.`);
      }
      skuTracker[row.ChannelOrderID].add(row.SKU);
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
    validators.validateRequiredFiles({
      customerFile: options.customerFile,
      mappingFile: options.mappingFile,
      skuFile: options.skuFile,
    });

    const [customerSource, mappingSource, skuSource] = await Promise.all([
      fileIO.readFile(options.customerFile),
      fileIO.readFile(options.mappingFile),
      fileIO.readFile(options.skuFile),
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

      if (mappings.length !== 1 || utils.isBlank(mappings[0].Channel)) {
        skipReports.push({
          CustomerCode: customerCode,
          CustomerName: row.CustomerName || "",
          Reason: mappings.length === 0 ? "UNMAPPED_CUSTOMER" : mappings.length > 1 ? "AMBIGUOUS_MAPPING" : "MISSING_CHANNEL",
        });
        return accumulator;
      }

      accumulator.push({
        ...row,
        Type: normalizeCustomerType(row.Type),
        mapping: mappings[0],
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
        const { lines, totals } = pricingEngine.createLineItems(selectedSkus, customer.Type);
        const shared = {
          OrderNumber: `${descriptor.compactDate}-${sequence}`,
          ChannelOrderID: utils.generateUUID(),
          CustomerCode: customer.CustomerCode,
          CustomerName: customer.CustomerName,
          Channel: customer.mapping.Channel,
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
