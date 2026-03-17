(function attachFileIO(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});

  async function readFile(file) {
    try {
      const data = await file.arrayBuffer();
      const workbook = global.XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const items = global.XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });
      const mappedRows = [];
      const finalHeaders = new Set();
      
      items.forEach(item => {
        const normalized = {};
        for(const k in item) { 
          let newKey = String(k || "").trim();
          
          if (newKey === "Channel Name") newKey = "Channel";
          if (newKey === "Channel Num") newKey = "ChannelNum";
          if (newKey === "Channel Account Num") newKey = "ChannelAccountNum";
          if (newKey === "Customer Code") newKey = "CustomerCode";
          if (newKey === "Customer Name") newKey = "CustomerName";

          normalized[newKey] = item[k];
          finalHeaders.add(newKey);
        }
        mappedRows.push(normalized);
      });

      return {
        fileName: file.name,
        rows: mappedRows,
        headers: Array.from(finalHeaders),
      };
    } catch (error) {
      const validators = app.validators;
      throw validators.createError("INVALID_FORMAT", `${file.name}: ${error.message}`);
    }
  }

  async function fetchFile(url, fileName) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.arrayBuffer();
      const workbook = global.XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const items = global.XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });
      const mappedRows = [];
      const finalHeaders = new Set();
      
      items.forEach(item => {
        const normalized = {};
        for(const k in item) { 
          let newKey = String(k || "").trim();
          
          if (newKey === "Channel Name") newKey = "Channel";
          if (newKey === "Channel Num") newKey = "ChannelNum";
          if (newKey === "Channel Account Num") newKey = "ChannelAccountNum";
          if (newKey === "Customer Code") newKey = "CustomerCode";
          if (newKey === "Customer Name") newKey = "CustomerName";

          normalized[newKey] = item[k];
          finalHeaders.add(newKey);
        }
        mappedRows.push(normalized);
      });

      return {
        fileName,
        rows: mappedRows,
        headers: Array.from(finalHeaders),
      };
    } catch (error) {
      const validators = app.validators;
      throw validators.createError("INVALID_FORMAT", `${fileName}: ${error.message}`);
    }
  }

  function parseDefaultData(csvString, fileName) {
    try {
      const workbook = global.XLSX.read(csvString, { type: "string" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const items = global.XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });
      const mappedRows = [];
      const finalHeaders = new Set();
      
      items.forEach(item => {
        const normalized = {};
        for(const k in item) { 
          let newKey = String(k || "").trim();
          
          if (newKey === "Channel Name") newKey = "Channel";
          if (newKey === "Channel Num") newKey = "ChannelNum";
          if (newKey === "Channel Account Num") newKey = "ChannelAccountNum";
          if (newKey === "Customer Code") newKey = "CustomerCode";
          if (newKey === "Customer Name") newKey = "CustomerName";

          normalized[newKey] = item[k];
          finalHeaders.add(newKey);
        }
        mappedRows.push(normalized);
      });

      return {
        fileName,
        rows: mappedRows,
        headers: Array.from(finalHeaders),
      };
    } catch (error) {
      const validators = app.validators;
      throw validators.createError("INVALID_FORMAT", `${fileName}: ${error.message}`);
    }
  }

  function prepareRows(data, headers) {
    return data.map((row) => headers.reduce((accumulator, header) => {
      accumulator[header] = row[header] ?? "";
      return accumulator;
    }, {}));
  }

  function writeFile(data, headers, filename, format) {
    const rows = prepareRows(data, headers);
    const worksheet = global.XLSX.utils.json_to_sheet(rows, {
      header: headers,
      skipHeader: false,
    });
    const workbook = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    if (format === "csv") {
      const csv = global.XLSX.utils.sheet_to_csv(worksheet, { FS: ",", RS: "\n" });
      return {
        blob: new Blob([csv], { type: "text/csv;charset=utf-8" }),
        filename,
      };
    }

    const arrayBuffer = global.XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    return {
      blob: new Blob(
        [arrayBuffer],
        {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      ),
      filename,
    };
  }

  function downloadFile(blob, filename) {
    global.saveAs(blob, filename);
  }

  app.fileIO = {
    downloadFile,
    readFile,
    fetchFile,
    writeFile,
    parseDefaultData,
  };
})(window);
