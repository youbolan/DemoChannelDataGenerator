(function attachApp(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  const { dateResolver, fileIO, orderGenerator, shipmentProcessor, utils } = app;

  function focusResults(element) {
    element.focus();
  }

  function renderError(container, error) {
    container.dataset.state = "error";
    container.setAttribute("role", "alert");
    container.innerHTML = `<p class="error-line">${utils.escapeHtml(error.message)}</p>`;
    focusResults(container);
  }

  function renderTable(headers, rows) {
    if (!rows.length) {
      return "<p class=\"muted\">None</p>";
    }

    const head = headers.map((header) => `<th>${utils.escapeHtml(header)}</th>`).join("");
    const body = rows.map((row) => {
      const cells = headers.map((header) => `<td>${utils.escapeHtml(row[header] ?? "")}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }

  function renderOrderSummary(container, result) {
    const dateRows = Object.entries(result.summary.ordersPerDate).map(([date, count]) => ({
      Date: date,
      Orders: count,
    }));

    container.dataset.state = "success";
    container.setAttribute("role", "status");
    container.innerHTML = `
      <h3>Sales Order Generation Complete</h3>
      <p><strong>Resolved Date Range:</strong> ${utils.escapeHtml(result.summary.resolvedDateRange.join(", "))}</p>
      <p><strong>Shipment Date:</strong> ${utils.escapeHtml(result.summary.shipmentDate)}</p>
      <p><strong>Total Rows Generated:</strong> ${result.summary.totalRows}</p>
      <h4>Orders Generated per Date</h4>
      ${renderTable(["Date", "Orders"], dateRows)}
      <h4>Skipped Customers</h4>
      ${renderTable(["CustomerCode", "CustomerName", "Reason"], result.summary.skippedCustomers)}
      <h4>Underfilled Dates</h4>
      ${renderTable(["Date", "Expected", "Generated"], result.summary.underfilledDates)}
    `;
    focusResults(container);
  }

  function renderShipmentSummary(container, result) {
    const channelRows = result.summary.channelFilesProduced.map((file) => ({ Filename: file }));
    container.dataset.state = "success";
    container.setAttribute("role", "status");
    container.innerHTML = `
      <h3>Shipment Processing Complete</h3>
      <p><strong>Total Rows Processed:</strong> ${result.summary.totalRowsProcessed}</p>
      <p><strong>Tracking Numbers Generated:</strong> ${result.summary.trackingNumbersGenerated}</p>
      <p><strong>Tracking Numbers Reused:</strong> ${result.summary.trackingNumbersReused}</p>
      <p><strong>ZIP Filename:</strong> ${utils.escapeHtml(result.summary.zipFilename)}</p>
      <h4>Channel Files Produced</h4>
      ${renderTable(["Filename"], channelRows)}
    `;
    focusResults(container);
  }

  function setDefaultDates() {
    const orderDateInput = document.getElementById("order-date");
    const shipmentDateInput = document.getElementById("shipment-date");
    orderDateInput.value = dateResolver.resolveDateRange()[0].isoDate;
    shipmentDateInput.value = dateResolver.resolveShipmentDate().isoDate;
  }

  function toggleButtonState() {
    document.getElementById("generate-btn").disabled = !(
      document.getElementById("customer-file").files[0]
      && document.getElementById("mapping-file").files[0]
      && document.getElementById("sku-file").files[0]
    );

    document.getElementById("process-btn").disabled = !document.getElementById("shipment-master-file").files[0];
  }

  async function handleSalesOrderSubmit(event) {
    event.preventDefault();
    const results = document.getElementById("order-results");
    results.innerHTML = "<p class=\"muted\">Generating sales orders...</p>";
    results.dataset.state = "loading";

    try {
      const outputFormat = document.getElementById("order-output-format").value;
      const generation = await orderGenerator.generateSalesOrders({
        customerFile: document.getElementById("customer-file").files[0],
        mappingFile: document.getElementById("mapping-file").files[0],
        skuFile: document.getElementById("sku-file").files[0],
        orderDate: document.getElementById("order-date").value,
        shipmentDate: document.getElementById("shipment-date").value,
        outputFormat,
      });

      const output = fileIO.writeFile(generation.rows, generation.headers, generation.filename, outputFormat);
      fileIO.downloadFile(output.blob, output.filename);
      renderOrderSummary(results, generation);
    } catch (error) {
      renderError(results, error);
    }
  }

  async function handleShipmentSubmit(event) {
    event.preventDefault();
    const results = document.getElementById("shipment-results");
    results.innerHTML = "<p class=\"muted\">Processing shipments...</p>";
    results.dataset.state = "loading";

    try {
      const shipmentDate = document.getElementById("shipment-date").value || dateResolver.resolveShipmentDate().isoDate;
      const result = await shipmentProcessor.processShipments({
        masterFile: document.getElementById("shipment-master-file").files[0],
        shipmentDate,
        outputFormat: document.getElementById("shipment-output-format").value,
      });

      fileIO.downloadFile(result.zipBlob, result.zipFilename);
      renderShipmentSummary(results, result);
    } catch (error) {
      renderError(results, error);
    }
  }

  function init() {
    setDefaultDates();

    [
      "customer-file",
      "mapping-file",
      "sku-file",
      "shipment-master-file",
    ].forEach((id) => {
      document.getElementById(id).addEventListener("change", toggleButtonState);
    });

    document.getElementById("sales-order-form").addEventListener("submit", handleSalesOrderSubmit);
    document.getElementById("shipment-form").addEventListener("submit", handleShipmentSubmit);
  }

  global.addEventListener("DOMContentLoaded", init);
})(window);
