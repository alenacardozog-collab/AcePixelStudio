/* PNG mínimo para Node (sin instalar nada): leer y escribir imágenes { w, h, d } RGBA de 8 bits. */
'use strict';
const zlib = require('zlib'), fs = require('fs');
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return buf => { let c = -1; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }; })();

function decodificar(buf) {
  if (buf.readUInt32BE(0) !== 0x89504E47) throw new Error('No es un archivo PNG');
  let p = 8, w = 0, h = 0, bits = 8, tipo = 6, entrelazado = 0, pal = null, trns = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), nombre = buf.toString('ascii', p + 4, p + 8), datos = buf.subarray(p + 8, p + 8 + len); p += 12 + len;
    if (nombre === 'IHDR') { w = datos.readUInt32BE(0); h = datos.readUInt32BE(4); bits = datos[8]; tipo = datos[9]; entrelazado = datos[12]; }
    else if (nombre === 'PLTE') pal = datos; else if (nombre === 'tRNS') trns = datos; else if (nombre === 'IDAT') idat.push(datos); else if (nombre === 'IEND') break;
  }
  if (entrelazado) throw new Error('PNG entrelazado: guardalo sin entrelazar');
  const canales = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[tipo], bpp = Math.max(1, Math.ceil(canales * bits / 8)), fila = Math.ceil(w * canales * bits / 8), raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(fila * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (fila + 1)], ini = y * (fila + 1) + 1, o = y * fila;
    for (let x = 0; x < fila; x++) {
      const a = x >= bpp ? px[o + x - bpp] : 0, b = y ? px[o - fila + x] : 0, c = x >= bpp && y ? px[o - fila + x - bpp] : 0; let v = raw[ini + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[o + x] = v & 255;
    }
  }
  const d = new Uint8ClampedArray(w * h * 4), muestra = (y, i) => { if (bits === 8) return px[y * fila + i]; if (bits === 16) return px[y * fila + i * 2]; const bit = i * bits, byte = px[y * fila + (bit >> 3)], v = (byte >> (8 - bits - (bit & 7))) & ((1 << bits) - 1); return tipo === 3 ? v : Math.round(v * 255 / ((1 << bits) - 1)); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = (y * w + x) * 4;
    if (tipo === 6) { d[j] = muestra(y, x * 4); d[j + 1] = muestra(y, x * 4 + 1); d[j + 2] = muestra(y, x * 4 + 2); d[j + 3] = muestra(y, x * 4 + 3); }
    else if (tipo === 2) { d[j] = muestra(y, x * 3); d[j + 1] = muestra(y, x * 3 + 1); d[j + 2] = muestra(y, x * 3 + 2); d[j + 3] = trns && trns.length >= 6 && d[j] === trns[1] && d[j + 1] === trns[3] && d[j + 2] === trns[5] ? 0 : 255; }
    else if (tipo === 3) { const i = muestra(y, x); d[j] = pal[i * 3]; d[j + 1] = pal[i * 3 + 1]; d[j + 2] = pal[i * 3 + 2]; d[j + 3] = trns && i < trns.length ? trns[i] : 255; }
    else if (tipo === 0) { const v = muestra(y, x); d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = trns && trns.length >= 2 && v === trns[1] ? 0 : 255; }
    else if (tipo === 4) { const v = muestra(y, x * 2); d[j] = d[j + 1] = d[j + 2] = v; d[j + 3] = muestra(y, x * 2 + 1); }
  }
  return { w, h, d };
}
function codificar(im) {
  const fila = im.w * 4, raw = Buffer.alloc((fila + 1) * im.h);
  for (let y = 0; y < im.h; y++) { raw[y * (fila + 1)] = 0; Buffer.from(im.d.buffer, im.d.byteOffset + y * fila, fila).copy(raw, y * (fila + 1) + 1); }
  const trozo = (nombre, datos) => { const b = Buffer.alloc(12 + datos.length); b.writeUInt32BE(datos.length, 0); b.write(nombre, 4, 'ascii'); datos.copy(b, 8); b.writeUInt32BE(CRC(b.subarray(4, 8 + datos.length)), 8 + datos.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(im.w, 0); ihdr.writeUInt32BE(im.h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), trozo('IHDR', ihdr), trozo('IDAT', zlib.deflateSync(raw, { level: 9 })), trozo('IEND', Buffer.alloc(0))]);
}
module.exports = { decodificar, codificar, leer: ruta => decodificar(fs.readFileSync(ruta)), escribir: (ruta, im) => fs.writeFileSync(ruta, codificar(im)) };
