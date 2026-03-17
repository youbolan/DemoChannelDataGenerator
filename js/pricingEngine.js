(function attachPricingEngine(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  const utils = app.utils;

  function getTypeConfig(customerType, customerCode) {
    let config;
    switch ((customerType || "Ecommerce").toLowerCase()) {
      case "retail":
        config = {
          qtyMin: 2,
          qtyMax: 8,
          totalMin: 90,
          totalMax: 300,
          priceMultiplier: () => 0.8,
        };
        break;
      case "wholesale":
        config = {
          qtyMin: 4,
          qtyMax: 16,
          totalMin: 180,
          totalMax: 600,
          priceMultiplier: () => utils.randomInt(50, 60) / 100,
        };
        break;
      default:
        config = {
          qtyMin: 1,
          qtyMax: 4,
          totalMin: 45,
          totalMax: 150,
          priceMultiplier: () => 1,
        };
        break;
    }

    const code = String(customerCode || "").toLowerCase();
    if (code.startsWith("wh-")) {
      config.totalMax = 350;
    } else if (code.startsWith("re-")) {
      config.totalMax = 200;
    } else if (code.startsWith("cu-")) {
      config.totalMax = 180;
    } else {
      config.totalMax = 105;
    }

    if (config.totalMin > config.totalMax) {
      config.totalMin = config.totalMax;
    }

    return config;
  }

  function createLineItems(skus, customerType, customerCode) {
    const config = getTypeConfig(customerType, customerCode);
    const shippingAmount = Math.random() <= 0.9 ? utils.roundCurrency(utils.randomInt(0, 1800) / 100) : 0;

    for (let attempt = 0; attempt < 300; attempt += 1) {
      const lines = skus.map((sku) => {
        const quantity = utils.randomInt(config.qtyMin, config.qtyMax);
        const basePrice = utils.randomInt(1200, 8000) / 100;
        const price = utils.roundCurrency(basePrice * config.priceMultiplier());
        const extAmount = utils.roundCurrency(quantity * price);

        return {
          SKU: sku,
          OrderQty: quantity,
          Price: price,
          ExtAmount: extAmount,
        };
      });

      const totals = calculateOrderTotals(lines, customerType, shippingAmount);
      if (totals.TotalAmount >= config.totalMin && totals.TotalAmount <= config.totalMax) {
        return { lines, totals };
      }
    }

    const fallbackLines = skus.map((sku, index) => {
      const quantity = Math.max(config.qtyMin, Math.min(config.qtyMax, config.qtyMin + index));
      const midpoint = utils.roundCurrency((config.totalMin + config.totalMax) / 2 / skus.length / quantity);
      const price = utils.roundCurrency(Math.max(12, Math.min(80, midpoint)));
      return {
        SKU: sku,
        OrderQty: quantity,
        Price: price,
        ExtAmount: utils.roundCurrency(quantity * price),
      };
    });

    return {
      lines: fallbackLines,
      totals: calculateOrderTotals(fallbackLines, customerType, 0),
    };
  }

  function calculateOrderTotals(lines, customerType, forcedShippingAmount) {
    const subtotal = utils.roundCurrency(lines.reduce((sum, line) => sum + line.ExtAmount, 0));
    const shippingAmount = forcedShippingAmount ?? (Math.random() <= 0.9 ? utils.roundCurrency(utils.randomInt(0, 1800) / 100) : 0);
    const discountAmount = 0;
    const taxAmount = 0;
    const totalAmount = utils.roundCurrency(subtotal - discountAmount + taxAmount + shippingAmount);

    return {
      CustomerType: customerType,
      SubTotalAmount: subtotal,
      DiscountAmount: discountAmount,
      TaxAmount: taxAmount,
      ShippingAmount: shippingAmount,
      TotalAmount: totalAmount,
      PaidAmount: 0,
      Balance: totalAmount,
    };
  }

  app.pricingEngine = {
    calculateOrderTotals,
    createLineItems,
  };
})(window);
