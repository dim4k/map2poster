// ============================================================================
// MAP STYLES CONFIGURATION & LOGIC
// ============================================================================

window.MapStyles = {
    colors: {
        classic: {
            water: '#ffffff',
            background: '#eeeeee',
            roads: '#000000',
            roadsMinor: '#555555',
            buildings: '#dcdcdc',
            parks: '#e5e5e5'
        },
        vintage: {
            background: '#e0d8c8',
            water: '#b8c5cc',
            roads: '#4a3c31',
            buildings: '#d4c5b0',
            parks: '#d1c7b8'
        },
        blueprint: {
            background: '#ffffff',
            water: '#e6eaf0',
            roads: '#294380',
            buildings: '#e6eaf0',
            parks: '#ffffff'
        },
        midnight: {
            background: '#0a0a0f',
            water: '#1a1a2e',
            roads: '#00f3ff',
            roadsMinor: '#2d2d44',
            buildings: '#16213e',
            parks: '#1f2b3e'
        },
        swiss: {
            background: '#ffffff',
            water: '#e5e5e5',
            roads: '#ff3333',
            roadsMinor: '#1a1a1a',
            buildings: '#dcdcdc',
            parks: '#f0f0f0'
        },
        botanical: {
            background: '#f1f3f0',
            water: '#b7b7a4',
            roads: '#6b705c',
            buildings: '#ddbea9',
            parks: '#a5a58d'
        }
    },

    apply(map, styleName, options = {}) {
        if (!map || !map.isStyleLoaded()) return;

        const style = map.getStyle();
        const layers = style.layers;
        
        // Options with defaults
        const { 
            showBuildings = true, 
            buildingColor = null, 
            
            // Custom Colors (Overrides)
            waterColor = null,
            roadColor = null,
            parkColor = null,
            backgroundColor = null,

            // Road Scaling
            roadWidthScale = 1
        } = options;

        layers.forEach(layer => {
            const sourceLayer = layer['source-layer'] || '';

            // 1. GLOBAL: Hide Labels (Always Hidden)
            if (layer.type === 'symbol') {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
                return;
            }

            // 2. APPLY STYLES
            // Pass all options to specific style handlers
            const styleOps = { 
                showBuildings, buildingColor, 
                waterColor, roadColor, parkColor, backgroundColor, 
                roadWidthScale 
            };

            switch(styleName) {
                case 'classic': this._applyClassic(map, layer, sourceLayer, styleOps); break;
                case 'vintage': this._applyVintage(map, layer, sourceLayer, styleOps); break;
                case 'blueprint': this._applyBlueprint(map, layer, sourceLayer, styleOps); break;
                case 'midnight': this._applyMidnight(map, layer, sourceLayer, styleOps); break;
                case 'swiss': this._applySwiss(map, layer, sourceLayer, styleOps); break;
                case 'botanical': this._applyBotanical(map, layer, sourceLayer, styleOps); break;
            }
        });
        
        map.triggerRepaint();
    },

    _applyClassic(map, layer, sourceLayer, ops) {
        const c = this.colors.classic;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', ops.backgroundColor || c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', ops.waterColor || c.water);
        this._handleBuildings(map, layer, sourceLayer, ops.showBuildings, ops.buildingColor || c.buildings);
        
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', ops.parkColor || c.parks);
            if (map.getPaintProperty(layer.id, 'fill-outline-color')) map.setPaintProperty(layer.id, 'fill-outline-color', 'rgba(0,0,0,0)');
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
            this._styleRoads(map, layer, ops.roadColor || c.roads, true, ops.roadWidthScale);
        }
        // Airport runways - dark grey for classic
        if (sourceLayer === 'aeroway' && (layer.type === 'fill' || layer.type === 'line')) {
            map.setPaintProperty(layer.id, layer.type === 'fill' ? 'fill-color' : 'line-color', '#555555');
        }
    },

    _applyVintage(map, layer, sourceLayer, ops) {
        const c = this.colors.vintage;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', ops.backgroundColor || c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', ops.waterColor || c.water);
        this._handleBuildings(map, layer, sourceLayer, ops.showBuildings, ops.buildingColor || c.buildings, '#b0a090');
        
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', ops.parkColor || c.parks);
            if (map.getPaintProperty(layer.id, 'fill-outline-color')) map.setPaintProperty(layer.id, 'fill-outline-color', 'rgba(0,0,0,0)');
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
            this._styleRoads(map, layer, ops.roadColor || c.roads, false, ops.roadWidthScale);
        }
        // Airport runways - brown/sepia for vintage
        if (sourceLayer === 'aeroway' && (layer.type === 'fill' || layer.type === 'line')) {
            map.setPaintProperty(layer.id, layer.type === 'fill' ? 'fill-color' : 'line-color', '#6b5b4a');
        }
    },

    _applyBlueprint(map, layer, sourceLayer, ops) {
        const c = this.colors.blueprint;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', ops.backgroundColor || c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', ops.waterColor || c.water);
        this._handleBuildings(map, layer, sourceLayer, ops.showBuildings, ops.buildingColor || '#e6eaf0');
        
        // Hide parks in blueprint usually, unless custom color set? Let's keep hiding by default but allow override if needed? 
        // Logic: if parkColor is set, show it? No, keeping simple: blueprint hides parks.
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
             if (ops.parkColor) {
                 map.setLayoutProperty(layer.id, 'visibility', 'visible');
                 map.setPaintProperty(layer.id, 'fill-color', ops.parkColor);
             } else {
                 map.setLayoutProperty(layer.id, 'visibility', 'none');
             }
        }
        
        if (sourceLayer === 'transportation' && layer.type === 'line') {
            this._styleRoads(map, layer, ops.roadColor || c.roads, true, ops.roadWidthScale);
        }
        // Airport runways - cobalt blue for blueprint
        if (sourceLayer === 'aeroway' && (layer.type === 'fill' || layer.type === 'line')) {
            map.setPaintProperty(layer.id, layer.type === 'fill' ? 'fill-color' : 'line-color', '#4a6494');
        }
    },

    _applyMidnight(map, layer, sourceLayer, ops) {
        const c = this.colors.midnight;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', ops.backgroundColor || c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', ops.waterColor || c.water);
        this._handleBuildings(map, layer, sourceLayer, ops.showBuildings, ops.buildingColor || c.buildings);
        
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
            map.setPaintProperty(layer.id, 'fill-color', ops.parkColor || '#1f2b3e');
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
             if (layer.id.toLowerCase().includes('casing')) { map.setLayoutProperty(layer.id, 'visibility', 'none'); return; }
             
             // Use custom road color for major roads, minor roads default or derived?
             // If ops.roadColor is set, use it for major. Keep minor dark?
             const majorColor = ops.roadColor || c.roads;
             
             map.setPaintProperty(layer.id, 'line-color', [
                 "match", ["get", "class"],
                 ["motorway", "trunk", "primary", "secondary"], majorColor,
                 c.roadsMinor // Keep minor roads subtle/dark unless we want to color them too?
             ]);

             // Apply Scale
             const scale = ops.roadWidthScale || 1;
             
             map.setPaintProperty(layer.id, 'line-width', [
                 "interpolate", ["linear"], ["zoom"],
                 10, [
                     "match", ["get", "class"],
                     ["motorway", "trunk"], 3 * scale,
                     ["primary", "secondary"], 1.5 * scale,
                     0.5 * scale
                 ],
                 14, [
                     "match", ["get", "class"],
                     ["motorway", "trunk"], 5 * scale,
                     ["primary", "secondary"], 3 * scale,
                     0.8 * scale
                 ]
             ]);
             
             map.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
        // Airport runways - dark blue-grey for midnight
        if (sourceLayer === 'aeroway' && (layer.type === 'fill' || layer.type === 'line')) {
            map.setPaintProperty(layer.id, layer.type === 'fill' ? 'fill-color' : 'line-color', '#1e2d42');
        }
    },

    _applySwiss(map, layer, sourceLayer, ops) {
        const c = this.colors.swiss;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', ops.backgroundColor || c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', ops.waterColor || c.water);
        this._handleBuildings(map, layer, sourceLayer, ops.showBuildings, ops.buildingColor || c.buildings);
        
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
             map.setPaintProperty(layer.id, 'fill-color', ops.parkColor || '#f0f0f0');
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
             if (layer.id.toLowerCase().includes('casing')) { map.setLayoutProperty(layer.id, 'visibility', 'none'); return; }
             
             if (map.getPaintProperty(layer.id, 'line-gap-width')) map.setPaintProperty(layer.id, 'line-gap-width', 0);

             const isMajor = ["motorway", "trunk", "primary"].some(t => layer.id.includes(t));
             map.setPaintProperty(layer.id, 'line-color', isMajor ? (ops.roadColor || c.roads) : c.roadsMinor);
             
             const scale = ops.roadWidthScale || 1;

             map.setPaintProperty(layer.id, 'line-width', [
                "interpolate", ["linear"], ["zoom"],
                10, (isMajor ? 3 : 0.5) * scale,
                14, (isMajor ? 5 : 1) * scale
             ]);
             map.setLayoutProperty(layer.id, 'visibility', 'visible');
        }
        // Airport runways - light grey for swiss
        if (sourceLayer === 'aeroway' && (layer.type === 'fill' || layer.type === 'line')) {
            map.setPaintProperty(layer.id, layer.type === 'fill' ? 'fill-color' : 'line-color', '#cccccc');
        }
    },

    _applyBotanical(map, layer, sourceLayer, ops) {
        const c = this.colors.botanical;
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', ops.backgroundColor || c.background);
        if (sourceLayer === 'water' && layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', ops.waterColor || c.water);
        this._handleBuildings(map, layer, sourceLayer, ops.showBuildings, ops.buildingColor || c.buildings);
        
        if ((sourceLayer === 'park' || sourceLayer === 'landuse' || sourceLayer === 'landcover') && layer.type === 'fill') {
             map.setPaintProperty(layer.id, 'fill-color', ops.parkColor || c.parks);
        }
        if (sourceLayer === 'transportation' && layer.type === 'line') {
             this._styleRoads(map, layer, ops.roadColor || c.roads, false, ops.roadWidthScale);
        }
        // Airport runways - olive for botanical
        if (sourceLayer === 'aeroway' && (layer.type === 'fill' || layer.type === 'line')) {
            map.setPaintProperty(layer.id, layer.type === 'fill' ? 'fill-color' : 'line-color', '#7a8a70');
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

    _styleRoads(map, layer, color, fadeMinor = true, scale = 1) {
        if (layer.id.toLowerCase().includes('casing')) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
            return;
        }
        map.setPaintProperty(layer.id, 'line-color', color);
        if (map.getPaintProperty(layer.id, 'line-gap-width')) map.setPaintProperty(layer.id, 'line-gap-width', 0);
        
        map.setPaintProperty(layer.id, 'line-width', [
            "interpolate", ["linear"], ["zoom"],
            10, ["match", ["get", "class"], ["motorway", "trunk"], 3 * scale, ["primary", "secondary"], 1.5 * scale, fadeMinor ? 0.5 * scale : 0],
            14, ["match", ["get", "class"], ["motorway", "trunk"], 13 * scale, ["primary", "secondary"], 5 * scale, fadeMinor ? 1 * scale : 0]
        ]);
        map.setPaintProperty(layer.id, 'line-opacity', 1);
        map.setLayoutProperty(layer.id, 'visibility', 'visible');
    }
};
