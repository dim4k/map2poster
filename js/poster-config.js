// ============================================================================
// POSTER CONFIGURATION — single source of truth for every theme
// ============================================================================
// Each style holds:
//   poster: colours and fonts applied to the poster frame and labels
//   map:    colours applied to the vector map (also used for thumbnails)
//   rules:  how roads and buildings are drawn
//     roadMode "class"   → road tiers resolved from the feature `class` property
//     roadMode "layerId" → major/minor split resolved from the layer id
//     roadWidths values are [widthAtZoom10, widthAtZoom14], scaled by roadWidthScale
// ============================================================================
(function (root) {
    const PosterConfig = {
        styles: {
            classic: {
                poster: { borderColor: "#000000", textColor: "#000000", bgColor: "#ffffff", cityFont: "Montserrat, sans-serif", countryFont: "Montserrat, sans-serif", coordsFont: "Inter, sans-serif", fadeIntensity: 50 },
                map: { background: "#eeeeee", water: "#ffffff", roads: "#000000", roadsMinor: "#555555", parks: "#e5e5e5", buildings: "#dcdcdc", aeroway: "#555555", showBuildings: false },
                rules: { roadMode: "class", roadWidths: { major: [3, 13], mid: [1.5, 5], minor: [0.5, 1] } },
            },
            blueprint: {
                poster: { borderColor: "#294380", textColor: "#294380", bgColor: "#ffffff", cityFont: "Space Mono, monospace", countryFont: "Space Mono, monospace", coordsFont: "Space Mono, monospace", fadeIntensity: 50 },
                map: { background: "#ffffff", water: "#e6eaf0", roads: "#294380", roadsMinor: "#294380", parks: "#ffffff", buildings: "#e6eaf0", aeroway: "#4a6494", showBuildings: false },
                rules: { roadMode: "class", roadWidths: { major: [3, 13], mid: [1.5, 5], minor: [0.5, 1] } },
            },
            vintage: {
                poster: { borderColor: "#8b7355", textColor: "#5c4a3a", bgColor: "#e0d8c8", cityFont: "Montserrat, sans-serif", countryFont: "Montserrat, sans-serif", coordsFont: "Inter, sans-serif", fadeIntensity: 50 },
                map: { background: "#e0d8c8", water: "#b8c5cc", roads: "#4a3c31", roadsMinor: "#4a3c31", parks: "#d1c7b8", buildings: "#d4c5b0", aeroway: "#6b5b4a", showBuildings: false },
                rules: { roadMode: "class", roadWidths: { major: [3, 13], mid: [1.5, 5], minor: [0, 0] }, buildingOutline: "#b0a090" },
            },
            midnight: {
                poster: { borderColor: "#00f3ff", textColor: "#00f3ff", bgColor: "#0a0a0f", cityFont: "Space Mono, monospace", countryFont: "Space Mono, monospace", coordsFont: "Space Mono, monospace", fadeIntensity: 50 },
                map: { background: "#0a0a0f", water: "#1a1a2e", roads: "#00f3ff", roadsMinor: "#2d2d44", parks: "#1f2b3e", buildings: "#fdf6e3", aeroway: "#1e2d42", showBuildings: true },
                rules: { roadMode: "class", roadWidths: { major: [3, 5], mid: [1.5, 3], minor: [0.5, 0.8] }, splitRoadColor: true },
            },
            swiss: {
                poster: { borderColor: "#000000", textColor: "#000000", bgColor: "#ffffff", cityFont: "Inter, sans-serif", countryFont: "Inter, sans-serif", coordsFont: "Inter, sans-serif", fadeIntensity: 50 },
                map: { background: "#ffffff", water: "#e5e5e5", roads: "#ff3333", roadsMinor: "#1a1a1a", parks: "#f0f0f0", buildings: "#dcdcdc", aeroway: "#cccccc", showBuildings: false },
                rules: { roadMode: "layerId", roadWidths: { major: [3, 5], minor: [0.5, 1] } },
            },
            botanical: {
                poster: { borderColor: "#3a5a40", textColor: "#3a5a40", bgColor: "#f1f3f0", cityFont: "Playfair Display, serif", countryFont: "Lora, serif", coordsFont: "Raleway, sans-serif", fadeIntensity: 50 },
                map: { background: "#f1f3f0", water: "#b7b7a4", roads: "#6b705c", roadsMinor: "#6b705c", parks: "#a5a58d", buildings: "#ddbea9", aeroway: "#7a8a70", showBuildings: false },
                rules: { roadMode: "class", roadWidths: { major: [3, 13], mid: [1.5, 5], minor: [0, 0] } },
            },
            modern: {
                poster: { borderColor: "#2c2c2c", textColor: "#2c2c2c", bgColor: "#ffffff", cityFont: "Inter, sans-serif", countryFont: "Inter, sans-serif", coordsFont: "Inter, sans-serif", fadeIntensity: 40 },
                map: { background: "#ffffff", water: "#c8d7e3", roads: "#2c2c2c", roadsMinor: "#999999", parks: "#e8f0e8", buildings: "#e8e8e8", aeroway: "#bbbbbb", showBuildings: false },
                rules: { roadMode: "layerId", roadWidths: { major: [2.5, 6], minor: [0.5, 1.2] } },
            },
            ocean: {
                poster: { borderColor: "#4da6c9", textColor: "#a8d8ea", bgColor: "#1b2838", cityFont: "Raleway, sans-serif", countryFont: "Raleway, sans-serif", coordsFont: "Inter, sans-serif", fadeIntensity: 60 },
                map: { background: "#1b2838", water: "#0d4f6e", roads: "#4da6c9", roadsMinor: "#2a5a73", parks: "#1b3a3a", buildings: "#1e3448", aeroway: "#1e3448", showBuildings: false },
                rules: { roadMode: "layerId", roadWidths: { major: [2, 5], minor: [0.3, 0.8] } },
            },
            asphalt: {
                poster: { borderColor: "#e0e0e0", textColor: "#e0e0e0", bgColor: "#2d2d2d", cityFont: "Oswald, sans-serif", countryFont: "Oswald, sans-serif", coordsFont: "Space Mono, monospace", fadeIntensity: 50 },
                map: { background: "#2d2d2d", water: "#1a1a1a", roads: "#e0e0e0", roadsMinor: "#666666", parks: "#333333", buildings: "#3a3a3a", aeroway: "#444444", showBuildings: true },
                rules: { roadMode: "layerId", roadWidths: { major: [3, 7], minor: [0.5, 1.5] } },
            },
            neon: {
                poster: { borderColor: "#ff00ff", textColor: "#ff00ff", bgColor: "#1a0030", cityFont: "Space Mono, monospace", countryFont: "Space Mono, monospace", coordsFont: "Space Mono, monospace", fadeIntensity: 50 },
                map: { background: "#1a0030", water: "#0a0020", roads: "#ff00ff", roadsMinor: "#6600aa", parks: "#1a0040", buildings: "#220044", aeroway: "#330066", showBuildings: true },
                rules: { roadMode: "layerId", roadWidths: { major: [2.5, 5], minor: [0.5, 1] } },
            },
        },

        // Font options for the UI
        fontOptions: [
            { name: "Inter", value: "Inter, sans-serif" },
            { name: "Montserrat", value: "Montserrat, sans-serif" },
            { name: "Space Mono", value: "Space Mono, monospace" },
            { name: "Playfair Display", value: "Playfair Display, serif" },
            { name: "Lora", value: "Lora, serif" },
            { name: "Oswald", value: "Oswald, sans-serif" },
            { name: "Raleway", value: "Raleway, sans-serif" },
        ],

        // Border style options for the UI
        borderOptions: [
            { name: "Classic (Simple)", value: "classic" },
            { name: "Vintage (Double)", value: "vintage" },
            { name: "Blueprint (Technical)", value: "blueprint" },
            { name: "Midnight (Neon)", value: "midnight" },
            { name: "Swiss (Bold)", value: "swiss" },
            { name: "Botanical (Frame)", value: "botanical" },
            { name: "Modern (Clean)", value: "modern" },
            { name: "Ocean (Deep)", value: "ocean" },
            { name: "Asphalt (Urban)", value: "asphalt" },
            { name: "Neon (Glow)", value: "neon" },
        ],

        // Map shapes: SVG path in a 100×100 box, fitted ("contain") and centred in the map area.
        // Used for the on-screen mask and for clipping the exported map.
        mapShapes: {
            circle: "M50 2 A48 48 0 1 1 50 98 A48 48 0 1 1 50 2 Z",
            heart: "M50 88 C25 70 5 55 5 35 C5 20 15 8 30 8 C38 8 45 12 50 20 C55 12 62 8 70 8 C85 8 95 20 95 35 C95 55 75 70 50 88 Z",
            star: "M50 5 L61 35 L95 35 L68 55 L78 85 L50 68 L22 85 L32 55 L5 35 L39 35 Z",
        },

        mapShapeOptions: [
            { name: "None", value: "none" },
            { name: "Circle", value: "circle" },
            { name: "Heart", value: "heart" },
            { name: "Star", value: "star" },
        ],

        // Label placement options
        labelPlacementOptions: [
            { name: "Bottom", value: "bottom" },
            { name: "Top", value: "top" },
            { name: "Center", value: "center" },
            { name: "Split", value: "split" },
        ],

        // Text block heights in poster pixels — must stay in sync with css/styles.css
        textBlockHeights: {
            default: 2520,
            landscape: 1800,
            splitTop: 1600,
            splitBottom: 1200,
        },

        // Poster design size in pixels (A1 at ~300 dpi). Must match css/styles.css.
        posterSize: { width: 7000, height: 9900 },

        // Export formats: short side in centimetres (all share the 1:√2 ratio of the poster).
        exportFormats: {
            A1: 59.4,
            A2: 42,
            A3: 29.7,
            A4: 21,
        },
        exportDpis: [600, 300, 150],

        // Pool used by the landing page "Random" pill
        randomCities: [
            { name: "Istanbul", lat: 41.0082, lng: 28.9784, country: "Turkey" },
            { name: "Buenos Aires", lat: -34.6037, lng: -58.3816, country: "Argentina" },
            { name: "Marrakech", lat: 31.6295, lng: -7.9811, country: "Morocco" },
            { name: "Kyoto", lat: 35.0116, lng: 135.7681, country: "Japan" },
            { name: "Lisbon", lat: 38.7223, lng: -9.1393, country: "Portugal" },
            { name: "Amsterdam", lat: 52.3676, lng: 4.9041, country: "Netherlands" },
            { name: "Prague", lat: 50.0755, lng: 14.4378, country: "Czech Republic" },
            { name: "Bangkok", lat: 13.7563, lng: 100.5018, country: "Thailand" },
            { name: "Barcelona", lat: 41.3874, lng: 2.1686, country: "Spain" },
            { name: "Seoul", lat: 37.5665, lng: 126.978, country: "South Korea" },
            { name: "Cape Town", lat: -33.9249, lng: 18.4241, country: "South Africa" },
            { name: "Reykjavik", lat: 64.1466, lng: -21.9426, country: "Iceland" },
            { name: "Vienna", lat: 48.2082, lng: 16.3738, country: "Austria" },
            { name: "Havana", lat: 23.1136, lng: -82.3666, country: "Cuba" },
            { name: "Singapore", lat: 1.3521, lng: 103.8198, country: "Singapore" },
            { name: "Florence", lat: 43.7696, lng: 11.2558, country: "Italy" },
            { name: "Vancouver", lat: 49.2827, lng: -123.1207, country: "Canada" },
            { name: "Cairo", lat: 30.0444, lng: 31.2357, country: "Egypt" },
            { name: "Melbourne", lat: -37.8136, lng: 144.9631, country: "Australia" },
            { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729, country: "Brazil" },
            { name: "Dublin", lat: 53.3498, lng: -6.2603, country: "Ireland" },
            { name: "Hanoi", lat: 21.0278, lng: 105.8342, country: "Vietnam" },
            { name: "Copenhagen", lat: 55.6761, lng: 12.5683, country: "Denmark" },
            { name: "Mumbai", lat: 19.076, lng: 72.8777, country: "India" },
            { name: "San Francisco", lat: 37.7749, lng: -122.4194, country: "USA" },
            { name: "Edinburgh", lat: 55.9533, lng: -3.1883, country: "Scotland" },
            { name: "Athens", lat: 37.9838, lng: 23.7275, country: "Greece" },
            { name: "Dubrovnik", lat: 42.6507, lng: 18.0944, country: "Croatia" },
            { name: "Mexico City", lat: 19.4326, lng: -99.1332, country: "Mexico" },
            { name: "Stockholm", lat: 59.3293, lng: 18.0686, country: "Sweden" },
        ],
    };

    // Style picker entries, kept in sync with `styles` (order drives the ←/→ switcher)
    PosterConfig.styleOptions = Object.keys(PosterConfig.styles).map((value) => ({
        value,
        name: value.charAt(0).toUpperCase() + value.slice(1),
    }));

    // Settings a theme provides and the user can override (used for "modified" detection and undo).
    PosterConfig.themeDefaults = function (styleName) {
        const s = PosterConfig.styles[styleName];
        if (!s) throw new Error(`Unknown style: ${styleName}`);
        return {
            borderStyle: styleName,
            borderColor: s.poster.borderColor,
            textColor: s.poster.textColor,
            bgColor: s.poster.bgColor,
            cityFont: s.poster.cityFont,
            countryFont: s.poster.countryFont,
            coordsFont: s.poster.coordsFont,
            fadeIntensity: s.poster.fadeIntensity,
            showBuildings: s.map.showBuildings,
            buildingColor: s.map.buildings,
            customWaterColor: s.map.water,
            customLandColor: s.map.background,
            customRoadColor: s.map.roads,
            customParkColor: s.map.parks,
        };
    };

    // Which toolbar panel exposes each theme setting (drives the "modified" dots).
    PosterConfig.themeFieldPanel = {
        borderStyle: "style",
        borderColor: "labels",
        textColor: "labels",
        bgColor: "labels",
        cityFont: "labels",
        countryFont: "labels",
        coordsFont: "labels",
        fadeIntensity: "labels",
        showBuildings: "map",
        buildingColor: "map",
        customWaterColor: "map",
        customLandColor: "map",
        customRoadColor: "map",
        customParkColor: "map",
    };

    // SVG mask (data URI) for a map shape, matching the export clip path.
    PosterConfig.shapeMaskUrl = function (shape) {
        const d = PosterConfig.mapShapes[shape];
        if (!d) return null;
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid meet'><path d='${d}' fill='black'/></svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    };

    // Small SVG preview of a theme for the style picker.
    PosterConfig.styleThumbnail = function (styleName) {
        const { poster, map } = PosterConfig.styles[styleName];
        const roads = map.roads;
        const minor = map.roadsMinor;
        return `<svg viewBox="0 0 70 99" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
            `<rect width="70" height="99" fill="${poster.bgColor}"/>` +
            `<rect x="6" y="6" width="58" height="87" fill="${map.background}"/>` +
            `<ellipse cx="48" cy="58" rx="9" ry="6" fill="${map.parks}"/>` +
            `<path d="M6 34 C 22 26, 30 46, 45 39 S 60 30, 64 36" fill="none" stroke="${map.water}" stroke-width="5"/>` +
            `<g stroke="${minor}" stroke-width="0.4" opacity="0.8">` +
            `<path d="M10 12 L30 20 M18 8 L14 40 M36 10 L52 28 M40 50 L60 46 M8 52 L26 60 M30 60 L36 80 M50 64 L58 84 M12 70 L28 72"/></g>` +
            `<g fill="none" stroke="${roads}" stroke-width="1.1" stroke-linecap="round">` +
            `<path d="M6 16 L64 50"/><path d="M27 6 C 29 30, 33 56, 31 93"/><path d="M6 76 L64 68"/></g>` +
            `<rect x="6" y="64" width="58" height="29" fill="${poster.bgColor}" opacity="0.85"/>` +
            `<rect x="4.5" y="4.5" width="61" height="90" fill="none" stroke="${poster.borderColor}" stroke-width="0.8"/>` +
            `<rect x="14" y="76" width="42" height="4" fill="${poster.textColor}"/>` +
            `<rect x="24" y="83" width="22" height="1.6" fill="${poster.textColor}" opacity="0.7"/>` +
            `</svg>`;
    };

    root.PosterConfig = PosterConfig;
    if (typeof module === "object" && module.exports) module.exports = PosterConfig;
})(typeof self !== "undefined" ? self : globalThis);
