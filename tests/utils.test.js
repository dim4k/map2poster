'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const U = require('../js/utils.js');

// Builds a valid 1×1 RGB PNG, optionally with an existing pHYs chunk.
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function makePng({ withPhys = false } = {}) {
  const ihdr = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
  const idat = zlib.deflateSync(Buffer.from([0, 255, 0, 0]));
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr)];
  if (withPhys) {
    const phys = Buffer.alloc(9);
    phys.writeUInt32BE(2835, 0);
    phys.writeUInt32BE(2835, 4);
    phys[8] = 1;
    parts.push(chunk('pHYs', phys));
  }
  parts.push(chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)));
  return new Uint8Array(Buffer.concat(parts));
}

function readChunks(bytes) {
  const buf = Buffer.from(bytes);
  const chunks = [];
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    const crc = buf.readUInt32BE(offset + 8 + length);
    chunks.push({ type, data, crcOk: crc === zlib.crc32(buf.subarray(offset + 4, offset + 8 + length)) });
    offset += 12 + length;
  }
  return chunks;
}

test('formatCoords uses hemispheres and 4 decimals', () => {
  assert.equal(U.formatCoords(48.8566, 2.3522), '48.8566°N 2.3522°E');
  assert.equal(U.formatCoords(-22.9068, -43.1729), '22.9068°S 43.1729°W');
});

test('parseDecimal accepts dots and commas, rejects garbage', () => {
  assert.equal(U.parseDecimal('48,8566'), 48.8566);
  assert.equal(U.parseDecimal(' -2.5 '), -2.5);
  assert.ok(Number.isNaN(U.parseDecimal('12abc')));
  assert.ok(Number.isNaN(U.parseDecimal('')));
});

test('normalizeHex validates and normalises colors', () => {
  assert.equal(U.normalizeHex('#ABCDEF'), '#abcdef');
  assert.equal(U.normalizeHex('abcdef'), '#abcdef');
  assert.equal(U.normalizeHex('#fff'), '#ffffff');
  assert.equal(U.normalizeHex('#12'), null);
  assert.equal(U.normalizeHex('red'), null);
  assert.equal(U.normalizeHex('#12345g'), null);
  assert.equal(U.normalizeHex(null), null);
});

test('hexToRgba never produces NaN', () => {
  assert.equal(U.hexToRgba('#ff8000', 0.5), 'rgba(255, 128, 0, 0.5)');
  assert.equal(U.hexToRgba('#fff', 1), 'rgba(255, 255, 255, 1)');
  assert.equal(U.hexToRgba('nope', 0), 'rgba(0, 0, 0, 0)');
});

test('setPngDpi inserts a valid pHYs chunk before IDAT', () => {
  const out = U.setPngDpi(makePng(), 300);
  const chunks = readChunks(out);
  assert.deepEqual(chunks.map(c => c.type), ['IHDR', 'pHYs', 'IDAT', 'IEND']);
  assert.ok(chunks.every(c => c.crcOk), 'every chunk CRC is valid');
  const phys = chunks[1].data;
  assert.equal(phys.readUInt32BE(0), 11811);
  assert.equal(phys.readUInt32BE(4), 11811);
  assert.equal(phys[8], 1);
  assert.doesNotThrow(() => zlib.inflateSync(chunks[2].data));
});

test('setPngDpi replaces an existing pHYs chunk instead of duplicating it', () => {
  const out = U.setPngDpi(makePng({ withPhys: true }), 150);
  const chunks = readChunks(out);
  assert.equal(chunks.filter(c => c.type === 'pHYs').length, 1);
  const phys = chunks.find(c => c.type === 'pHYs');
  assert.ok(phys.crcOk);
  assert.equal(phys.data.readUInt32BE(0), Math.round(150 / 0.0254));
});

test('setPngDpi rejects non-PNG data', () => {
  assert.throws(() => U.setPngDpi(new Uint8Array(40), 300), /Not a PNG/);
});

test('setDpi works on Blobs', async () => {
  const blob = await U.setDpi(new Blob([makePng()]), 300);
  assert.equal(blob.type, 'image/png');
  const chunks = readChunks(new Uint8Array(await blob.arrayBuffer()));
  assert.ok(chunks.some(c => c.type === 'pHYs'));
});

test('sanitizeFilename strips forbidden characters', () => {
  assert.equal(U.sanitizeFilename('Saint-Malo'), 'Saint-Malo');
  assert.equal(U.sanitizeFilename('Rio de Janeiro'), 'Rio_de_Janeiro');
  assert.equal(U.sanitizeFilename('a/b:c*?'), 'a-b-c');
  assert.equal(U.sanitizeFilename('   '), 'Map');
});

test('formatBytes picks a readable unit', () => {
  assert.equal(U.formatBytes(512), '512 B');
  assert.equal(U.formatBytes(19293798), '18.4 MB');
});

test('computeGradientStyle never produces NaN and keeps stops ordered', () => {
  const g = U.computeGradientStyle('#ffffff', 25, 20, 2520);
  assert.equal(g.height, '2520px');
  assert.match(g.background, /rgba\(255, 255, 255, 0\) 50%, rgba\(255, 255, 255, 1\) 80%/);
  const tall = U.computeGradientStyle('#000', 100, 0, 1800);
  assert.equal(tall.height, '3600px');
  assert.ok(!U.computeGradientStyle('oops', 50, 20).background.includes('NaN'));
  const clamped = U.computeGradientStyle('#ffffff', 10, 90, 1000);
  assert.match(clamped.background, / 80%, .* 80%,/);
});

test('fitText keeps text that already fits', () => {
  assert.deepEqual(U.fitText({ glyphWidth: 2000, gaps: 4, size: 590, spacing: 63, maxWidth: 5544 }), { size: 590, spacing: 63, ratio: 1 });
});

test('fitText tightens letter-spacing before shrinking', () => {
  const fit = U.fitText({ glyphWidth: 5000, gaps: 12, size: 590, spacing: 63, maxWidth: 5544 });
  assert.equal(fit.size, 590);
  assert.ok(fit.spacing < 63 && fit.spacing >= 63 * 0.4);
  assert.ok(5000 + fit.spacing * 12 <= 5544 + 1e-9);
});

test('fitText scales long names down to the minimum ratio', () => {
  const fit = U.fitText({ glyphWidth: 8000, gaps: 16, size: 590, spacing: 63, maxWidth: 5544 });
  assert.ok(fit.size < 590);
  assert.ok(8000 * fit.ratio + fit.spacing * 16 <= 5544 + 1e-6);
  const tiny = U.fitText({ glyphWidth: 90000, gaps: 40, size: 590, spacing: 63, maxWidth: 5544, minRatio: 0.4 });
  assert.equal(tiny.size, 236);
});

test('fitText handles negative spacing (Swiss)', () => {
  const fit = U.fitText({ glyphWidth: 7000, gaps: 10, size: 590, spacing: -2, maxWidth: 5544 });
  assert.ok(fit.size < 590 && fit.spacing < 0);
});
