import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
const directory = new URL("../public/icons/", import.meta.url);
mkdirSync(directory, { recursive: true });
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  t.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([t, data])), data.length + 8);
  return result;
}
function distance(x, y, a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    t = Math.max(
      0,
      Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)),
    );
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
for (const size of [16, 32, 48, 128]) {
  const points = [
    [0.16, 0.53],
    [0.32, 0.53],
    [0.42, 0.24],
    [0.57, 0.76],
    [0.68, 0.46],
    [0.84, 0.46],
  ];
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const color = [0, 0, 0, 0];
      for (let sy = 0; sy < 4; sy++)
        for (let sx = 0; sx < 4; sx++) {
          const px = (x + (sx + 0.5) / 4) / size,
            py = (y + (sy + 0.5) / 4) / size;
          if (
            Math.hypot(
              Math.max(0.22 - px, 0, px - 0.78),
              Math.max(0.22 - py, 0, py - 0.78),
            ) > 0.22
          )
            continue;
          const ink = points
            .slice(1)
            .some((p, i) => distance(px, py, points[i], p) < 0.035);
          const c = ink ? [22, 55, 44] : [162, 231, 205];
          for (let k = 0; k < 3; k++) color[k] += c[k] / 16;
          color[3] += 255 / 16;
        }
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      for (let k = 0; k < 4; k++) raw[offset + k] = Math.round(color[k]);
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  writeFileSync(
    new URL(`icon${size}.png`, directory),
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
