'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const PosterConfig = require('../js/poster-config.js');
const PosterExport = require('../js/export.js');

const base = { posterSize: PosterConfig.posterSize, formats: PosterConfig.exportFormats };

test('A1 at 300 dpi is the native poster size', () => {
  const size = PosterExport.exportSize({ ...base, format: 'A1', dpi: 300, orientation: 'portrait' });
  assert.deepEqual([size.width, size.height, size.scale, size.dpi, size.limited], [7000, 9900, 1, 300, false]);
});

test('smaller formats and dpi scale the poster down', () => {
  const a2 = PosterExport.exportSize({ ...base, format: 'A2', dpi: 300, orientation: 'portrait' });
  assert.equal(a2.width, 4949);
  assert.equal(a2.height, 7000);
  const a4 = PosterExport.exportSize({ ...base, format: 'A4', dpi: 150, orientation: 'portrait' });
  assert.ok(Math.abs(a4.scale - 0.1768) < 0.001);
  assert.equal(a4.dpi, 150);
});

test('landscape swaps the sides', () => {
  const size = PosterExport.exportSize({ ...base, format: 'A1', dpi: 300, orientation: 'landscape' });
  assert.deepEqual([size.width, size.height], [9900, 7000]);
});

test('a pixel cap lowers the dpi (iOS)', () => {
  const size = PosterExport.exportSize({ ...base, format: 'A1', dpi: 300, orientation: 'portrait', maxPixels: PosterExport.IOS_MAX_PIXELS });
  assert.ok(size.width * size.height <= PosterExport.IOS_MAX_PIXELS);
  assert.ok(size.limited);
  assert.ok(size.dpi >= 140 && size.dpi < 300, String(size.dpi));
  const small = PosterExport.exportSize({ ...base, format: 'A4', dpi: 300, orientation: 'portrait', maxPixels: PosterExport.IOS_MAX_PIXELS });
  assert.equal(small.limited, false);
});

test('unknown formats are rejected', () => {
  assert.throws(() => PosterExport.exportSize({ ...base, format: 'B5', dpi: 300, orientation: 'portrait' }));
});

test('supersampling: 2x for small formats, none for A1, bounded by the GPU side', () => {
  const map = { mapWidth: 7000, mapHeight: 7380 };
  assert.equal(PosterExport.supersample({ ...map, scale: 0.5 }), 2);
  assert.equal(PosterExport.supersample({ ...map, scale: 1 }), 1);
  const a2 = PosterExport.supersample({ ...map, scale: 0.707 });
  assert.ok(a2 > 1 && a2 < 2);
  assert.ok(7380 * 0.5 * PosterExport.supersample({ ...map, scale: 0.5, maxSide: 4096 }) <= 4096);
  assert.equal(PosterExport.supersample({ ...map, scale: 0.5, maxPixels: PosterExport.IOS_MAX_PIXELS }), 1);
});
