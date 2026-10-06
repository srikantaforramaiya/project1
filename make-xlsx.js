/* Generates Neon-Bites_Test_Cases.xlsx (OOXML) without external deps.
   Reads sheet data from xlsx-data.js. Pure-Node ZIP (method 0: store) + CRC-32. */
const fs = require("fs");
const DATA = require("./xlsx-data.js");

/* ---------- little-endian helpers ---------- */
function put16(b, o, v) { b[o] = v & 0xff; b[o + 1] = (v >>> 8) & 0xff; }
function put32(b, o, v) { for (let k = 0; k < 4; k++) b[o + k] = (v >>> (8 * k)) & 0xff; }

/* ---------- CRC-32 (use node:zlib when available; fixed manual fallback) ---------- */
let _zlib;
try { _zlib = require("node:zlib"); } catch (_e) { _zlib = null; }
const CRC_TABLE = (() => { const t = new Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? ((0xEDB88320 ^ (c >>> 1)) & 0xffffffff) : (c >>> 1); t[n] = c; } return t; })();
function crc32(d) {
  if (_zlib) { const r = _zlib.crc32(d); return r & 0xffffffff; }
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) c = ((c >>> 8) ^ CRC_TABLE[(c & 0xff) ^ d[i]]) & 0xffffffff;
  return (c ^ 0xffffffff) & 0xffffffff;
}
function dosDT() { return { time: 0x0000, date: 0x0021 }; } // 1980-01-01 00:00

/* ---------- ZIP writer (store) ---------- */
function zip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const dt = dosDT();
  for (const e of entries) {
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data, "utf-8");
    const nameB = Buffer.from(e.name, "utf-8");
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    put32(lh, 0, 0x04034b50); put16(lh, 4, 20); put16(lh, 6, 0); put16(lh, 8, 0);
    put16(lh, 10, dt.time); put16(lh, 12, dt.date);
    put32(lh, 14, crc); put32(lh, 18, data.length); put32(lh, 22, data.length);
    put16(lh, 26, nameB.length); put16(lh, 28, 0);
    chunks.push(lh, nameB, data);
    const cd = Buffer.alloc(46);
    put32(cd, 0, 0x02014b50); put16(cd, 4, 20); put16(cd, 6, 20); put16(cd, 8, 0);
    put16(cd, 10, 0); put16(cd, 12, dt.time); put16(cd, 14, dt.date);
    put32(cd, 16, crc); put32(cd, 20, data.length); put32(cd, 24, data.length);
    put16(cd, 28, nameB.length); put16(cd, 30, 0); put16(cd, 32, 0);
    put16(cd, 34, 0); put16(cd, 36, 0); put32(cd, 38, 0); put32(cd, 42, offset);
    central.push(cd, nameB);
    offset += 30 + nameB.length + data.length;
  }
  const cdStart = offset;
  const cdSize = central.reduce((n, b) => n + b.length, 0);
  const eocd = Buffer.alloc(22);
  put32(eocd, 0, 0x06054b50); put16(eocd, 4, 0); put16(eocd, 6, 0);
  put16(eocd, 8, entries.length); put16(eocd, 10, entries.length);
  put32(eocd, 12, cdSize); put32(eocd, 16, cdStart); put16(eocd, 20, 0);
  central.push(eocd);
  return Buffer.concat([Buffer.concat(chunks), Buffer.concat(central)]);
}

/* ---------- XML helpers ---------- */
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
function colName(i) { let s = ""; i = i + 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }

/* ---------- parts ---------- */
function contentTypes() {
  const over = DATA.sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-ooffice.extended-properties+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${over}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
}
function rootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
}
function coreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Neon Bites - User &amp; Admin Journey Test Cases</dc:title><dc:creator>QA</dc:creator><cp:lastModifiedBy>QA</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
}
function appXml() { return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application><TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Neon Bites QA</vt:lpstr></vt:vector></TitlesOfParts></Properties>`; }
function workbookXml() {
  const sheets = DATA.sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/officeDocument/2006/spreadsheetml" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><sheets>${sheets}</sheets></workbook>`;
}
function wbRels() {
  const n = DATA.sheets.length;
  let rels = DATA.sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
  rels += `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}
function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/officeDocument/2006/spreadsheetml"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="8"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD8B1"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="7" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>`;
}
function sheetXml(sheet) {
  const { cols, rows, statusIdx, widths } = sheet;
  const stMap = { "PASS": 3, "FAIL": 4, "BLOCKED": 5, "NOT RUN": 6, "BUG": 7 };
  const colEls = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  let body = "";
  body += `<row r="1">` + cols.map((h, i) => `<c r="${colName(i)}1" s="1" t="inlineStr"><is><t>${esc(h)}</t></is></c>`).join("") + `</row>`;
  rows.forEach((r, ri) => {
    const rn = ri + 2; const st = r[statusIdx];
    let cs = "";
    r.forEach((cell, ci) => { const s = ci === statusIdx ? (stMap[st] || 0) : 0; cs += `<c r="${colName(ci)}${rn}" s="${s}" t="inlineStr"><is><t>${esc(cell)}</t></is></c>`; });
    body += `<row r="${rn}" ht="34" customHeight="1">${cs}</row>`;
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/officeDocument/2006/spreadsheetml" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><cols>${colEls}</cols><sheetData>${body}</sheetData></worksheet>`;
}

/* ---------- main ---------- */
function main() {
  const entries = [
    { name: "[Content_Types].xml", data: contentTypes() },
    { name: "_rels/.rels", data: rootRels() },
    { name: "docProps/core.xml", data: coreXml() },
    { name: "docProps/app.xml", data: appXml() },
    { name: "xl/workbook.xml", data: workbookXml() },
    { name: "xl/_rels/workbook.xml.rels", data: wbRels() },
    { name: "xl/styles.xml", data: stylesXml() }
  ];
  DATA.sheets.forEach((s, i) => entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }));
  const buf = zip(entries);
  fs.writeFileSync("Neon-Bites_Test_Cases.xlsx", buf);
  console.log("WROTE Neon-Bites_Test_Cases.xlsx (" + buf.length + " bytes, PK=" + (buf[0] === 0x50 && buf[1] === 0x4b ? "OK" : "BAD") + ")");
}
main();