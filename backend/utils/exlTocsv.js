function sheetToCsv(data) {
  return data
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return "";

          let value =
            cell instanceof Date
              ? cell.toISOString().split("T")[0]
              : String(cell);

          if (/[",\n]/.test(value)) {
            value = `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        })
        .join(","),
    )
    .join("\n");
}

// NOTE for CSV : this method formats the CSV putting first row as the sheet name and from 2nd row the headers of the sheet starts and rest of the data is below it. this is being handled by the query engine for now, it skips the first row , but when changing is done in workbookToCsv function, the query engine should be updated accordingly to handle the new format.
function workbookToCsv(parsedSheets) {
  return parsedSheets
    .map((sheet) => {
      const csv = sheetToCsv(sheet.data); // call its own function to do the thing.
      return `Sheet: ${sheet.sheet}\n${csv}`;
    })
    .join("\n\n");
}

module.exports = { sheetToCsv, workbookToCsv };
