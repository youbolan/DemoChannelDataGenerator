(function attachFileIO(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});

  async function readFile(file) {
    try {
      const data = await file.arrayBuffer();
      const workbook = global.XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = global.XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      return {
        fileName: file.name,
        rows,
        headers: rows.length > 0 ? Object.keys(rows[0]) : [],
      };
    } catch (error) {
      const validators = app.validators;
      throw validators.createError("INVALID_FORMAT", `${file.name}: ${error.message}`);
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
    writeFile,
  };
})(window);
