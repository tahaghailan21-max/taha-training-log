// Generates icon-192.png and icon-512.png — pure Node, no dependencies
// Dark background (#0a0a0a) with a white "T" (for Training) centered

const fs = require("fs");
const zlib = require("zlib");

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = u32(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([u32(data.length), typeBuf, data, crcBuf]);
}

function makePNG(size) {
  const bg = [10, 10, 10];       // #0a0a0a
  const fg = [255, 255, 255];    // white

  // Build raw pixel rows
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 3);
    for (let x = 0; x < size; x++) {
      // Draw a bold "T" shape
      const cx = size / 2;
      const cy = size / 2;
      const thick = Math.max(2, Math.round(size * 0.09));
      const topBarY = Math.round(cy - size * 0.22);
      const topBarH = thick;
      const topBarW = Math.round(size * 0.55);
      const stemW = thick;
      const stemTop = topBarY;
      const stemBot = Math.round(cy + size * 0.25);

      const inTopBar = y >= topBarY && y < topBarY + topBarH &&
                       x >= cx - topBarW / 2 && x < cx + topBarW / 2;
      const inStem   = y >= stemTop && y <= stemBot &&
                       x >= cx - stemW / 2 && x < cx + stemW / 2;

      const color = (inTopBar || inStem) ? fg : bg;
      row[x * 3]     = color[0];
      row[x * 3 + 1] = color[1];
      row[x * 3 + 2] = color[2];
    }
    rows.push(row);
  }

  // PNG filter byte (0 = None) prepended to each row
  const rawData = Buffer.concat(rows.map(r => Buffer.concat([Buffer.from([0]), r])));
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const IHDR = Buffer.concat([
    u32(size), u32(size),
    Buffer.from([8, 2, 0, 0, 0]), // bit depth 8, color type 2 (RGB)
  ]);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
    chunk("IHDR", IHDR),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.writeFileSync("public/icon-192.png", makePNG(192));
fs.writeFileSync("public/icon-512.png", makePNG(512));
console.log("Icons written: public/icon-192.png, public/icon-512.png");
