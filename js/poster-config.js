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
    ],
};
