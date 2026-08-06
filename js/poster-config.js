// ============================================================================
// POSTER STYLE CONFIGURATION
// ============================================================================

window.PosterConfig = {
    // Default values applied when switching poster style
    styles: {
        classic: {
            borderColor: "#000000",
            textColor: "#000000",
            bgColor: "#ffffff",
            cityFont: "Montserrat, sans-serif",
            countryFont: "Montserrat, sans-serif",
            coordsFont: "Inter, sans-serif",
            showBuildings: false,
            buildingColor: "#dcdcdc",
            fadeIntensity: 50,
        },
        blueprint: {
            borderColor: "#294380",
            textColor: "#294380",
            bgColor: "#ffffff",
            cityFont: "Space Mono, monospace",
            countryFont: "Space Mono, monospace",
            coordsFont: "Space Mono, monospace",
            showBuildings: false,
            buildingColor: "#e6eaf0",
            fadeIntensity: 50,
        },
        vintage: {
            borderColor: "#8b7355",
            textColor: "#5c4a3a",
            bgColor: "#e0d8c8",
            cityFont: "Montserrat, sans-serif",
            countryFont: "Montserrat, sans-serif",
            coordsFont: "Inter, sans-serif",
            showBuildings: false,
            buildingColor: "#d4c5b0",
            fadeIntensity: 50,
        },
        midnight: {
            borderColor: "#00f3ff",
            textColor: "#00f3ff",
            bgColor: "#0a0a0f",
            cityFont: "Space Mono, monospace",
            countryFont: "Space Mono, monospace",
            coordsFont: "Space Mono, monospace",
            showBuildings: true,
            buildingColor: "#fdf6e3",
            fadeIntensity: 50,
        },
        swiss: {
            borderColor: "#000000",
            textColor: "#000000",
            bgColor: "#ffffff",
            cityFont: "Inter, sans-serif",
            countryFont: "Inter, sans-serif",
            coordsFont: "Inter, sans-serif",
            showBuildings: false,
            buildingColor: "#dcdcdc",
            fadeIntensity: 50,
        },
        botanical: {
            borderColor: "#3a5a40",
            textColor: "#3a5a40",
            bgColor: "#f1f3f0",
            cityFont: "Playfair Display, serif",
            countryFont: "Lora, serif",
            coordsFont: "Raleway, sans-serif",
            showBuildings: false,
            buildingColor: "#ddbea9",
            fadeIntensity: 50,
        },
        modern: {
            borderColor: "#2c2c2c",
            textColor: "#2c2c2c",
            bgColor: "#ffffff",
            cityFont: "Inter, sans-serif",
            countryFont: "Inter, sans-serif",
            coordsFont: "Inter, sans-serif",
            showBuildings: false,
            buildingColor: "#e8e8e8",
            fadeIntensity: 40,
        },
        ocean: {
            borderColor: "#4da6c9",
            textColor: "#a8d8ea",
            bgColor: "#1b2838",
            cityFont: "Raleway, sans-serif",
            countryFont: "Raleway, sans-serif",
            coordsFont: "Inter, sans-serif",
            showBuildings: false,
            buildingColor: "#1e3448",
            fadeIntensity: 60,
        },
        asphalt: {
            borderColor: "#e0e0e0",
            textColor: "#e0e0e0",
            bgColor: "#2d2d2d",
            cityFont: "Oswald, sans-serif",
            countryFont: "Oswald, sans-serif",
            coordsFont: "Space Mono, monospace",
            showBuildings: true,
            buildingColor: "#3a3a3a",
            fadeIntensity: 50,
        },
        neon: {
            borderColor: "#ff00ff",
            textColor: "#ff00ff",
            bgColor: "#1a0030",
            cityFont: "Space Mono, monospace",
            countryFont: "Space Mono, monospace",
            coordsFont: "Space Mono, monospace",
            showBuildings: true,
            buildingColor: "#220044",
            fadeIntensity: 50,
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

    // Map shape options
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
        splitTop: 1600,
        splitBottom: 1200,
    },

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
window.PosterConfig.styleOptions = Object.keys(window.PosterConfig.styles).map(
    (value) => ({
        value,
        name: value.charAt(0).toUpperCase() + value.slice(1),
    }),
);

