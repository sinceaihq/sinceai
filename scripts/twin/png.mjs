/**
 * Minimal PNG reader/writer for the data build: 8/16-bit grey, grey+alpha,
 * RGB and RGBA, non-interlaced. Node's zlib does the compression; the writer
 * picks the best of the five row filters per row (smallest absolute sum).
 */
import zlib from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Decode a PNG file buffer → { width, height, bitDepth, channels, data } (16-bit samples combined). */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG");
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colorType = body[9];
      if (body[12] !== 0) throw new Error("interlaced PNG");
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const channels = CHANNELS[colorType];
  if (!channels || (bitDepth !== 8 && bitDepth !== 16)) throw new Error(`unsupported PNG ${colorType}/${bitDepth}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = (channels * bitDepth) / 8;
  const stride = width * bpp;
  const px = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const s = y * (stride + 1) + 1;
    const d = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[d + x - bpp] : 0;
      const b = y > 0 ? px[d - stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[d - stride + x - bpp] : 0;
      const v = raw[s + x];
      px[d + x] =
        (f === 0 ? v : f === 1 ? v + a : f === 2 ? v + b : f === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c)) & 255;
    }
  }
  if (bitDepth === 8) return { width, height, bitDepth, channels, data: px };
  const data = new Uint16Array(width * height * channels);
  for (let i = 0; i < data.length; i++) data[i] = (px[2 * i] << 8) | px[2 * i + 1];
  return { width, height, bitDepth, channels, data };
}

/**
 * Encode samples → PNG buffer. `data`: Uint8Array (8-bit) or Uint16Array
 * (16-bit), channels interleaved. No colour chunks (gAMA, sRGB, iCCP), so a
 * browser never colour-manages the values.
 */
export function encodePng({ width, height, channels, bitDepth, data }) {
  const colorType = { 1: 0, 2: 4, 3: 2, 4: 6 }[channels];
  const bpp = (channels * bitDepth) / 8;
  const stride = width * bpp;
  const px = new Uint8Array(height * stride);
  if (bitDepth === 16) {
    for (let i = 0; i < data.length; i++) {
      px[2 * i] = data[i] >> 8;
      px[2 * i + 1] = data[i] & 255;
    }
  } else px.set(data);

  const out = Buffer.alloc(height * (stride + 1));
  const row = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const d = y * stride;
    let best = null;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      let sum = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? px[d + x - bpp] : 0;
        const b = y > 0 ? px[d - stride + x] : 0;
        const c = x >= bpp && y > 0 ? px[d - stride + x - bpp] : 0;
        const v = px[d + x];
        const r =
          (f === 0 ? v : f === 1 ? v - a : f === 2 ? v - b : f === 3 ? v - ((a + b) >> 1) : v - paeth(a, b, c)) & 255;
        row[x] = r;
        sum += r < 128 ? r : 256 - r;
      }
      if (sum < bestSum) {
        bestSum = sum;
        best = { f, bytes: Uint8Array.from(row) };
      }
    }
    out[y * (stride + 1)] = best.f;
    out.set(best.bytes, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(out, { level: 9, memLevel: 9, strategy: zlib.constants.Z_FILTERED })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
