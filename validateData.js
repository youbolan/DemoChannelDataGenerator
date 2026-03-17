const fs = require('fs');
const xlsx = require('xlsx');

// Mock browser globals for our scripts
global.XLSX = xlsx;
global.window = global;

// Load the app modules
require('./js/utils.js');
require('./js/validators.js');
require('./js/dateResolver.js');
require('./js/addressEngine.js');
require('./js/pricingEngine.js');
require('./js/fileIO.js');
require('./js/orderGenerator.js');

const app = global.DemoChannelDataGenerator;

// Create a mock Blob/saveAs implementation for headless testing
global.Blob = class Blob {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }
};
global.saveAs = function(blob, filename) {
  console.log(`[saveAs Mock] Simulating save of ${filename}`);
  if (blob.content && blob.content[0]) {
    fs.writeFileSync(filename, blob.content[0]);
    console.log(`Saved output to ${filename}`);
  }
};

// Override fetchFile to use Node's fs module
app.fileIO.fetchFile = async function(filePath, fileName) {
  try {
    console.log(`Fetching local file: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    const data = new Uint8Array(buffer).buffer;
    
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
        
        // Exact mapping for the Mapping CSV
        if (newKey === "Channel Name") newKey = "Channel";
        if (newKey === "Channel Num") newKey = "ChannelNum";
        if (newKey === "Channel Account Num") newKey = "ChannelAccountNum";
        if (newKey === "Customer Code") newKey = "CustomerCode";
        
        // Exact mapping for the Customer CSV
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
    throw app.validators.createError("INVALID_FORMAT", `${fileName}: ${error.message}`);
  }
};

async function runTest() {
  console.log("Starting CSV processing validation...");
  
  try {
    const generation = await app.orderGenerator.generateSalesOrders({
      customerFile: null, // Forces falling back to fetchFile
      mappingFile: null,
      skuFile: null,
      orderDate: app.dateResolver.resolveDateRange()[0].isoDate,
      shipmentDate: app.dateResolver.resolveShipmentDate().isoDate,
      outputFormat: 'csv',
    });

    console.log("\n--- Validation Successful ---");
    console.log(`Total Rows Generated: ${generation.summary.totalRows}`);
    console.log(`Export Filename: ${generation.filename}`);
    
    // Save the file
    const output = app.fileIO.writeFile(generation.rows, generation.headers, generation.filename, 'csv');
    global.saveAs(output.blob, output.filename);
    
  } catch (error) {
    console.error("\n--- Validation Failed ---");
    console.error(`${error.category || 'ERROR'}: ${error.message}`);
    if (error.detail) console.error(`Detail: ${error.detail}`);
    process.exit(1);
  }
}

runTest();
