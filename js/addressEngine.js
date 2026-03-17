(function attachAddressEngine(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  const utils = app.utils;

  const BILL_FIELDS = [
    "BillToName", "BillToCompany", "BillToAddressLine1", "BillToAddressLine2", "BillToAddressLine3",
    "BillToCity", "BillToState", "BillToPostalCode", "BillToCounty", "BillToCountry",
    "BillToEmail", "BillToDaytimePhone",
  ];

  const US_LOCATIONS = [
    { state: "NY", city: "New York", zipCode: "10001" },
    { state: "TX", city: "Austin", zipCode: "73301" },
    { state: "FL", city: "Miami", zipCode: "33101" },
    { state: "IL", city: "Chicago", zipCode: "60601" },
    { state: "PA", city: "Philadelphia", zipCode: "19019" },
    { state: "OH", city: "Columbus", zipCode: "43215" },
    { state: "GA", city: "Atlanta", zipCode: "30303" },
    { state: "NC", city: "Charlotte", zipCode: "28202" },
    { state: "MI", city: "Detroit", zipCode: "48201" },
    { state: "WA", city: "Seattle", zipCode: "98101" },
    { state: "CO", city: "Denver", zipCode: "80202" },
    { state: "MA", city: "Boston", zipCode: "02108" },
    { state: "VA", city: "Richmond", zipCode: "23219" },
    { state: "NJ", city: "Newark", zipCode: "07102" },
    { state: "AZ", city: "Phoenix", zipCode: "85001" },
    { state: "NV", city: "Las Vegas", zipCode: "89101" },
    { state: "OR", city: "Portland", zipCode: "97204" },
    { state: "UT", city: "Salt Lake City", zipCode: "84101" },
    { state: "MN", city: "Minneapolis", zipCode: "55401" },
    { state: "TN", city: "Nashville", zipCode: "37201" },
  ];

  const LINE2_VARIATIONS = [
    "",
    "Apt 4B",
    "Suite 100",
    "Unit 12",
    "Floor 2",
    "Room 304",
    "Building C",
    "PO Box 1234",
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
    // Determine if we should randomize the location/address 
    // Usually we keep wholesale to exactly what's on their account
    const isWholesale = String(customerRow.Type || "").trim().toLowerCase() === "wholesale";
    
    let state = firstNonBlank(customerRow.ShipState, customerRow.BillToState, "UNKNOWN");
    let city = firstNonBlank(customerRow.ShipCity, customerRow.BillToCity, "UNKNOWN");
    let postalCode = firstNonBlank(customerRow.ShipPostalCode, customerRow.BillToPostalCode, "00000");
    let line2 = firstNonBlank(customerRow.ShipAddressLine2, customerRow.BillToAddressLine2, "");

    if (!isWholesale) {
      const randomLoc = utils.randomChoice(US_LOCATIONS);
      state = randomLoc.state;
      city = randomLoc.city;
      postalCode = randomLoc.zipCode;
      line2 = utils.randomChoice(LINE2_VARIATIONS);
    }

    const seedShipTo = {
      ShipToName: firstNonBlank(customerRow.ShipName, customerRow.CustomerName),
      ShipToFirstName: firstNonBlank(customerRow.Contact, customerRow.CustomerName),
      ShipToLastName: firstNonBlank(customerRow.Contact2, customerRow.CustomerName),
      ShipToCompany: firstNonBlank(customerRow.ShipCompany, customerRow.CustomerName),
      ShipToAddressLine1: firstNonBlank(customerRow.ShipAddressLine1, customerRow.BillToAddressLine1, "UNKNOWN"),
      ShipToAddressLine2: line2,
      ShipToAddressLine3: firstNonBlank(customerRow.ShipDescription, customerRow.BillToAddressLine3, "UNKNOWN"),
      ShipToCity: city,
      ShipToState: state,
      ShipToPostalCode: postalCode,
      ShipToCounty: firstNonBlank(customerRow.ShipCounty, customerRow.BillToCounty, "UNKNOWN"),
      ShipToCountry: firstNonBlank(customerRow.ShipCountry, customerRow.BillToCountry, "US"),
      ShipToEmail: firstNonBlank(customerRow.ShipEmail, customerRow.BillToEmail, "unknown@example.com"),
      ShipToDaytimePhone: firstNonBlank(customerRow.ShipDaytimePhone, customerRow.BillToDaytimePhone, "0000000000"),
    };

    Object.keys(seedShipTo).forEach((field) => {
      // AddressLine2 and 3 are allowed to be blank for the formatter (Validators might complain but this is correct)
      if (utils.isBlank(seedShipTo[field]) && field !== "ShipToAddressLine2" && field !== "ShipToAddressLine3") {
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
