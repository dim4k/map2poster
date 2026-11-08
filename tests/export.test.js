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

test('supersampling: 2x up to the render budget, 1x when not worth it', () => {
  const map = { mapWidth: 7000, mapHeight: 7380 };
  assert.equal(PosterExport.supersample({ ...map, scale: 0.5 }), 2);
  assert.equal(PosterExport.supersample({ ...map, scale: 1 }), 2);
  assert.equal(PosterExport.supersample({ ...map, scale: 2 }), 1);
  assert.equal(PosterExport.supersample({ ...map, scale: 0.5, maxPixels: PosterExport.IOS_MAX_PIXELS }), 1);
});

test('map pieces cover the area exactly, without overlap', () => {
  const pieces = PosterExport.pieceGrid(7000, 7380, 2000);
  assert.equal(pieces.length, 16);
  assert.equal(pieces.reduce((sum, p) => sum + p.w * p.h, 0), 7000 * 7380);
  assert.deepEqual(pieces[pieces.length - 1], { x: 6000, y: 6000, w: 1000, h: 1380 });
});

test('600 dpi: A3 is the A1 design size, A1 is capped to what a browser can hold', () => {
  const a3 = PosterExport.exportSize({ ...base, format: 'A3', dpi: 600, orientation: 'portrait' });
  assert.deepEqual([a3.width, a3.height, a3.dpi, a3.limited], [7000, 9900, 600, false]);
  const a1 = PosterExport.exportSize({ ...base, format: 'A1', dpi: 600, orientation: 'portrait' });
  assert.ok(a1.limited && a1.dpi > 400 && a1.width * a1.height <= PosterExport.MAX_OUTPUT_PIXELS);
});
