'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PosterConfig = require('../js/poster-config.js');
const { normalizeHex } = require('../js/utils.js');

const styles = Object.keys(PosterConfig.styles);

test('every style defines poster colors, map colors and road rules', () => {
  for (const name of styles) {
    const { poster, map, rules } = PosterConfig.styles[name];
    for (const key of ['borderColor', 'textColor', 'bgColor']) {
      assert.equal(normalizeHex(poster[key]), poster[key], `${name}.poster.${key}`);
    }
    for (const key of ['background', 'water', 'roads', 'roadsMinor', 'parks', 'buildings', 'aeroway']) {
      assert.equal(normalizeHex(map[key]), map[key], `${name}.map.${key}`);
    }
    assert.equal(typeof map.showBuildings, 'boolean', `${name}.map.showBuildings`);
    assert.ok(['class', 'layerId'].includes(rules.roadMode), `${name}.rules.roadMode`);
    assert.ok(Array.isArray(rules.roadWidths.major) && rules.roadWidths.major.length === 2, `${name} major widths`);
    if (rules.roadMode === 'class') assert.ok(rules.roadWidths.mid, `${name} needs mid widths`);
    for (const font of [poster.cityFont, poster.countryFont, poster.coordsFont]) {
      assert.ok(PosterConfig.fontOptions.some((f) => f.value === font), `${name} font ${font}`);
    }
  }
});

test('style picker, border options and styles stay in sync', () => {
  assert.deepEqual(PosterConfig.styleOptions.map((o) => o.value), styles);
  assert.deepEqual(PosterConfig.borderOptions.map((o) => o.value).sort(), [...styles].sort());
});

test('every border style has CSS', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
  for (const name of styles) {
    if (name === 'classic') continue; // default frame
    assert.ok(css.includes(`.poster.border-${name}`), `missing .poster.border-${name}`);
  }
});

test('themeDefaults covers every themed setting and maps it to a panel', () => {
  for (const name of styles) {
    const d = PosterConfig.themeDefaults(name);
    assert.equal(d.borderStyle, name);
    assert.deepEqual(Object.keys(d).sort(), Object.keys(PosterConfig.themeFieldPanel).sort());
    assert.equal(d.customLandColor, PosterConfig.styles[name].map.background);
  }
  assert.throws(() => PosterConfig.themeDefaults('nope'));
});

test('map shapes have a path, a mask and a picker entry', () => {
  for (const option of PosterConfig.mapShapeOptions) {
    if (option.value === 'none') {
      assert.equal(PosterConfig.shapeMaskUrl('none'), null);
      continue;
    }
    const d = PosterConfig.mapShapes[option.value];
    assert.match(d, /^M[\d\s.,A-Z-]+Z$/i, option.value);
    const mask = PosterConfig.shapeMaskUrl(option.value);
    assert.match(mask, /^url\("data:image\/svg\+xml,/);
    assert.ok(decodeURIComponent(mask).includes(d), 'mask uses the same path as the export clip');
  }
});

test('thumbnails use the theme palette', () => {
  for (const name of styles) {
    const svg = PosterConfig.styleThumbnail(name);
    const { poster, map } = PosterConfig.styles[name];
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
    for (const color of [poster.bgColor, poster.borderColor, map.roads, map.water]) {
      assert.ok(svg.includes(color), `${name} thumbnail uses ${color}`);
    }
  }
});

test('poster size matches the CSS and the A-series ratio', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
  const { width, height } = PosterConfig.posterSize;
  assert.ok(css.includes(`--poster-width: ${width}px`));
  assert.ok(css.includes(`--poster-height: ${height}px`));
  assert.ok(Math.abs(height / width - Math.SQRT2) < 0.002);
  for (const [format, short] of Object.entries(PosterConfig.exportFormats)) {
    assert.ok(short > 0, format);
  }
});
