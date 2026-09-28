import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "C:\\Users\\Janus\\Desktop\\F602-INFORMACION DE COMPRAS DE BIENES Y SERVICIOS 2025_1268 (1).xml";
const outputDir = "C:\\Users\\Janus\\PROYECTO\\outputs\\xml-a-excel-f602";
const outputPath = `${outputDir}\\F602-INFORMACION DE COMPRAS DE BIENES Y SERVICIOS 2025_1268.xlsx`;

const xml = await fs.readFile(sourcePath, "utf8");

function decodeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const recordBlocks = [...xml.matchAll(/<infoexog>([\s\S]*?)<\/infoexog>/g)].map((match) => match[1]);
const fieldNames = [];
const rows = recordBlocks.map((block) => {
  const row = {};
  for (const match of block.matchAll(/<([A-Z0-9_]+)>([\s\S]*?)<\/\1>/g)) {
    const [, name, rawValue] = match;
    if (!fieldNames.includes(name)) fieldNames.push(name);
    row[name] = decodeXml(rawValue.trim());
  }
  return row;
});

const workbook = Workbook.create();
const dataSheet = workbook.worksheets.add("F602 infoexog");
const metaSheet = workbook.worksheets.add("Resumen");

dataSheet.showGridLines = false;
metaSheet.showGridLines = false;

const titleRange = dataSheet.getRange("A1:Q1");
titleRange.merge();
titleRange.values = [["F602 - Informacion de compras de bienes y servicios 2025"]];
titleRange.format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF", size: 14 },
  horizontalAlignment: "left",
};

const headerRow = fieldNames;
const values = rows.map((row) => fieldNames.map((field) => row[field] ?? ""));
dataSheet.getRangeByIndexes(1, 0, 1, headerRow.length).values = [headerRow];
if (values.length > 0) {
  dataSheet.getRangeByIndexes(2, 0, values.length, headerRow.length).values = values;
}

const usedRows = Math.max(values.length + 2, 3);
const usedRange = dataSheet.getRangeByIndexes(1, 0, usedRows - 1, headerRow.length);
usedRange.format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
dataSheet.getRangeByIndexes(1, 0, 1, headerRow.length).format = {
  fill: "#D9EAF7",
  font: { bold: true, color: "#17365D" },
  wrapText: true,
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
dataSheet.getRangeByIndexes(2, 0, Math.max(values.length, 1), headerRow.length).format = {
  font: { color: "#1F2937" },
  verticalAlignment: "top",
};
dataSheet.getRangeByIndexes(0, 0, usedRows, headerRow.length).format.autofitColumns();
dataSheet.getRange("A:Q").format.columnWidth = 22;
dataSheet.getRange("A1:Q1").format.columnWidth = 22;
dataSheet.getRange("A2:Q2").format.rowHeight = 62;
dataSheet.freezePanes.freezeRows(2);
dataSheet.tables.add(`A2:Q${usedRows}`, true, "TablaF602Infoexog");

metaSheet.getRange("A1:D1").merge();
metaSheet.getRange("A1:D1").values = [["Resumen de conversion"]];
metaSheet.getRange("A1:D1").format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF", size: 14 },
};
metaSheet.getRange("A3:B7").values = [
  ["Archivo fuente", "F602-INFORMACION DE COMPRAS DE BIENES Y SERVICIOS 2025_1268 (1).xml"],
  ["Ruta fuente", sourcePath],
  ["Elemento raiz", "F602"],
  ["Registros infoexog", rows.length],
  ["Campos por registro", fieldNames.length],
];
metaSheet.getRange("A3:A7").format = {
  fill: "#D9EAF7",
  font: { bold: true, color: "#17365D" },
};
metaSheet.getRange("A3:B7").format.borders = { preset: "all", style: "thin", color: "#D9E2F3" };
metaSheet.getRange("A9").values = [["Nota"]];
metaSheet.getRange("A9").format = { font: { bold: true, color: "#17365D" } };
metaSheet.getRange("A10:D11").merge();
metaSheet.getRange("A10:D11").values = [["El XML contiene dos registros infoexog y sus campos estan vacios. El Excel conserva las columnas exactas para diligenciamiento o revision."]];
metaSheet.getRange("A10:D11").format = { wrapText: true, fill: "#F8FAFC", verticalAlignment: "top" };
metaSheet.getRange("A3:D11").format.autofitColumns();
metaSheet.getRange("A:A").format.columnWidth = 24;
metaSheet.getRange("B:D").format.columnWidth = 38;

const inspect = await workbook.inspect({
  kind: "table",
  sheetId: "F602 infoexog",
  range: "A1:Q4",
  include: "values",
  tableMaxRows: 4,
  tableMaxCols: 17,
  maxChars: 4000,
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "F602 infoexog",
  range: "A1:Q4",
  scale: 1,
  format: "png",
});
await fs.writeFile(`${outputDir}\\preview-f602.png`, new Uint8Array(await preview.arrayBuffer()));

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
