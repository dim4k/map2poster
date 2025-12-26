// ============================================================================
// MAP STYLES CONFIGURATION & LOGIC
// ============================================================================

window.MapStyles = {
    colors: {
        classic: {
            water: '#ffffff',
            background: '#eeeeee',
            roadMajor: '#000000',
            roadMinor: '#555555',
            building: '#dcdcdc',
            park: '#e5e5e5'
        },
        vintage: {
            background: '#e0d8c8', // Beige/Sepia Land
            water: '#b8c5cc',      // Muted Blue/Grey
            roads: '#4a3c31',      // Dark Brown/Coffee
            buildings: '#d4c5b0',  // Slightly darker beige
            parks: '#d1c7b8'       // Desaturated Green/Beige
        },
        blueprint: {
            background: '#ffffff', // Pure White
            water: '#e6eaf0',      // Very subtle cool grey/blue
            roads: '#294380'       // Deep Cobalt Blue
        }
    },

    apply(map, styleName, options = {}) {
        if (!map || !map.isStyleLoaded()) return;

        const style = map.getStyle();
        const layers = style.layers;
        
        // Defaults if options not provided
        const { showBuildings = true, buildingColor = null } = options;

        layers.forEach(layer => {
            const sourceLayer = layer['source-layer'] || '';

            // 1. GLOBAL: Hide Labels (Always Hidden)
            if (layer.type === 'symbol') {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
                return;
            }

            // 2. APPLY STYLES
            if (styleName === 'classic') {
                this._applyClassic(map, layer, sourceLayer, showBuildings, buildingColor);
            } else if (styleName === 'vintage') {
                this._applyVintage(map, layer, sourceLayer, showBuildings, buildingColor);
            } else if (styleName === 'blueprint') {
                this._applyBlueprint(map, layer, sourceLayer, showBuildings, buildingColor);
            }
        });
        
        map.triggerRepaint();
    },

    _applyClassic(map, layer, sourceLayer, showBuildings, buildingColor) {
        const c = this.colors.classic;

        // Background
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.background);
        // Water
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', c.water);
        // Buildings
        if (sourceLayer === 'building' && layer.type === 'fill') {
            if (!showBuildings) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
            } else {
                map.setLayoutProperty(layer.id, 'visibility', 'visible');
                map.setPaintProperty(layer.id, 'fill-color', buildingColor || c.building);
            }
            if (map.getPaintProperty(layer.id, 'fill-outline-color')) map.setPaintProperty(layer.id, 'fill-outline-color', 'rgba(0,0,0,0)');
        }
        // Parks
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', c.park);
            if (map.getPaintProperty(layer.id, 'fill-outline-color')) map.setPaintProperty(layer.id, 'fill-outline-color', 'rgba(0,0,0,0)');
        }
        // Roads
        if (sourceLayer === 'transportation' && layer.type === 'line') {
            if (layer.id.toLowerCase().includes('casing')) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
                return;
            }
            map.setPaintProperty(layer.id, 'line-color', c.roadMajor);
            if (map.getPaintProperty(layer.id, 'line-gap-width')) map.setPaintProperty(layer.id, 'line-gap-width', 0);
            
            map.setPaintProperty(layer.id, 'line-width', [
                "interpolate", ["linear"], ["zoom"],
                10, ["match", ["get", "class"], ["motorway", "trunk"], 2.5, ["primary", "secondary"], 1, 0.5],
                12, ["match", ["get", "class"], ["motorway", "trunk"], 6, ["primary", "secondary"], 2.5, 0.8],
                14, ["match", ["get", "class"], ["motorway", "trunk"], 13, ["primary", "secondary"], 5, 1.5],
                16, ["match", ["get", "class"], ["motorway", "trunk"], 22, ["primary", "secondary"], 10, 4]
            ]);
            map.setPaintProperty(layer.id, 'line-opacity', 1);
            map.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
    },

    _applyVintage(map, layer, sourceLayer, showBuildings, buildingColor) {
        const c = this.colors.vintage;

        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', c.water);
        if (sourceLayer === 'building' && layer.type === 'fill') {
            if (!showBuildings) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
            } else {
                map.setLayoutProperty(layer.id, 'visibility', 'visible');
                map.setPaintProperty(layer.id, 'fill-color', buildingColor || c.buildings);
            }
            if (map.getPaintProperty(layer.id, 'fill-outline-color')) map.setPaintProperty(layer.id, 'fill-outline-color', '#b0a090');
        }
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', c.parks);
            if (map.getPaintProperty(layer.id, 'fill-outline-color')) map.setPaintProperty(layer.id, 'fill-outline-color', 'rgba(0,0,0,0)');
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
            if (layer.id.toLowerCase().includes('casing')) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
                return;
            }
            map.setPaintProperty(layer.id, 'line-color', c.roads);
            if (map.getPaintProperty(layer.id, 'line-gap-width')) map.setPaintProperty(layer.id, 'line-gap-width', 0);

            // Hide minor roads
            map.setPaintProperty(layer.id, 'line-width', [
                "interpolate", ["linear"], ["zoom"],
                10, ["match", ["get", "class"], ["motorway", "trunk"], 3, ["primary", "secondary"], 1.5, 0],
                12, ["match", ["get", "class"], ["motorway", "trunk"], 7, ["primary", "secondary"], 3, 0],
                14, ["match", ["get", "class"], ["motorway", "trunk"], 14, ["primary", "secondary"], 5, 0],
                16, ["match", ["get", "class"], ["motorway", "trunk"], 24, ["primary", "secondary"], 10, 0]
            ]);
            map.setPaintProperty(layer.id, 'line-opacity', 0.85);
            map.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
    },

    _applyBlueprint(map, layer, sourceLayer, showBuildings, buildingColor) {
        const c = this.colors.blueprint;

        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', c.water);
        
        // Hide buildings/parks by default in blueprint unless forced
        if (sourceLayer === 'building' && layer.type === 'fill') {
            if (!showBuildings) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
            } else {
                map.setLayoutProperty(layer.id, 'visibility', 'visible');
                // For blueprint, default color might need to be defined if showing buildings
                // Let's use a subtle blueish grey if no override provided, or just the override
                map.setPaintProperty(layer.id, 'fill-color', buildingColor || '#e6eaf0'); 
            }
        }
        
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') map.setLayoutProperty(layer.id, 'visibility', 'none');
        
        if (sourceLayer === 'transportation' && layer.type === 'line') {
            if (layer.id.toLowerCase().includes('casing')) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
                return;
            }
            map.setPaintProperty(layer.id, 'line-color', c.roads);
            if (map.getPaintProperty(layer.id, 'line-gap-width')) map.setPaintProperty(layer.id, 'line-gap-width', 0);

            map.setPaintProperty(layer.id, 'line-width', [
                "interpolate", ["linear"], ["zoom"],
                10, ["match", ["get", "class"], ["motorway", "trunk"], 2, ["primary", "secondary"], 1, 0.5],
                12, ["match", ["get", "class"], ["motorway", "trunk"], 5, ["primary", "secondary"], 2, 0.5],
                14, ["match", ["get", "class"], ["motorway", "trunk"], 10, ["primary", "secondary"], 4, 1],
                16, ["match", ["get", "class"], ["motorway", "trunk"], 18, ["primary", "secondary"], 8, 2]
            ]);
            map.setPaintProperty(layer.id, 'line-opacity', 1);
            map.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
    }
};
