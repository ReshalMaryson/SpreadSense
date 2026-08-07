function sheetToCsv(data) {
  return data
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return "";

          let value = cell instanceof Date
            ? cell.toISOString().split("T")[0]
            : String(cell);

          if (/[",\n]/.test(value)) {
            value = `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        })
        .join(",")
    )
    .join("\n");
}

function workbookToCsv(parsedSheets) {
  return parsedSheets
    .map((sheet) => {
      const csv = sheetToCsv(sheet.data); // call its own function to do the thing.
      return `Sheet: ${sheet.sheet}\n${csv}`;
    })
    .join("\n\n");
}

module.exports = { sheetToCsv, workbookToCsv };