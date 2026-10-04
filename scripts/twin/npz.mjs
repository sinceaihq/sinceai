/**
 * Minimal NumPy .npz reader (ZIP of .npy files, stored or deflated) for the
 * data build: little-endian float32/float64/uint8/bool arrays and 0-d scalars.
 */
import fs from "node:fs";
import zlib from "node:zlib";

const DTYPES = {
  "<f4": [Float32Array, 4],
  "<f8": [Float64Array, 8],
  "|u1": [Uint8Array, 1],
  "|b1": [Uint8Array, 1],
  "<i4": [Int32Array, 4],
};

/** Read an .npz → { name: { shape, data } } (scalars: shape []). */
export function readNpz(file) {
  const buf = fs.readFileSync(file);
  // End of central directory: scan back for its signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error(`npz: not a zip file: ${file}`);
  let count = buf.readUInt16LE(eocd + 10);
  let cd = buf.readUInt32LE(eocd + 16);
  // ZIP64 (large archives): the EOCD fields are 0xFFFF / 0xFFFFFFFF.
  if (count === 0xffff || cd === 0xffffffff) {
    const loc = buf.readUInt32LE(eocd - 20) === 0x07064b50 ? eocd - 20 : -1;
    if (loc < 0) throw new Error("npz: zip64 locator missing");
    const z64 = Number(buf.readBigUInt64LE(loc + 8));
    count = Number(buf.readBigUInt64LE(z64 + 32));
    cd = Number(buf.readBigUInt64LE(z64 + 48));
  }
  const out = {};
  let p = cd;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("npz: bad central directory");
    const method = buf.readUInt16LE(p + 10);
    let csize = buf.readUInt32LE(p + 20);
    let usize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    let local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    // ZIP64 extra field carries the real sizes/offset.
    let e = p + 46 + nameLen;
    const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = buf.readUInt16LE(e);
      const len = buf.readUInt16LE(e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        if (usize === 0xffffffff) {
          usize = Number(buf.readBigUInt64LE(q));
          q += 8;
        }
        if (csize === 0xffffffff) {
          csize = Number(buf.readBigUInt64LE(q));
          q += 8;
        }
        if (local === 0xffffffff) local = Number(buf.readBigUInt64LE(q));
      }
      e += 4 + len;
    }
    p = eEnd + commentLen;
    const lNameLen = buf.readUInt16LE(local + 26);
    const lExtraLen = buf.readUInt16LE(local + 28);
    const start = local + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + csize);
    const npy = method === 0 ? raw : method === 8 ? zlib.inflateRawSync(raw) : null;
    if (!npy) throw new Error(`npz: unsupported compression ${method} for ${name}`);
    out[name.replace(/\.npy$/, "")] = parseNpy(npy);
  }
  return out;
}

function parseNpy(b) {
  if (b[0] !== 0x93 || b.toString("latin1", 1, 6) !== "NUMPY") throw new Error("npz: bad .npy magic");
  const major = b[6];
  const hlen = major === 1 ? b.readUInt16LE(8) : b.readUInt32LE(8);
  const hstart = major === 1 ? 10 : 12;
  const header = b.toString("latin1", hstart, hstart + hlen);
  const descr = /'descr':\s*'([^']+)'/.exec(header)?.[1];
  const fortran = /'fortran_order':\s*True/.test(header);
  const shape = (/'shape':\s*\(([^)]*)\)/.exec(header)?.[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number);
  if (fortran) throw new Error("npz: Fortran-ordered arrays are not supported");
  const dt = DTYPES[descr];
  if (!dt) throw new Error(`npz: unsupported dtype ${descr}`);
  const [Ctor, size] = dt;
  const offset = hstart + hlen;
  const n = shape.reduce((a, v) => a * v, 1);
  // Copy into an aligned buffer.
  const bytes = Uint8Array.from(b.subarray(offset, offset + n * size));
  return { shape, data: new Ctor(bytes.buffer, 0, n) };
}
