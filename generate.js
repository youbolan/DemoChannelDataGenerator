const fs = require('fs');
const customer = fs.readFileSync('./.data/Customer_source.csv', 'utf8');
const mapping = fs.readFileSync('./.data/Customer-Channel-ChannelAccountMapping.csv', 'utf8');
const sku = fs.readFileSync('./.data/SKU_Only.csv', 'utf8');

const output = `(function attachDefaultData(global) {
  const app = global.DemoChannelDataGenerator || (global.DemoChannelDataGenerator = {});
  app.defaultData = {
    customer: \`${customer.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`,
    mapping: \`${mapping.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`,
    sku: \`${sku.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`
  };
})(window);`;

fs.writeFileSync('./js/defaultData.js', output);
console.log('Successfully generated js/defaultData.js');
