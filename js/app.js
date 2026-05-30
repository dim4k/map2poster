const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
    setup() {
        // -------------------------------------------------------------------------
        // State
        // -------------------------------------------------------------------------

        // Map & Location
        const mapInstance = ref(null);
        const lat = ref(48.8566); // Paris
        const lng = ref(2.3522);
        const zoom = ref(13);
        const coords = ref("");

        // Search
        const searchQuery = ref("");
        const searchError = ref("");
        const isSearching = ref(false);

        // Map Customization (Vector)
        const roadWidthScale = ref(1);
        const showBuildings = ref(false);
        const buildingColor = ref("#dcdcdc");

        // Custom Colors
        const customWaterColor = ref(null);
        const customRoadColor = ref(null);
        const customParkColor = ref(null);
        const customLandColor = ref(null);

        // Poster customization
        const posterStyle = ref("classic");
        const borderStyle = ref("classic");

        const orientation = ref("portrait");
        const showCoords = ref(true);
        const showCity = ref(true);
        const showCountry = ref(true);

        // Gradient Fade
        const showFade = ref(true);
        const fadeIntensity = ref(50);
        const solidBlockHeight = ref(20);

        const borderColor = ref("#000000");
        const textColor = ref("#000000");
        const bgColor = ref("#ffffff");

        // Labels
        const city = ref("Paris");
        const country = ref("France");

        // Fonts
        const cityFont = ref("Montserrat, sans-serif");
        const countryFont = ref("Montserrat, sans-serif");
        const coordsFont = ref("Inter, sans-serif");

        // UI State
        const isLoading = ref(false);
        const isSidebarOpen = ref(false);
        const theme = ref(localStorage.getItem("theme") || "light");

        // -------------------------------------------------------------------------
        // Computed
        // -------------------------------------------------------------------------

        const displayCity = computed(() => city.value || "City");
        const displayCountry = computed(() => country.value || "");
        const displayCoords = computed(() => coords.value);

        // -------------------------------------------------------------------------
        // Methods
        // -------------------------------------------------------------------------

        function toggleTheme() {
            theme.value = theme.value === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", theme.value);
            localStorage.setItem("theme", theme.value);
        }

        function initMap() {
            if (mapInstance.value) return;

            const mapElement = document.getElementById("map");
            if (!mapElement) return;

            try {
                mapInstance.value = new maplibregl.Map({
                    container: "map",
                    style: "https://tiles.openfreemap.org/styles/positron",
                    center: [lng.value, lat.value],
                    zoom: zoom.value,
                    attributionControl: false,
                    preserveDrawingBuffer: true,
                    maxPitch: 0,
                    dragRotate: false,
                    maxCanvasSize: [16384, 16384],
                });

                mapInstance.value.on("load", () => {
                    updateMapStyle();
                });

                mapInstance.value.on("click", () => {
                    if (window.innerWidth <= 768 && isSidebarOpen.value) {
                        isSidebarOpen.value = false;
                    }
                });

                mapInstance.value.on("moveend", () => {
                    const center = mapInstance.value.getCenter();
                    lat.value = center.lat;
                    lng.value = center.lng;
                    zoom.value = mapInstance.value.getZoom();
                    coords.value = AppUtils.formatCoords(
                        center.lat,
                        center.lng,
                    );
                });

                coords.value = AppUtils.formatCoords(lat.value, lng.value);
            } catch (error) {
                console.error("Map initialization error:", error);
                AppUtils.showToast("Failed to initialize map", "error");
            }
        }

        function updateMapStyle() {
            if (!mapInstance.value || !mapInstance.value.isStyleLoaded())
                return;

            MapStyles.apply(mapInstance.value, posterStyle.value, {
                showBuildings: showBuildings.value,
                buildingColor: buildingColor.value,
                roadWidthScale: roadWidthScale.value,
                waterColor: customWaterColor.value,
                roadColor: customRoadColor.value,
                parkColor: customParkColor.value,
                backgroundColor: customLandColor.value,
            });
        }

        function updateMapPosition() {
            if (!mapInstance.value) return;

            let safeLat = parseFloat(lat.value);
            let safeLng = parseFloat(lng.value);
            let safeZoom = parseFloat(zoom.value);

            if (typeof lat.value === "string")
                safeLat = parseFloat(lat.value.replace(",", "."));
            if (typeof lng.value === "string")
                safeLng = parseFloat(lng.value.replace(",", "."));

            if (isNaN(safeLat) || isNaN(safeLng) || isNaN(safeZoom)) return;

            mapInstance.value.jumpTo({
                center: [safeLng, safeLat],
                zoom: safeZoom,
            });
        }

        const searchLocation = AppUtils.debounce(async () => {
            if (!searchQuery.value.trim()) return;

            isSearching.value = true;
            searchError.value = "";

            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}`,
                );
                const data = await response.json();

                if (data && data.length > 0) {
                    const result = data[0];
                    lat.value = parseFloat(result.lat);
                    lng.value = parseFloat(result.lon);

                    updateMapPosition();

                    const parts = result.display_name.split(", ");
                    if (parts.length > 0) city.value = parts[0];
                    if (parts.length > 1)
                        country.value = parts[parts.length - 1];

                    if (window.innerWidth <= 768) isSidebarOpen.value = false;
                } else {
                    searchError.value = "Location not found";
                }
            } catch (error) {
                console.error("Search error:", error);
                searchError.value = "Error searching location";
            } finally {
                isSearching.value = false;
            }
        }, 500);

        function setPosterStyle(style) {
            posterStyle.value = style;
            borderStyle.value = style;

            const defaults = PosterConfig.styles[style];
            if (defaults) {
                borderColor.value = defaults.borderColor;
                textColor.value = defaults.textColor;
                bgColor.value = defaults.bgColor;
                cityFont.value = defaults.cityFont;
                countryFont.value = defaults.countryFont;
                coordsFont.value = defaults.coordsFont;
                showBuildings.value = defaults.showBuildings;
                buildingColor.value = defaults.buildingColor;
                fadeIntensity.value = defaults.fadeIntensity;
            }

            resetMapColors();
        }

        function resetMapColors() {
            const colors = MapStyles.colors[posterStyle.value];
            if (!colors) return;

            customWaterColor.value = colors.water;
            customLandColor.value = colors.background;
            customRoadColor.value = colors.roads;
            customParkColor.value = colors.parks;

            updateMapStyle();
        }

        function setOrientation(newOrientation) {
            orientation.value = newOrientation;
            setTimeout(() => {
                if (mapInstance.value) mapInstance.value.resize();
            }, 100);
            if (window.innerWidth <= 768) isSidebarOpen.value = false;
        }

        function toggleSidebar() {
            isSidebarOpen.value = !isSidebarOpen.value;
        }

        async function downloadPoster() {
            isLoading.value = true;
            const posterElement = document.getElementById("poster-render");
            if (!posterElement) {
                isLoading.value = false;
                return;
            }

            await PosterExport.execute({
                posterElement,
                posterStyle: posterStyle.value,
                bgColor: bgColor.value,
                fadeIntensity: fadeIntensity.value,
                solidBlockHeight: solidBlockHeight.value,
                showFade: showFade.value,
                mapInstance: mapInstance.value,
                city: city.value,
                onDone: () => {
                    isLoading.value = false;
                },
            });
        }

        function applyColors() {
            document.documentElement.style.setProperty(
                "--poster-border",
                borderColor.value,
            );
            document.documentElement.style.setProperty(
                "--poster-text",
                textColor.value,
            );
            document.documentElement.style.setProperty(
                "--poster-bg",
                bgColor.value,
            );

            const posterTextEl = document.querySelector(".poster-text");
            if (posterTextEl) {
                if (showFade.value && fadeIntensity.value > 0) {
                    const grad = AppUtils.computeGradientStyle(
                        bgColor.value,
                        fadeIntensity.value,
                        solidBlockHeight.value,
                    );
                    posterTextEl.style.height = grad.height;
                    posterTextEl.style.background = grad.background;
                } else {
                    posterTextEl.style.background = "transparent";
                    posterTextEl.style.height = "2520px";
                }
            }
        }

        // -------------------------------------------------------------------------
        // Lifecycle
        // -------------------------------------------------------------------------

        onMounted(() => {
            document.documentElement.setAttribute("data-theme", theme.value);
            initMap();
            applyColors();
            resetMapColors();
        });

        // -------------------------------------------------------------------------
        // Watchers
        // -------------------------------------------------------------------------

        watch([lat, lng], () => {
            coords.value = AppUtils.formatCoords(lat.value, lng.value);
        });

        watch(zoom, updateMapPosition);
        watch(
            [
                borderColor,
                textColor,
                bgColor,
                showFade,
                fadeIntensity,
                solidBlockHeight,
            ],
            applyColors,
        );
        watch(
            [
                showBuildings,
                buildingColor,
                roadWidthScale,
                customWaterColor,
                customRoadColor,
                customParkColor,
                customLandColor,
            ],
            updateMapStyle,
        );

        return {
            // State
            lat,
            lng,
            zoom,
            searchQuery,
            searchError,
            isSearching,
            posterStyle,
            orientation,
            showCoords,
            showCity,
            showCountry,
            borderColor,
            textColor,
            bgColor,
            city,
            country,
            isLoading,
            isSidebarOpen,
            displayCity,
            displayCountry,
            displayCoords,
            roadWidthScale,
            showBuildings,
            buildingColor,
            customWaterColor,
            customRoadColor,
            customParkColor,
            customLandColor,

            // Advanced
            borderStyle,
            borderOptions: PosterConfig.borderOptions,
            showFade,
            fadeIntensity,
            solidBlockHeight,

            // Fonts
            cityFont,
            countryFont,
            coordsFont,
            fontOptions: PosterConfig.fontOptions,

            // Methods
            toggleTheme,
            updateMapPosition,
            searchLocation,
            setPosterStyle,
            setOrientation,
            toggleSidebar,
            downloadPoster,
            resetMapColors,
            applyColors,
        };
    },
}).mount("#app");
