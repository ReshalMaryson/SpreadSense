const fs = require("fs");
const readXlsxFile = require("read-excel-file/node");

const MAX_TABS = 3;
const MAX_COLS = 10;

async function test() {
  const buffer = fs.readFileSync("./testFile/ClassDataSet.xlsx");
  const rows = await readXlsxFile(buffer);

  console.log("Tab count:", rows.length);

  if (rows.length > MAX_TABS) {
    console.log(`Invalid: ${rows.length} tabs found, max is ${MAX_TABS}`);
    return;
  }

  for (const sheet of rows) {
    const colCount = sheet.data[0].length;
    console.log(`Sheet "${sheet.sheet}" — columns: ${colCount}`);

    if (colCount > MAX_COLS) {
      console.log(`Invalid: sheet "${sheet.sheet}" has ${colCount} columns, max is ${MAX_COLS}`);
      return;
    }
  }

  console.log("File passed validation.");
}

test().catch(console.error);