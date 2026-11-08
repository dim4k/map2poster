// ============================================================================
// MAP STYLES — applies a poster theme (js/poster-config.js) to the base map
// ============================================================================

(() => {
    // Road tiers, matched against the vector tile `class` property.
    const MAJOR_ROAD_CLASSES = ["motorway", "trunk"];
    const MID_ROAD_CLASSES = ["primary", "secondary"];

    // Some base styles split roads across layers instead of exposing `class`.
    const MAJOR_ROAD_ID_TOKENS = ["motorway", "trunk", "primary"];

    const TRANSPARENT = "rgba(0,0,0,0)";

    const BASE_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
    let baseStylePromise = null;

    window.MapStyles = {
        // Labels are never rendered on a poster. Dropping them before MapLibre sees the
        // style avoids parsing tiles against layers whose filters compare a possibly
        // absent property, which MapLibre reports as a type assertion warning.
        loadBaseStyle() {
            baseStylePromise =
                baseStylePromise ||
                fetch(BASE_STYLE_URL)
                    .then((r) => {
                        if (!r.ok) throw new Error(`Base style HTTP ${r.status}`);
                        return r.json();
                    })
                    .then((style) => ({
                        ...style,
                        layers: style.layers.filter((l) => l.type !== "symbol"),
                    }))
                    .catch((error) => {
                        baseStylePromise = null; // allow a retry
                        throw error;
                    });
            return baseStylePromise.then((style) => structuredClone(style));
        },

        // The caller must only call this once the map's "load" event has fired.
        apply(map, styleName, options = {}) {
            const theme = PosterConfig.styles[styleName];
            if (!map || !theme) return;
            const palette = theme.map;
            const rules = theme.rules;

            const {
                showBuildings = palette.showBuildings,
                buildingColor = null,
                waterColor = null,
                roadColor = null,
                parkColor = null,
                backgroundColor = null,
                roadWidthScale = 1,
            } = options;
            const land = backgroundColor || palette.background;
            const water = waterColor || palette.water;
            const parks = parkColor || palette.parks;

            map.getStyle().layers.forEach((layer) => {
                try {
                    const sourceLayer = layer["source-layer"] || "";
                    const type = layer.type;

                    if (type === "background") {
                        map.setPaintProperty(layer.id, "background-color", land);
                    } else if (sourceLayer === "water" && type === "fill") {
                        map.setPaintProperty(layer.id, "fill-color", water);
                    } else if (sourceLayer === "waterway" && type === "line") {
                        map.setPaintProperty(layer.id, "line-color", water);
                    } else if (sourceLayer === "building" && type === "fill") {
                        this._applyBuildings(map, layer, showBuildings, buildingColor || palette.buildings, rules.buildingOutline);
                    } else if ((sourceLayer === "park" || sourceLayer === "landcover") && type === "fill") {
                        this._applyArea(map, layer, parks);
                    } else if (sourceLayer === "landuse" && type === "fill") {
                        // Residential, industrial… areas blend into the land instead of looking like parks.
                        this._applyArea(map, layer, land);
                    } else if (sourceLayer === "transportation" && type === "line") {
                        this._applyRoads(map, layer, palette, rules, roadColor, roadWidthScale);
                    } else if (sourceLayer === "aeroway" && (type === "fill" || type === "line")) {
                        map.setPaintProperty(layer.id, `${type}-color`, palette.aeroway);
                    }
                } catch (e) {
                    // Layers that don't support a property throw; skipping them is expected.
                }
            });

            map.triggerRepaint();
        },

        _applyBuildings(map, layer, visible, color, outlineColor = TRANSPARENT) {
            map.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
            map.setPaintProperty(layer.id, "fill-color", color);
            map.setPaintProperty(layer.id, "fill-outline-color", outlineColor || TRANSPARENT);
        },

        _applyArea(map, layer, color) {
            map.setLayoutProperty(layer.id, "visibility", "visible");
            map.setPaintProperty(layer.id, "fill-color", color);
            map.setPaintProperty(layer.id, "fill-outline-color", TRANSPARENT);
        },

        _applyRoads(map, layer, palette, rules, customColor, scale) {
            if (layer.id.toLowerCase().includes("casing")) {
                map.setLayoutProperty(layer.id, "visibility", "none");
                return;
            }

            const majorColor = customColor || palette.roads;
            const minorColor = palette.roadsMinor || majorColor;
            const widths = rules.roadWidths;

            if (rules.roadMode === "layerId") {
                const isMajor = MAJOR_ROAD_ID_TOKENS.some((token) => layer.id.includes(token));
                const [near, far] = isMajor ? widths.major : widths.minor;

                map.setPaintProperty(layer.id, "line-color", isMajor ? majorColor : minorColor);
                map.setPaintProperty(layer.id, "line-width", ["interpolate", ["linear"], ["zoom"], 10, near * scale, 14, far * scale]);
            } else {
                map.setPaintProperty(
                    layer.id,
                    "line-color",
                    rules.splitRoadColor
                        ? ["match", ["get", "class"], [...MAJOR_ROAD_CLASSES, ...MID_ROAD_CLASSES], majorColor, minorColor]
                        : majorColor,
                );
                map.setPaintProperty(layer.id, "line-width", [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    this._widthByClass(widths, scale, 0),
                    14,
                    this._widthByClass(widths, scale, 1),
                ]);
            }

            map.setPaintProperty(layer.id, "line-gap-width", 0);
            map.setPaintProperty(layer.id, "line-opacity", 1);
            map.setLayoutProperty(layer.id, "visibility", "visible");
        },

        _widthByClass(widths, scale, zoomIndex) {
            return [
                "match",
                ["get", "class"],
                MAJOR_ROAD_CLASSES,
                widths.major[zoomIndex] * scale,
                MID_ROAD_CLASSES,
                widths.mid[zoomIndex] * scale,
                widths.minor[zoomIndex] * scale,
            ];
        },
    };
})();
