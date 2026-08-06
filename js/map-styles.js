// ============================================================================
// MAP STYLES CONFIGURATION & LOGIC
// ============================================================================

(() => {
    const LANDUSE_SOURCE_LAYERS = ["park", "landuse", "landcover"];

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
                    .then((r) => r.json())
                    .then((style) => ({
                        ...style,
                        layers: style.layers.filter((l) => l.type !== "symbol"),
                    }));
            return baseStylePromise.then((style) => structuredClone(style));
        },

        colors: {
            classic: {
                background: "#eeeeee",
                water: "#ffffff",
                roads: "#000000",
                roadsMinor: "#555555",
                buildings: "#dcdcdc",
                parks: "#e5e5e5",
                aeroway: "#555555",
            },
            vintage: {
                background: "#e0d8c8",
                water: "#b8c5cc",
                roads: "#4a3c31",
                roadsMinor: "#4a3c31",
                buildings: "#d4c5b0",
                parks: "#d1c7b8",
                aeroway: "#6b5b4a",
            },
            blueprint: {
                background: "#ffffff",
                water: "#e6eaf0",
                roads: "#294380",
                roadsMinor: "#294380",
                buildings: "#e6eaf0",
                parks: "#ffffff",
                aeroway: "#4a6494",
            },
            midnight: {
                background: "#0a0a0f",
                water: "#1a1a2e",
                roads: "#00f3ff",
                roadsMinor: "#2d2d44",
                buildings: "#16213e",
                parks: "#1f2b3e",
                aeroway: "#1e2d42",
            },
            swiss: {
                background: "#ffffff",
                water: "#e5e5e5",
                roads: "#ff3333",
                roadsMinor: "#1a1a1a",
                buildings: "#dcdcdc",
                parks: "#f0f0f0",
                aeroway: "#cccccc",
            },
            botanical: {
                background: "#f1f3f0",
                water: "#b7b7a4",
                roads: "#6b705c",
                roadsMinor: "#6b705c",
                buildings: "#ddbea9",
                parks: "#a5a58d",
                aeroway: "#7a8a70",
            },
            modern: {
                background: "#ffffff",
                water: "#c8d7e3",
                roads: "#2c2c2c",
                roadsMinor: "#999999",
                buildings: "#e8e8e8",
                parks: "#e8f0e8",
                aeroway: "#bbbbbb",
            },
            ocean: {
                background: "#1b2838",
                water: "#0d4f6e",
                roads: "#4da6c9",
                roadsMinor: "#2a5a73",
                buildings: "#1e3448",
                parks: "#1b3a3a",
                aeroway: "#1e3448",
            },
            asphalt: {
                background: "#2d2d2d",
                water: "#1a1a1a",
                roads: "#e0e0e0",
                roadsMinor: "#666666",
                buildings: "#3a3a3a",
                parks: "#333333",
                aeroway: "#444444",
            },
            neon: {
                background: "#1a0030",
                water: "#0a0020",
                roads: "#ff00ff",
                roadsMinor: "#6600aa",
                buildings: "#220044",
                parks: "#1a0040",
                aeroway: "#330066",
            },
        },

        // Rendering behaviour per style.
        // roadMode "class"   → tiers resolved from the feature `class` property.
        // roadMode "layerId" → major/minor split resolved from the layer id.
        // roadWidths values are [widthAtZoom10, widthAtZoom14], scaled by roadWidthScale.
        rules: {
            classic: {
                roadMode: "class",
                roadWidths: { major: [3, 13], mid: [1.5, 5], minor: [0.5, 1] },
            },
            vintage: {
                roadMode: "class",
                roadWidths: { major: [3, 13], mid: [1.5, 5], minor: [0, 0] },
                buildingOutline: "#b0a090",
            },
            blueprint: {
                roadMode: "class",
                roadWidths: { major: [3, 13], mid: [1.5, 5], minor: [0.5, 1] },
                hideParks: true,
            },
            midnight: {
                roadMode: "class",
                roadWidths: { major: [3, 5], mid: [1.5, 3], minor: [0.5, 0.8] },
                splitRoadColor: true,
            },
            swiss: {
                roadMode: "layerId",
                roadWidths: { major: [3, 5], minor: [0.5, 1] },
            },
            botanical: {
                roadMode: "class",
                roadWidths: { major: [3, 13], mid: [1.5, 5], minor: [0, 0] },
            },
            modern: {
                roadMode: "layerId",
                roadWidths: { major: [2.5, 6], minor: [0.5, 1.2] },
            },
            ocean: {
                roadMode: "layerId",
                roadWidths: { major: [2, 5], minor: [0.3, 0.8] },
            },
            asphalt: {
                roadMode: "layerId",
                roadWidths: { major: [3, 7], minor: [0.5, 1.5] },
            },
            neon: {
                roadMode: "layerId",
                roadWidths: { major: [2.5, 5], minor: [0.5, 1] },
            },
        },

        apply(map, styleName, options = {}) {
            if (!map || !map.isStyleLoaded()) return;

            const palette = this.colors[styleName];
            const rules = this.rules[styleName];
            if (!palette || !rules) return;

            const {
                showBuildings = true,
                buildingColor = null,
                waterColor = null,
                roadColor = null,
                parkColor = null,
                backgroundColor = null,
                roadWidthScale = 1,
            } = options;

            map.getStyle().layers.forEach((layer) => {
                try {
                    const sourceLayer = layer["source-layer"] || "";

                    if (layer.type === "background") {
                        map.setPaintProperty(
                            layer.id,
                            "background-color",
                            backgroundColor || palette.background,
                        );
                    } else if (sourceLayer === "water" && layer.type === "fill") {
                        map.setPaintProperty(
                            layer.id,
                            "fill-color",
                            waterColor || palette.water,
                        );
                    } else if (
                        sourceLayer === "building" &&
                        layer.type === "fill"
                    ) {
                        this._applyBuildings(
                            map,
                            layer,
                            showBuildings,
                            buildingColor || palette.buildings,
                            rules.buildingOutline,
                        );
                    } else if (
                        LANDUSE_SOURCE_LAYERS.includes(sourceLayer) &&
                        layer.type === "fill"
                    ) {
                        this._applyParks(
                            map,
                            layer,
                            parkColor || (rules.hideParks ? null : palette.parks),
                        );
                    } else if (
                        sourceLayer === "transportation" &&
                        layer.type === "line"
                    ) {
                        this._applyRoads(
                            map,
                            layer,
                            palette,
                            rules,
                            roadColor,
                            roadWidthScale,
                        );
                    } else if (
                        sourceLayer === "aeroway" &&
                        (layer.type === "fill" || layer.type === "line")
                    ) {
                        map.setPaintProperty(
                            layer.id,
                            layer.type === "fill" ? "fill-color" : "line-color",
                            palette.aeroway,
                        );
                    }
                } catch (e) {
                    // Layers that don't support a property throw; skipping them is expected.
                }
            });

            map.triggerRepaint();
        },

        _applyBuildings(map, layer, visible, color, outlineColor = TRANSPARENT) {
            map.setLayoutProperty(
                layer.id,
                "visibility",
                visible ? "visible" : "none",
            );
            if (visible) map.setPaintProperty(layer.id, "fill-color", color);
            if (layer.paint && "fill-outline-color" in layer.paint)
                map.setPaintProperty(
                    layer.id,
                    "fill-outline-color",
                    outlineColor,
                );
        },

        _applyParks(map, layer, color) {
            if (!color) {
                map.setLayoutProperty(layer.id, "visibility", "none");
                return;
            }
            map.setLayoutProperty(layer.id, "visibility", "visible");
            map.setPaintProperty(layer.id, "fill-color", color);
            if (layer.paint && "fill-outline-color" in layer.paint)
                map.setPaintProperty(
                    layer.id,
                    "fill-outline-color",
                    TRANSPARENT,
                );
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
                const isMajor = MAJOR_ROAD_ID_TOKENS.some((token) =>
                    layer.id.includes(token),
                );
                const [near, far] = isMajor ? widths.major : widths.minor;

                map.setPaintProperty(
                    layer.id,
                    "line-color",
                    isMajor ? majorColor : minorColor,
                );
                map.setPaintProperty(layer.id, "line-width", [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    near * scale,
                    14,
                    far * scale,
                ]);
            } else {
                map.setPaintProperty(
                    layer.id,
                    "line-color",
                    rules.splitRoadColor
                        ? [
                              "match",
                              ["get", "class"],
                              [...MAJOR_ROAD_CLASSES, ...MID_ROAD_CLASSES],
                              majorColor,
                              minorColor,
                          ]
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

            if (layer.paint && "line-gap-width" in layer.paint)
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
