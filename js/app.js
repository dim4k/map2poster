const { createApp, ref, computed, watch, onMounted, nextTick } = Vue;

createApp({
    setup() {
        // -------------------------------------------------------------------------
        // State
        // -------------------------------------------------------------------------

        // View mode: 'landing' or 'editor'
        const viewMode = ref("landing");

        // Map & Location
        const mapInstance = ref(null);
        const landingMapInstance = ref(null);
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
        const isTransitioning = ref(false);
        const transitionShowCity = ref(true);
        const isMapLoading = ref(false);
        const isSidebarOpen = ref(false);
        const activePanel = ref(null);
        const theme = ref(localStorage.getItem("theme") || "light");

        // Random cities for "Surprise me!"
        const randomCities = [
            { name: "Istanbul", lat: 41.0082, lng: 28.9784, country: "Turkey" },
            {
                name: "Buenos Aires",
                lat: -34.6037,
                lng: -58.3816,
                country: "Argentina",
            },
            {
                name: "Marrakech",
                lat: 31.6295,
                lng: -7.9811,
                country: "Morocco",
            },
            { name: "Kyoto", lat: 35.0116, lng: 135.7681, country: "Japan" },
            { name: "Lisbon", lat: 38.7223, lng: -9.1393, country: "Portugal" },
            {
                name: "Amsterdam",
                lat: 52.3676,
                lng: 4.9041,
                country: "Netherlands",
            },
            {
                name: "Prague",
                lat: 50.0755,
                lng: 14.4378,
                country: "Czech Republic",
            },
            {
                name: "Bangkok",
                lat: 13.7563,
                lng: 100.5018,
                country: "Thailand",
            },
            { name: "Barcelona", lat: 41.3874, lng: 2.1686, country: "Spain" },
            {
                name: "Seoul",
                lat: 37.5665,
                lng: 126.978,
                country: "South Korea",
            },
            {
                name: "Cape Town",
                lat: -33.9249,
                lng: 18.4241,
                country: "South Africa",
            },
            {
                name: "Reykjavik",
                lat: 64.1466,
                lng: -21.9426,
                country: "Iceland",
            },
            { name: "Vienna", lat: 48.2082, lng: 16.3738, country: "Austria" },
            { name: "Havana", lat: 23.1136, lng: -82.3666, country: "Cuba" },
            {
                name: "Singapore",
                lat: 1.3521,
                lng: 103.8198,
                country: "Singapore",
            },
            { name: "Florence", lat: 43.7696, lng: 11.2558, country: "Italy" },
            {
                name: "Vancouver",
                lat: 49.2827,
                lng: -123.1207,
                country: "Canada",
            },
            { name: "Cairo", lat: 30.0444, lng: 31.2357, country: "Egypt" },
            {
                name: "Melbourne",
                lat: -37.8136,
                lng: 144.9631,
                country: "Australia",
            },
            {
                name: "Rio de Janeiro",
                lat: -22.9068,
                lng: -43.1729,
                country: "Brazil",
            },
            { name: "Dublin", lat: 53.3498, lng: -6.2603, country: "Ireland" },
            { name: "Hanoi", lat: 21.0278, lng: 105.8342, country: "Vietnam" },
            {
                name: "Copenhagen",
                lat: 55.6761,
                lng: 12.5683,
                country: "Denmark",
            },
            { name: "Mumbai", lat: 19.076, lng: 72.8777, country: "India" },
            {
                name: "San Francisco",
                lat: 37.7749,
                lng: -122.4194,
                country: "USA",
            },
            {
                name: "Edinburgh",
                lat: 55.9533,
                lng: -3.1883,
                country: "Scotland",
            },
            { name: "Athens", lat: 37.9838, lng: 23.7275, country: "Greece" },
            {
                name: "Dubrovnik",
                lat: 42.6507,
                lng: 18.0944,
                country: "Croatia",
            },
            {
                name: "Mexico City",
                lat: 19.4326,
                lng: -99.1332,
                country: "Mexico",
            },
            {
                name: "Stockholm",
                lat: 59.3293,
                lng: 18.0686,
                country: "Sweden",
            },
        ];

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

        function initLandingMap() {
            const mapElement = document.getElementById("landing-map");
            if (!mapElement || landingMapInstance.value) return;

            try {
                landingMapInstance.value = new maplibregl.Map({
                    container: "landing-map",
                    style: "https://tiles.openfreemap.org/styles/positron",
                    center: [lng.value, lat.value],
                    zoom: zoom.value - 2,
                    attributionControl: false,
                    interactive: false,
                    maxPitch: 0,
                    dragRotate: false,
                });

                landingMapInstance.value.on("load", () => {
                    // Apply minimal style: hide labels, light roads
                    const style = landingMapInstance.value.getStyle();
                    style.layers.forEach((layer) => {
                        if (layer.type === "symbol") {
                            landingMapInstance.value.setLayoutProperty(
                                layer.id,
                                "visibility",
                                "none",
                            );
                        }
                    });
                    // Reveal map now that labels are hidden
                    mapElement.classList.add("ready");
                });

                coords.value = AppUtils.formatCoords(lat.value, lng.value);
            } catch (error) {
                console.error("Landing map initialization error:", error);
            }
        }

        function initMap() {
            if (mapInstance.value) return;

            const mapElement = document.getElementById("map");
            if (!mapElement) return;

            isMapLoading.value = true;
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
                    // Hide loading shortly after style is applied
                    setTimeout(() => {
                        isMapLoading.value = false;
                    }, 300);
                });

                // Safety fallback if load takes too long
                setTimeout(() => {
                    isMapLoading.value = false;
                }, 2000);

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

        let mapStyleTimeout = null;
        let mapStyleVersion = 0;

        function updateMapStyle() {
            if (!mapInstance.value || !mapInstance.value.isStyleLoaded())
                return;

            // Cancel any pending hide from a previous rapid call
            if (mapStyleTimeout) {
                clearTimeout(mapStyleTimeout);
                mapStyleTimeout = null;
            }

            mapStyleVersion++;
            const thisVersion = mapStyleVersion;

            isMapLoading.value = true;
            MapStyles.apply(mapInstance.value, posterStyle.value, {
                showBuildings: showBuildings.value,
                buildingColor: buildingColor.value,
                roadWidthScale: roadWidthScale.value,
                waterColor: customWaterColor.value,
                roadColor: customRoadColor.value,
                parkColor: customParkColor.value,
                backgroundColor: customLandColor.value,
            });

            // Only hide loading if this is still the latest style change
            mapStyleTimeout = setTimeout(() => {
                if (thisVersion === mapStyleVersion) {
                    isMapLoading.value = false;
                }
                mapStyleTimeout = null;
            }, 400);
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

        const styleNames = Object.keys(PosterConfig.styles);
        const styleIndicatorVisible = ref(false);
        let styleIndicatorTimeout = null;

        function cyclePosterStyle(direction) {
            const currentIndex = styleNames.indexOf(posterStyle.value);
            const nextIndex =
                (currentIndex + direction + styleNames.length) %
                styleNames.length;
            setPosterStyle(styleNames[nextIndex]);
            applyColors();

            // Flash style indicator
            styleIndicatorVisible.value = true;
            clearTimeout(styleIndicatorTimeout);
            styleIndicatorTimeout = setTimeout(() => {
                styleIndicatorVisible.value = false;
            }, 1200);
        }

        // Keyboard navigation
        window.addEventListener("keydown", (e) => {
            if (viewMode.value !== "editor") return;
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
                return;
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                cyclePosterStyle(-1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                cyclePosterStyle(1);
            }
        });

        // Landing -> Editor transitions
        async function goToCity() {
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

                    const parts = result.display_name.split(", ");
                    if (parts.length > 0) city.value = parts[0];
                    if (parts.length > 1)
                        country.value = parts[parts.length - 1];

                    enterEditor();
                } else {
                    searchError.value = "Location not found";
                }
            } catch (error) {
                console.error("Search error:", error);
                searchError.value = "Error searching location";
            } finally {
                isSearching.value = false;
            }
        }

        function quickCity(cityName) {
            if (cityName === "random") {
                const pick =
                    randomCities[
                        Math.floor(Math.random() * randomCities.length)
                    ];
                lat.value = pick.lat;
                lng.value = pick.lng;
                city.value = pick.name;
                country.value = pick.country;
                enterEditor();
            } else {
                searchQuery.value = cityName;
                goToCity();
            }
        }

        async function enterEditor() {
            // Show transition overlay to hide map loading
            transitionShowCity.value = true;
            isTransitioning.value = true;
            await nextTick();

            // Wait for overlay to fully cover
            await new Promise((r) => setTimeout(r, 400));

            viewMode.value = "editor";
            coords.value = AppUtils.formatCoords(lat.value, lng.value);

            await nextTick();
            // Let DOM render then init map
            await new Promise((r) => setTimeout(r, 150));
            initMap();
            updateMapPosition();
            applyColors();
            resetMapColors();
            fitPosterToViewport();

            // Wait for map tiles to start rendering
            await new Promise((r) => setTimeout(r, 600));
            isTransitioning.value = false;
        }

        function fitPosterToViewport() {
            const poster = document.getElementById("poster-render");
            if (!poster) return;

            const posterW = parseFloat(
                getComputedStyle(poster).getPropertyValue("--poster-width"),
            );
            const posterH = parseFloat(
                getComputedStyle(poster).getPropertyValue("--poster-height"),
            );
            if (!posterW || !posterH) return;

            const availW = window.innerWidth - 48; // side padding
            const availH = window.innerHeight - 260; // top bar + bottom toolbar + switcher + breathing room
            const scale = Math.min(availW / posterW, availH / posterH);
            poster.style.setProperty("--poster-scale", scale.toFixed(5));
        }

        // Re-fit on orientation change / resize
        window.addEventListener("resize", () => {
            if (viewMode.value === "editor") {
                fitPosterToViewport();
            }
        });

        async function backToLanding() {
            // Fade out via transition overlay (no city name)
            transitionShowCity.value = false;
            isTransitioning.value = true;
            await new Promise((r) => setTimeout(r, 400));

            viewMode.value = "landing";
            activePanel.value = null;

            // Destroy editor map so it can be re-created on next enter
            if (mapInstance.value) {
                mapInstance.value.remove();
                mapInstance.value = null;
            }

            // Update landing map position
            if (landingMapInstance.value) {
                landingMapInstance.value.jumpTo({
                    center: [lng.value, lat.value],
                    zoom: zoom.value - 3,
                });
            }

            await nextTick();

            // Re-trigger landing animations by toggling the class
            const landing = document.querySelector(".landing");
            if (landing) {
                landing.classList.add("re-enter");
                void landing.offsetWidth; // force reflow
                landing.classList.remove("re-enter");
            }

            // Fade overlay out
            await new Promise((r) => setTimeout(r, 300));
            isTransitioning.value = false;
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
                fitPosterToViewport();
            }, 100);
        }

        function toggleSidebar() {
            isSidebarOpen.value = !isSidebarOpen.value;
        }

        function togglePanel(panelName) {
            activePanel.value =
                activePanel.value === panelName ? null : panelName;
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
            initLandingMap();
            coords.value = AppUtils.formatCoords(lat.value, lng.value);
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
            // View Mode
            viewMode,

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
            isTransitioning,
            transitionShowCity,
            isMapLoading,
            isSidebarOpen,
            activePanel,
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

            // Theme
            theme,

            // Methods
            toggleTheme,
            updateMapPosition,
            searchLocation,
            setPosterStyle,
            cyclePosterStyle,
            styleIndicatorVisible,
            setOrientation,
            toggleSidebar,
            togglePanel,
            downloadPoster,
            resetMapColors,
            applyColors,

            // Landing methods
            goToCity,
            quickCity,
            backToLanding,
        };
    },
}).mount("#app");
