(function attachShipmentProcessor(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  const { fileIO, utils, validators } = app;

  const CHANNEL_HEADERS = [
    "Channel Order ID", "Ship Date", "TimeZone", "Carrier", "Tracking Number", "Shipping Service",
    "2nd Tracking Number", "Package", "Shipping Fee", "Weight", "Length", "Width", "Height",
    "Note", "SKU", "Ship Qty",
  ];

  const APPENDED_MASTER_HEADERS = [
    "Ship Date", "Carrier", "Tracking Number", "Shipping Service", "2nd Tracking Number", "Package",
    "Shipping Fee", "Weight", "Length", "Width", "Height", "Note",
  ];

  function randomAlphaNumeric(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let value = "";
    for (let index = 0; index < length; index += 1) {
      value += chars.charAt(utils.randomInt(0, chars.length - 1));
    }
    return value;
  }

  function generateTrackingNumber(carrier, existingValues) {
    let trackingNumber = "";
    do {
      if (carrier === "UPS") {
        trackingNumber = `1Z${randomAlphaNumeric(16)}`;
      } else {
        const length = utils.randomChoice([12, 15]);
        trackingNumber = Array.from({ length }, () => utils.randomInt(0, 9)).join("");
      }
    } while (existingValues.has(trackingNumber));

    existingValues.add(trackingNumber);
    return trackingNumber;
  }

  function groupByOrder(rows) {
    return rows.reduce((accumulator, row, index) => {
      const key = row.ChannelOrderID;
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push({ row, index });
      return accumulator;
    }, {});
  }

  function buildUpdatedMasterRows(originalRows, normalizedRows, shipmentDate) {
    const trackingValues = new Set(
      normalizedRows
        .map((row) => row.TrackingNumber)
        .filter((value) => !utils.isBlank(value))
    );
    const groups = groupByOrder(normalizedRows);
    const updatedRows = originalRows.map((row) => ({ ...row }));
    let generatedTrackingCount = 0;
    let reusedTrackingCount = 0;

    Object.values(groups).forEach((entries) => {
      const normalizedGroupRows = entries.map((entry) => entry.row);
      const carrier = normalizedGroupRows.find((row) => !utils.isBlank(row.Carrier))?.Carrier || utils.randomChoice(["UPS", "FedEx"]);
      const reusedTracking = normalizedGroupRows.find((row) => !utils.isBlank(row.TrackingNumber))?.TrackingNumber;
      const trackingNumber = reusedTracking || generateTrackingNumber(carrier, trackingValues);

      if (reusedTracking) {
        reusedTrackingCount += 1;
      } else {
        generatedTrackingCount += 1;
      }

      entries.forEach(({ row, index }) => {
        const baseRow = updatedRows[index];
        baseRow.Carrier = carrier;
        baseRow["Tracking Number"] = trackingNumber;

        if (!Object.prototype.hasOwnProperty.call(baseRow, "Ship Date")) {
          baseRow["Ship Date"] = shipmentDate;
        }
        if (!Object.prototype.hasOwnProperty.call(baseRow, "Shipping Service")) {
          baseRow["Shipping Service"] = row.ShippingService || "";
        }
        if (!Object.prototype.hasOwnProperty.call(baseRow, "2nd Tracking Number")) {
          baseRow["2nd Tracking Number"] = row.SecondTrackingNumber || "";
        }
        if (!Object.prototype.hasOwnProperty.call(baseRow, "Package")) {
          baseRow.Package = row.Package || "";
        }
        if (!Object.prototype.hasOwnProperty.call(baseRow, "Shipping Fee")) {
          baseRow["Shipping Fee"] = row.ShippingFee || "";
        }
        if (!Object.prototype.hasOwnProperty.call(baseRow, "Weight")) {
          baseRow.Weight = row.Weight || "";
        }
        if (!Object.prototype.hasOwnProperty.call(baseRow, "Length")) {
          baseRow.Length = row.Length || "";
        }
        if (!Object.prototype.hasOwnProperty.call(baseRow, "Width")) {
          baseRow.Width = row.Width || "";
        }
        if (!Object.prototype.hasOwnProperty.call(baseRow, "Height")) {
          baseRow.Height = row.Height || "";
        }
        if (!Object.prototype.hasOwnProperty.call(baseRow, "Note")) {
          baseRow.Note = row.Note || "";
        }
      });
    });

    return {
      generatedTrackingCount,
      reusedTrackingCount,
      updatedRows,
    };
  }

  function buildUpdatedMasterHeaders(originalRows) {
    const originalHeaders = Object.keys(originalRows[0] || {});
    const missingHeaders = APPENDED_MASTER_HEADERS.filter((header) => !originalHeaders.includes(header));
    if (!originalHeaders.includes("Carrier")) {
      missingHeaders.unshift("Carrier");
    }
    if (!originalHeaders.includes("Tracking Number")) {
      const carrierIndex = missingHeaders.indexOf("Tracking Number");
      if (carrierIndex === -1) {
        missingHeaders.push("Tracking Number");
      }
    }
    return originalHeaders.concat(missingHeaders.filter((header, index, array) => array.indexOf(header) === index));
  }

  function buildChannelRows(normalizedRows, updatedRows, shipmentDate) {
    return normalizedRows.map((row, index) => {
      const updated = updatedRows[index];
      return {
        Channel: row.Channel,
        values: {
          "Channel Order ID": row.ChannelOrderID,
          "Ship Date": shipmentDate,
          TimeZone: "UTC-8",
          Carrier: updated.Carrier || row.Carrier || "",
          "Tracking Number": updated["Tracking Number"] || row.TrackingNumber || "",
          "Shipping Service": row.ShippingService || "",
          "2nd Tracking Number": row.SecondTrackingNumber || "",
          Package: row.Package || "",
          "Shipping Fee": row.ShippingFee || "",
          Weight: row.Weight || "",
          Length: row.Length || "",
          Width: row.Width || "",
          Height: row.Height || "",
          Note: row.Note || "",
          SKU: row.SKU,
          "Ship Qty": row.OrderQty,
        },
      };
    });
  }

  async function processShipments(options) {
    const source = await fileIO.readFile(options.masterFile);
    const normalizedRows = validators.validateShipmentRows(source.rows);
    const { updatedRows, generatedTrackingCount, reusedTrackingCount } = buildUpdatedMasterRows(
      source.rows,
      normalizedRows,
      options.shipmentDate
    );

    const channelRows = buildChannelRows(normalizedRows, updatedRows, options.shipmentDate);
    const groupedByChannel = channelRows.reduce((accumulator, entry) => {
      if (!accumulator[entry.Channel]) {
        accumulator[entry.Channel] = [];
      }
      accumulator[entry.Channel].push(entry.values);
      return accumulator;
    }, {});

    const zip = new global.JSZip();
    const channelFiles = [];
    const updatedMasterHeaders = buildUpdatedMasterHeaders(updatedRows);
    const masterExtension = options.outputFormat;
    const masterFilename = `updated-master-shipment.${masterExtension}`;
    const masterFile = fileIO.writeFile(updatedRows, updatedMasterHeaders, masterFilename, masterExtension);
    zip.file(masterFilename, masterFile.blob);

    Object.entries(groupedByChannel).forEach(([channel, rows]) => {
      const extension = options.outputFormat;
      const filename = `${utils.sanitizeFilename(channel)}.${extension}`;
      const channelFile = fileIO.writeFile(rows, CHANNEL_HEADERS, filename, extension);
      zip.file(filename, channelFile.blob);
      channelFiles.push(filename);
    });

    const zipBlob = await zip.generateAsync({ type: "blob" });

    return {
      zipBlob,
      zipFilename: `shipment-package-${utils.sanitizeFilename(options.shipmentDate)}.zip`,
      updatedMasterFilename: masterFilename,
      updatedMasterHeaders,
      updatedMasterRows: updatedRows,
      summary: {
        totalRowsProcessed: updatedRows.length,
        trackingNumbersGenerated: generatedTrackingCount,
        trackingNumbersReused: reusedTrackingCount,
        channelFilesProduced: channelFiles,
        zipFilename: `shipment-package-${utils.sanitizeFilename(options.shipmentDate)}.zip`,
      },
    };
  }

  app.shipmentProcessor = {
    CHANNEL_HEADERS,
    processShipments,
  };
})(window);
