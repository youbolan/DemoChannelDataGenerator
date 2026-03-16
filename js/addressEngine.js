(function attachAddressEngine(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  const utils = app.utils;

  const BILL_FIELDS = [
    "BillToName", "BillToCompany", "BillToAddressLine1", "BillToAddressLine2", "BillToAddressLine3",
    "BillToCity", "BillToState", "BillToPostalCode", "BillToCounty", "BillToCountry",
    "BillToEmail", "BillToDaytimePhone",
  ];

  function firstNonBlank(...values) {
    return values.find((value) => !utils.isBlank(value)) ?? "";
  }

  function populateBillTo(customerRow, shipToData) {
    const billTo = {
      BillToName: firstNonBlank(customerRow.BillToName, shipToData.ShipToName, customerRow.CustomerName),
      BillToCompany: firstNonBlank(customerRow.BillToCompany, shipToData.ShipToCompany, customerRow.CustomerName),
      BillToAddressLine1: firstNonBlank(customerRow.BillToAddressLine1, shipToData.ShipToAddressLine1, "UNKNOWN"),
      BillToAddressLine2: firstNonBlank(customerRow.BillToAddressLine2, shipToData.ShipToAddressLine2, "UNKNOWN"),
      BillToAddressLine3: firstNonBlank(customerRow.BillToAddressLine3, shipToData.ShipToAddressLine3, "UNKNOWN"),
      BillToCity: firstNonBlank(customerRow.BillToCity, shipToData.ShipToCity, "UNKNOWN"),
      BillToState: firstNonBlank(customerRow.BillToState, shipToData.ShipToState, "UNKNOWN"),
      BillToPostalCode: firstNonBlank(customerRow.BillToPostalCode, shipToData.ShipToPostalCode, "00000"),
      BillToCounty: firstNonBlank(customerRow.BillToCounty, shipToData.ShipToCounty, "UNKNOWN"),
      BillToCountry: firstNonBlank(customerRow.BillToCountry, shipToData.ShipToCountry, "US"),
      BillToEmail: firstNonBlank(customerRow.BillToEmail, shipToData.ShipToEmail, "unknown@example.com"),
      BillToDaytimePhone: firstNonBlank(customerRow.BillToDaytimePhone, shipToData.ShipToDaytimePhone, "0000000000"),
    };

    BILL_FIELDS.forEach((field) => {
      if (utils.isBlank(billTo[field])) {
        billTo[field] = "UNKNOWN";
      }
    });

    return billTo;
  }

  function populateShipTo(customerRow) {
    const seedShipTo = {
      ShipToName: firstNonBlank(customerRow.ShipName, customerRow.CustomerName),
      ShipToFirstName: firstNonBlank(customerRow.Contact, customerRow.CustomerName),
      ShipToLastName: firstNonBlank(customerRow.Contact2, customerRow.CustomerName),
      ShipToCompany: firstNonBlank(customerRow.ShipCompany, customerRow.CustomerName),
      ShipToAddressLine1: firstNonBlank(customerRow.ShipAddressLine1, customerRow.BillToAddressLine1, "UNKNOWN"),
      ShipToAddressLine2: firstNonBlank(customerRow.ShipAddressLine2, customerRow.BillToAddressLine2, "UNKNOWN"),
      ShipToAddressLine3: firstNonBlank(customerRow.ShipDescription, customerRow.BillToAddressLine3, "UNKNOWN"),
      ShipToCity: firstNonBlank(customerRow.ShipCity, customerRow.BillToCity, "UNKNOWN"),
      ShipToState: firstNonBlank(customerRow.ShipState, customerRow.BillToState, "UNKNOWN"),
      ShipToPostalCode: firstNonBlank(customerRow.ShipPostalCode, customerRow.BillToPostalCode, "00000"),
      ShipToCounty: firstNonBlank(customerRow.ShipCounty, customerRow.BillToCounty, "UNKNOWN"),
      ShipToCountry: firstNonBlank(customerRow.ShipCountry, customerRow.BillToCountry, "US"),
      ShipToEmail: firstNonBlank(customerRow.ShipEmail, customerRow.BillToEmail, "unknown@example.com"),
      ShipToDaytimePhone: firstNonBlank(customerRow.ShipDaytimePhone, customerRow.BillToDaytimePhone, "0000000000"),
    };

    Object.keys(seedShipTo).forEach((field) => {
      if (utils.isBlank(seedShipTo[field])) {
        seedShipTo[field] = "UNKNOWN";
      }
    });

    return seedShipTo;
  }

  app.addressEngine = {
    populateBillTo,
    populateShipTo,
  };
})(window);
