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
        },
        midnight: {
            background: '#0a0a0f', // Near Black
            water: '#1a1a2e',      // Dark Navy
            roads: '#00f3ff',      // Cyan Neon
            roadsMinor: '#2d2d44',
            buildings: '#16213e'   // Dark Blue Grey
        },
        swiss: {
            background: '#ffffff', // Pure White
            water: '#e5e5e5',      // Light Grey
            roads: '#ff3333',      // Swiss Red
            roadsMinor: '#1a1a1a', // Black
            buildings: '#dcdcdc'
        },
        botanical: {
            background: '#f1f3f0', // Off-White Sage
            water: '#b7b7a4',      // Muted Sage
            roads: '#6b705c',      // Olive Green
            buildings: '#ddbea9',  // Pale Earth
            parks: '#a5a58d'       // Greenish Beige
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
            switch(styleName) {
                case 'classic': this._applyClassic(map, layer, sourceLayer, showBuildings, buildingColor); break;
                case 'vintage': this._applyVintage(map, layer, sourceLayer, showBuildings, buildingColor); break;
                case 'blueprint': this._applyBlueprint(map, layer, sourceLayer, showBuildings, buildingColor); break;
                case 'midnight': this._applyMidnight(map, layer, sourceLayer, showBuildings, buildingColor); break;
                case 'swiss': this._applySwiss(map, layer, sourceLayer, showBuildings, buildingColor); break;
                case 'botanical': this._applyBotanical(map, layer, sourceLayer, showBuildings, buildingColor); break;
            }
        });
        
        map.triggerRepaint();
    },

    _applyClassic(map, layer, sourceLayer, showBuildings, buildingColor) {
        const c = this.colors.classic;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', c.water);
        this._handleBuildings(map, layer, sourceLayer, showBuildings, buildingColor || c.building);
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', c.park);
            if (map.getPaintProperty(layer.id, 'fill-outline-color')) map.setPaintProperty(layer.id, 'fill-outline-color', 'rgba(0,0,0,0)');
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
            this._styleRoads(map, layer, c.roadMajor, true);
        }
    },

    _applyVintage(map, layer, sourceLayer, showBuildings, buildingColor) {
        const c = this.colors.vintage;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', c.water);
        this._handleBuildings(map, layer, sourceLayer, showBuildings, buildingColor || c.buildings, '#b0a090');
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', c.parks);
            if (map.getPaintProperty(layer.id, 'fill-outline-color')) map.setPaintProperty(layer.id, 'fill-outline-color', 'rgba(0,0,0,0)');
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
            this._styleRoads(map, layer, c.roads, false);
        }
    },

    _applyBlueprint(map, layer, sourceLayer, showBuildings, buildingColor) {
        const c = this.colors.blueprint;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', c.water);
        this._handleBuildings(map, layer, sourceLayer, showBuildings, buildingColor || '#e6eaf0');
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') map.setLayoutProperty(layer.id, 'visibility', 'none');
        if (sourceLayer === 'transportation' && layer.type === 'line') {
            this._styleRoads(map, layer, c.roads, true);
        }
    },

    _applyMidnight(map, layer, sourceLayer, showBuildings, buildingColor) {
        const c = this.colors.midnight;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', c.water);
        this._handleBuildings(map, layer, sourceLayer, showBuildings, buildingColor || c.buildings);
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', '#1f2b3e');
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
             if (layer.id.toLowerCase().includes('casing')) { map.setLayoutProperty(layer.id, 'visibility', 'none'); return; }
             
             // High contrast neon roads: Motorway, Trunk, Primary, Secondary
             // Using data-driven styling to catch all classes and apply hierarchy
             map.setPaintProperty(layer.id, 'line-color', [
                 "match", ["get", "class"],
                 ["motorway", "trunk", "primary", "secondary"], c.roads,
                 c.roadsMinor
             ]);

             map.setPaintProperty(layer.id, 'line-width', [
                 "interpolate", ["linear"], ["zoom"],
                 10, [
                     "match", ["get", "class"],
                     ["motorway", "trunk"], 3,
                     ["primary", "secondary"], 1.5,
                     0.5
                 ],
                 14, [
                     "match", ["get", "class"],
                     ["motorway", "trunk"], 5,
                     ["primary", "secondary"], 3,
                     0.8
                 ]
             ]);
             
             map.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
    },

    _applySwiss(map, layer, sourceLayer, showBuildings, buildingColor) {
        const c = this.colors.swiss;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', c.water);
        this._handleBuildings(map, layer, sourceLayer, showBuildings, buildingColor || c.buildings);
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
             map.setPaintProperty(layer.id, 'fill-color', '#f0f0f0');
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
             if (layer.id.toLowerCase().includes('casing')) { map.setLayoutProperty(layer.id, 'visibility', 'none'); return; }
             
             // Red major roads, black minor
            const isMajor = ["motorway", "trunk", "primary"].some(t => layer.id.includes(t));

             map.setPaintProperty(layer.id, 'line-color', isMajor ? c.roads : c.roadsMinor);
             map.setPaintProperty(layer.id, 'line-width', isMajor ? 3 : 1);
             map.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
    },

    _applyBotanical(map, layer, sourceLayer, showBuildings, buildingColor) {
        const c = this.colors.botanical;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', c.water);
        this._handleBuildings(map, layer, sourceLayer, showBuildings, buildingColor || c.buildings);
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
             map.setPaintProperty(layer.id, 'fill-color', c.parks);
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
             if (layer.id.toLowerCase().includes('casing')) { map.setLayoutProperty(layer.id, 'visibility', 'none'); return; }
             map.setPaintProperty(layer.id, 'line-color', c.roads);
             map.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
    },

    // Helper to reduce duplication
    _handleBuildings(map, layer, sourceLayer, showBuildings, color, outlineColor = 'rgba(0,0,0,0)') {
        if (sourceLayer === 'building' && layer.type === 'fill') {
            if (!showBuildings) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
            } else {
                map.setLayoutProperty(layer.id, 'visibility', 'visible');
                map.setPaintProperty(layer.id, 'fill-color', color);
            }
            if (map.getPaintProperty(layer.id, 'fill-outline-color')) map.setPaintProperty(layer.id, 'fill-outline-color', outlineColor);
        }
    },

    _styleRoads(map, layer, color, fadeMinor = true) {
        if (layer.id.toLowerCase().includes('casing')) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
            return;
        }
        map.setPaintProperty(layer.id, 'line-color', color);
        if (map.getPaintProperty(layer.id, 'line-gap-width')) map.setPaintProperty(layer.id, 'line-gap-width', 0);
        
        // Simplified width logic
        map.setPaintProperty(layer.id, 'line-width', [
            "interpolate", ["linear"], ["zoom"],
            10, ["match", ["get", "class"], ["motorway", "trunk"], 3, ["primary", "secondary"], 1.5, fadeMinor ? 0.5 : 0],
            14, ["match", ["get", "class"], ["motorway", "trunk"], 13, ["primary", "secondary"], 5, fadeMinor ? 1 : 0]
        ]);
        map.setPaintProperty(layer.id, 'line-opacity', 1);
        map.setLayoutProperty(layer.id, 'visibility', 'visible');
    }
};
