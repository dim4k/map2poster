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

        // Map Customization (Vector)
        const roadWidthScale = ref(1);
        const showBuildings = ref(false);
        const buildingColor = ref("#dcdcdc");

        // Custom Colors — seeded from the default style so the colour inputs
        // always hold a valid #rrggbb value before resetMapColors() runs.
        const defaultPalette = MapStyles.colors.classic;
        const customWaterColor = ref(defaultPalette.water);
        const customRoadColor = ref(defaultPalette.roads);
        const customParkColor = ref(defaultPalette.parks);
        const customLandColor = ref(defaultPalette.background);

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

        // Map Shape
        const mapShape = ref("none");

        // Label Placement
        const labelPlacement = ref("bottom");

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
        const activePanel = ref(null);
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

        async function initLandingMap() {
            const mapElement = document.getElementById("landing-map");
            if (!mapElement || landingMapInstance.value) return;

            try {
                landingMapInstance.value = new maplibregl.Map({
                    container: "landing-map",
                    style: await MapStyles.loadBaseStyle(),
                    center: [lng.value, lat.value],
                    zoom: zoom.value - 2,
                    attributionControl: false,
                    interactive: false,
                    maxPitch: 0,
                    dragRotate: false,
                });

                landingMapInstance.value.on("load", () => {
                    mapElement.classList.add("ready");
                });

                coords.value = AppUtils.formatCoords(lat.value, lng.value);
            } catch (error) {
                console.error("Landing map initialization error:", error);
            }
        }

        async function initMap() {
            if (mapInstance.value) return;

            const mapElement = document.getElementById("map");
            if (!mapElement) return;

            isMapLoading.value = true;
            try {
                mapInstance.value = new maplibregl.Map({
                    container: "map",
                    style: await MapStyles.loadBaseStyle(),
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

            const safeLat = parseFloat(lat.value);
            const safeLng = parseFloat(lng.value);
            const safeZoom = parseFloat(zoom.value);
            if (isNaN(safeLat) || isNaN(safeLng) || isNaN(safeZoom)) return;

            mapInstance.value.jumpTo({
                center: [safeLng, safeLat],
                zoom: safeZoom,
            });
        }

        // Resolves a free-text query to coordinates + labels, or null when not found.
        async function geocode(query) {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
            );
            const data = await response.json();
            if (!data || data.length === 0) return null;

            const parts = data[0].display_name.split(", ");
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                city: parts[0],
                country: parts.length > 1 ? parts[parts.length - 1] : "",
            };
        }

        // Runs a geocode and pushes the result into state; returns false on failure.
        async function applySearch() {
            if (!searchQuery.value.trim()) return false;
            searchError.value = "";

            try {
                const place = await geocode(searchQuery.value);
                if (!place) {
                    searchError.value = "Location not found";
                    return false;
                }

                lat.value = place.lat;
                lng.value = place.lng;
                city.value = place.city;
                if (place.country) country.value = place.country;
                return true;
            } catch (error) {
                console.error("Search error:", error);
                searchError.value = "Error searching location";
                return false;
            }
        }

        const searchLocation = AppUtils.debounce(async () => {
            if (await applySearch()) updateMapPosition();
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

        function cyclePosterStyle(direction) {
            const currentIndex = styleNames.indexOf(posterStyle.value);
            const nextIndex =
                (currentIndex + direction + styleNames.length) %
                styleNames.length;
            setPosterStyle(styleNames[nextIndex]);
            applyColors();
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
            if (await applySearch()) enterEditor();
        }

        function quickCity(cityName) {
            if (cityName !== "random") {
                searchQuery.value = cityName;
                goToCity();
                return;
            }

            const cities = PosterConfig.randomCities;
            const pick = cities[Math.floor(Math.random() * cities.length)];
            lat.value = pick.lat;
            lng.value = pick.lng;
            city.value = pick.name;
            country.value = pick.country;
            enterEditor();
        }

        async function enterEditor() {
            // Show transition overlay to hide map loading
            transitionShowCity.value = true;
            isTransitioning.value = true;
            searchQuery.value = "";
            await nextTick();

            // Wait for overlay to fully cover
            await new Promise((r) => setTimeout(r, 400));

            viewMode.value = "editor";
            coords.value = AppUtils.formatCoords(lat.value, lng.value);

            await nextTick();
            // Let DOM render then init map
            await new Promise((r) => setTimeout(r, 150));
            await initMap();
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

            const posterTextEls = document.querySelectorAll(".poster-text");
            posterTextEls.forEach((posterTextEl) => {
                const isTop =
                    posterTextEl.classList.contains("poster-text--top");
                const heights = PosterConfig.textBlockHeights;
                const baseHeight =
                    labelPlacement.value === "split"
                        ? isTop
                            ? heights.splitTop
                            : heights.splitBottom
                        : heights.default;

                if (!showFade.value || fadeIntensity.value === 0) {
                    posterTextEl.style.background = "transparent";
                    posterTextEl.style.height = `${baseHeight}px`;
                    return;
                }

                const grad = AppUtils.computeGradientStyle(
                    bgColor.value,
                    fadeIntensity.value,
                    solidBlockHeight.value,
                    baseHeight,
                );
                posterTextEl.style.height = grad.height;
                posterTextEl.style.background = isTop
                    ? grad.background.replace("to bottom", "to top")
                    : grad.background;
            });
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
                labelPlacement,
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

        watch(mapShape, () => {
            setTimeout(() => {
                if (mapInstance.value) mapInstance.value.resize();
            }, 100);
        });

        return {
            // View Mode
            viewMode,

            // State
            lat,
            lng,
            zoom,
            searchQuery,
            searchError,
            posterStyle,
            styleOptions: PosterConfig.styleOptions,
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

            // Map Shape & Label Placement
            mapShape,
            mapShapeOptions: PosterConfig.mapShapeOptions,
            labelPlacement,
            labelPlacementOptions: PosterConfig.labelPlacementOptions,

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
            setOrientation,
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
