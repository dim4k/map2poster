const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

// ============================================================================
// Helpers
// ============================================================================
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_MIN_INTERVAL = 1000; // usage policy: at most one request per second
const MIN_ZOOM = 10;
const MAX_ZOOM = 18;
let lastSearchAt = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Largest WebGL canvas side this GPU supports (used for full-resolution export).
function gpuMaxCanvas() {
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (!gl) return 4096;
        const dims = gl.getParameter(gl.MAX_VIEWPORT_DIMS) || [16384, 16384];
        const size = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), dims[0], dims[1]);
        const lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
        return size || 4096;
    } catch (error) {
        return 4096;
    }
}

function placeKind(result) {
    const raw = String(result.addresstype || result.type || result.category || "place").replace(/_/g, " ");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function toPlace(r) {
    const a = r.address || {};
    const name = r.name || (r.display_name || "").split(",")[0];
    const city = a.city || a.town || a.village || a.municipality || a.hamlet || a.suburb || name;
    const country = a.country || "";
    const context = [city !== name ? city : null, a.county, a.state, country]
        .filter((part, i, list) => part && list.indexOf(part) === i)
        .join(", ");
    const bbox = (r.boundingbox || []).map(Number);
    return {
        id: String(r.place_id),
        name,
        context,
        kind: placeKind(r),
        city,
        country,
        lat: Number(r.lat),
        lng: Number(r.lon),
        bbox: bbox.length === 4 && bbox.every(Number.isFinite) ? bbox : null,
    };
}

// Nominatim search: explicit only (Enter / button), rate-limited, cancellable.
async function searchPlaces(query, signal) {
    const wait = NOMINATIM_MIN_INTERVAL - (Date.now() - lastSearchAt);
    if (wait > 0) await sleep(wait);
    if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
    lastSearchAt = Date.now();
    const params = new URLSearchParams({
        format: "jsonv2",
        addressdetails: "1",
        limit: "6",
        "accept-language": navigator.language || "en",
        q: query,
    });
    const response = await fetch(`${NOMINATIM_URL}?${params}`, { signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()).map(toPlace);
}

// One search box (landing or editor): results list, keyboard navigation, cancellation.
function createSearch(onSelect) {
    const state = reactive({ query: "", results: [], active: -1, open: false, loading: false, error: "" });
    let controller = null;

    async function run() {
        const query = state.query.trim();
        if (!query) return;
        if (controller) controller.abort();
        const current = new AbortController();
        controller = current;
        state.loading = true;
        state.error = "";
        try {
            const results = await searchPlaces(query, current.signal);
            if (controller !== current) return;
            if (results.length === 1) {
                close();
                onSelect(results[0]);
                return;
            }
            state.results = results;
            state.active = results.length ? 0 : -1;
            state.open = results.length > 0;
            if (!results.length) state.error = `No place found for “${query}”. Check the spelling or add the country.`;
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("Search error:", error);
            state.error = "Search is unavailable right now. Check your connection and try again.";
        } finally {
            if (controller === current) {
                state.loading = false;
                controller = null;
            }
        }
    }

    function close() {
        state.open = false;
        state.results = [];
        state.active = -1;
    }

    function select(result) {
        close();
        onSelect(result);
    }

    function onInput() {
        // Typing never sends a request (Nominatim forbids autocomplete); it only invalidates results.
        state.error = "";
        close();
    }

    function onKeydown(event) {
        const count = state.results.length;
        if (event.key === "ArrowDown" && count) {
            event.preventDefault();
            state.open = true;
            state.active = (state.active + 1) % count;
        } else if (event.key === "ArrowUp" && count) {
            event.preventDefault();
            state.open = true;
            state.active = (state.active - 1 + count) % count;
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (state.open && state.active >= 0) select(state.results[state.active]);
            else run();
        } else if (event.key === "Escape") {
            state.open = false;
        }
    }

    function clear() {
        if (controller) controller.abort();
        state.query = "";
        state.error = "";
        state.loading = false;
        close();
    }

    return { state, run, select, onInput, onKeydown, clear };
}

// ============================================================================
// Components
// ============================================================================
const ColorPalette = {
    props: {
        items: { type: Array, required: true },
        swatches: { type: Array, default: () => [] },
        groupLabel: { type: String, required: true },
        idPrefix: { type: String, required: true },
    },
    emits: ["change"],
    setup(props, { emit }) {
        const selected = ref(null);
        const draft = ref("");
        const error = ref(false);
        const editing = ref(false);
        const current = computed(() => props.items.find((item) => item.key === selected.value) || null);

        watch(
            () => current.value && current.value.value,
            (value) => {
                if (value && !editing.value) {
                    draft.value = value;
                    error.value = false;
                }
            },
            { immediate: true },
        );

        function toggle(key) {
            selected.value = selected.value === key ? null : key;
            editing.value = false;
            error.value = false;
            if (current.value) draft.value = current.value.value;
        }

        function apply(value) {
            if (current.value && value !== current.value.value) emit("change", current.value.key, value);
        }

        function onDraft(event) {
            editing.value = true;
            draft.value = event.target.value;
            const hex = AppUtils.normalizeHex(draft.value);
            if (hex) {
                error.value = false;
                apply(hex);
            } else if (draft.value.replace("#", "").length >= 6) {
                error.value = true;
            }
        }

        function commit() {
            editing.value = false;
            const hex = AppUtils.normalizeHex(draft.value);
            if (hex) {
                error.value = false;
                draft.value = hex;
                apply(hex);
            } else {
                error.value = true;
            }
        }

        function pick(value) {
            const hex = AppUtils.normalizeHex(value);
            if (!hex) return;
            editing.value = false;
            error.value = false;
            draft.value = hex;
            apply(hex);
        }

        function reset() {
            if (current.value) pick(current.value.themeValue);
        }

        return { selected, draft, error, current, toggle, onDraft, commit, pick, reset };
    },
    template: `
      <div class="palette">
        <div class="chips" role="group" :aria-label="groupLabel">
          <button v-for="item in items" :key="item.key" type="button" class="chip"
            :class="{ 'is-selected': selected === item.key, 'is-modified': item.value !== item.themeValue, 'is-off': item.disabled }"
            :aria-pressed="selected === item.key ? 'true' : 'false'"
            @click="toggle(item.key)">
            <span class="chip-dot" :style="{ background: item.value }"></span>
            <span class="chip-label">{{ item.label }}<span v-if="item.value !== item.themeValue" class="visually-hidden"> (changed)</span></span>
          </button>
        </div>
        <div v-if="current" class="color-editor">
          <div class="color-editor-head">
            <span class="form-label">{{ current.label }}</span>
            <button v-if="current.value !== current.themeValue" type="button" class="btn btn-secondary btn-sm" @click="reset">
              ↺ Theme value {{ current.themeValue }}
            </button>
          </div>
          <p v-if="current.disabled && current.hint" class="form-hint">{{ current.hint }}</p>
          <div class="color-picker-container">
            <input type="color" class="color-picker" :id="idPrefix + '-picker'" :value="current.value"
              :aria-label="current.label + ' color picker'" @input="pick($event.target.value)">
            <input type="text" class="form-input form-input--mono" :class="{ invalid: error }" :id="idPrefix + '-hex'"
              :value="draft" maxlength="7" spellcheck="false" autocomplete="off"
              :aria-label="current.label + ' hex code'"
              :aria-invalid="error ? 'true' : 'false'"
              :aria-describedby="error ? idPrefix + '-error' : null"
              @input="onDraft" @change="commit" @keydown.enter.prevent="commit">
          </div>
          <p v-if="error" :id="idPrefix + '-error'" class="form-error" role="alert">
            Expected format: #RRGGBB, for example #294380. The last valid color stays applied.
          </p>
          <div v-if="swatches.length" class="swatches" role="group" aria-label="Theme colors">
            <button v-for="color in swatches" :key="color" type="button" class="swatch"
              :style="{ background: color }" :title="color" :aria-label="color" @click="pick(color)"></button>
          </div>
        </div>
      </div>`,
};

// ============================================================================
// App
// ============================================================================
const app = createApp({
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
        const coordsInput = reactive({ lat: "48.8566", lng: "2.3522", error: "" });
        let styleReady = false;
        let pendingPlace = null;
        const maxCanvas = gpuMaxCanvas();

        // Map Customization (Vector)
        const roadWidthScale = ref(1);
        const defaults = PosterConfig.themeDefaults("classic");
        const showBuildings = ref(defaults.showBuildings);
        const buildingColor = ref(defaults.buildingColor);
        const customWaterColor = ref(defaults.customWaterColor);
        const customRoadColor = ref(defaults.customRoadColor);
        const customParkColor = ref(defaults.customParkColor);
        const customLandColor = ref(defaults.customLandColor);

        // Poster customization
        const posterStyle = ref("classic");
        const borderStyle = ref("classic");

        const orientation = ref("portrait");
        const showCoords = ref(true);
        const showCity = ref(true);
        const showCountry = ref(true);
        const showAttribution = ref(true);

        // Gradient Fade
        const showFade = ref(true);
        const fadeIntensity = ref(defaults.fadeIntensity);
        const solidBlockHeight = ref(20);

        // Map Shape & Label Placement
        const mapShape = ref("none");
        const labelPlacement = ref("bottom");

        const borderColor = ref(defaults.borderColor);
        const textColor = ref(defaults.textColor);
        const bgColor = ref(defaults.bgColor);

        // Labels
        const city = ref("Paris");
        const country = ref("France");
        const updateLabelsOnSearch = ref(true);

        // Fonts
        const cityFont = ref(defaults.cityFont);
        const countryFont = ref(defaults.countryFont);
        const coordsFont = ref(defaults.coordsFont);

        // Export
        const exportFormat = ref("A1");
        const exportDpi = ref(300);
        const iosDevice = PosterExport.isIOS();

        // UI State
        const isTransitioning = ref(false);
        const transitionShowCity = ref(true);
        const isMapLoading = ref(false);
        const activePanel = ref(null);
        const theme = ref(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
        const posterScale = ref(0.05);

        // -------------------------------------------------------------------------
        // Toasts
        // -------------------------------------------------------------------------
        const toasts = ref([]);
        let toastSeq = 0;

        function notify(message, type = "info", { detail = "", action = null, duration } = {}) {
            const id = ++toastSeq;
            toasts.value.push({ id, message, type, detail, action });
            setTimeout(() => dismissToast(id), duration || (type === "error" ? 9000 : 6000));
            return id;
        }

        function dismissToast(id) {
            toasts.value = toasts.value.filter((t) => t.id !== id);
        }

        function runToastAction(toast) {
            dismissToast(toast.id);
            toast.action.run();
        }

        // -------------------------------------------------------------------------
        // Computed
        // -------------------------------------------------------------------------

        const displayCity = computed(() => city.value || "City");
        const displayCountry = computed(() => country.value || "");
        const displayCoords = computed(() => coords.value);
        const zoomDisplay = computed(() => Number(zoom.value).toFixed(1));

        const mapShapeStyle = computed(() => {
            const mask = PosterConfig.shapeMaskUrl(mapShape.value);
            return mask ? { maskImage: mask, WebkitMaskImage: mask } : {};
        });

        const styleThumbnails = Object.fromEntries(
            PosterConfig.styleOptions.map((o) => [o.value, PosterConfig.styleThumbnail(o.value)]),
        );

        // Settings that a theme provides; `modifiedFields` lists the ones the user changed.
        const themeRefs = {
            borderStyle,
            borderColor,
            textColor,
            bgColor,
            cityFont,
            countryFont,
            coordsFont,
            fadeIntensity,
            showBuildings,
            buildingColor,
            customWaterColor,
            customLandColor,
            customRoadColor,
            customParkColor,
        };
        const themeBase = computed(() => PosterConfig.themeDefaults(posterStyle.value));
        const modifiedFields = computed(() =>
            Object.keys(themeRefs).filter((key) => themeRefs[key].value !== themeBase.value[key]),
        );
        const panelModified = computed(() => {
            const out = { style: false, map: false, labels: false };
            for (const key of modifiedFields.value) out[PosterConfig.themeFieldPanel[key]] = true;
            return out;
        });

        const mapPalette = computed(() => [
            { key: "customLandColor", label: "Land", value: customLandColor.value, themeValue: themeBase.value.customLandColor },
            { key: "customWaterColor", label: "Water", value: customWaterColor.value, themeValue: themeBase.value.customWaterColor },
            { key: "customRoadColor", label: "Roads", value: customRoadColor.value, themeValue: themeBase.value.customRoadColor },
            { key: "customParkColor", label: "Parks", value: customParkColor.value, themeValue: themeBase.value.customParkColor },
            {
                key: "buildingColor",
                label: "Buildings",
                value: buildingColor.value,
                themeValue: themeBase.value.buildingColor,
                disabled: !showBuildings.value,
                hint: "Buildings are hidden. Turn on “Show buildings” to see this color.",
            },
        ]);
        const posterPalette = computed(() => [
            { key: "bgColor", label: "Background", value: bgColor.value, themeValue: themeBase.value.bgColor },
            { key: "borderColor", label: "Border", value: borderColor.value, themeValue: themeBase.value.borderColor },
            { key: "textColor", label: "Text", value: textColor.value, themeValue: themeBase.value.textColor },
        ]);
        const swatches = computed(() => {
            const { poster, map } = PosterConfig.styles[posterStyle.value];
            const list = [poster.bgColor, poster.borderColor, poster.textColor, map.background, map.water, map.roads, map.roadsMinor, map.parks, map.buildings];
            return list.filter((c, i) => list.indexOf(c) === i);
        });

        function setColor(key, value) {
            const hex = AppUtils.normalizeHex(value);
            if (hex && themeRefs[key]) themeRefs[key].value = hex;
        }

        const exportInfo = computed(() =>
            PosterExport.exportSize({
                format: exportFormat.value,
                dpi: exportDpi.value,
                orientation: orientation.value,
                posterSize: PosterConfig.posterSize,
                formats: PosterConfig.exportFormats,
                maxPixels: iosDevice ? PosterExport.IOS_MAX_PIXELS : Infinity,
            }),
        );

        // -------------------------------------------------------------------------
        // Methods
        // -------------------------------------------------------------------------

        function toggleTheme() {
            theme.value = theme.value === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", theme.value);
            try {
                localStorage.setItem("theme", theme.value);
            } catch (error) {
                // Storage unavailable (private mode): the choice lasts for this visit.
            }
        }

        // The map container keeps the full poster size (so tiles and line widths match the
        // export) but only renders as many pixels as the screen shows.
        function previewPixelRatio() {
            return Math.max(0.02, posterScale.value * (window.devicePixelRatio || 1));
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
                const map = new maplibregl.Map({
                    container: "map",
                    style: await MapStyles.loadBaseStyle(),
                    center: [lng.value, lat.value],
                    zoom: zoom.value,
                    minZoom: MIN_ZOOM,
                    maxZoom: MAX_ZOOM,
                    attributionControl: false, // credits are shown in the editor and on the poster
                    preserveDrawingBuffer: true,
                    maxPitch: 0,
                    dragRotate: false,
                    pitchWithRotate: false,
                    touchPitch: false,
                    pixelRatio: previewPixelRatio(),
                    maxCanvasSize: [maxCanvas, maxCanvas],
                });
                mapInstance.value = map;
                map.touchZoomRotate.disableRotation();

                // "style.load" only needs the style JSON. The "load" event also waits for every
                // tile and sprite, so one failed request would block styling forever.
                const onStyleLoad = () => {
                    if (styleReady) return;
                    styleReady = true;
                    updateMapStyle();
                    setTimeout(() => {
                        isMapLoading.value = false;
                    }, 300);
                };
                map.on("style.load", onStyleLoad);
                if (map.style && map.style._loaded) onStyleLoad();

                let mapErrorShown = false;
                map.on("error", (event) => {
                    console.warn("Map error:", event && event.error ? event.error.message : event);
                    if (!styleReady && !mapErrorShown) {
                        mapErrorShown = true;
                        notify("The map could not be loaded. Check your connection and reload the page.", "error");
                    }
                });

                // Safety fallback if load takes too long
                setTimeout(() => {
                    isMapLoading.value = false;
                }, 2000);

                map.on("moveend", () => {
                    const center = map.getCenter();
                    lat.value = center.lat;
                    lng.value = center.lng;
                    zoom.value = Math.round(map.getZoom() * 100) / 100;
                    coords.value = AppUtils.formatCoords(center.lat, center.lng);
                    coordsInput.lat = center.lat.toFixed(4);
                    coordsInput.lng = center.lng.toFixed(4);
                    coordsInput.error = "";
                });

                coords.value = AppUtils.formatCoords(lat.value, lng.value);
            } catch (error) {
                console.error("Map initialization error:", error);
                notify("The map could not be loaded. Check your connection and reload the page.", "error");
                isMapLoading.value = false;
            }
        }

        let mapStyleTimeout = null;
        let mapStyleVersion = 0;

        function updateMapStyle() {
            if (!mapInstance.value || !styleReady) return;

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

        function applyCoords() {
            const newLat = AppUtils.parseDecimal(coordsInput.lat);
            const newLng = AppUtils.parseDecimal(coordsInput.lng);
            if (!(newLat >= -85 && newLat <= 85) || !(newLng >= -180 && newLng <= 180)) {
                coordsInput.error = "Enter a latitude between −85 and 85 and a longitude between −180 and 180.";
                return;
            }
            coordsInput.error = "";
            lat.value = newLat;
            lng.value = newLng;
            updateMapPosition();
        }

        // Centre on the place and pick a zoom from its bounding box (clamped to poster-friendly values).
        function framePlace(place) {
            const map = mapInstance.value;
            if (!map) return;
            let targetZoom = zoom.value;
            if (place.bbox) {
                const [south, north, west, east] = place.bbox;
                const padding = orientation.value === "portrait"
                    ? { top: 600, bottom: 2200, left: 500, right: 500 }
                    : { top: 500, bottom: 1500, left: 900, right: 900 };
                const camera = map.cameraForBounds([[west, south], [east, north]], { padding });
                if (camera && Number.isFinite(camera.zoom)) targetZoom = Math.min(15, Math.max(11, camera.zoom));
            }
            map.jumpTo({ center: [place.lng, place.lat], zoom: targetZoom });
        }

        function applyPlace(place, { updateLabels = true } = {}) {
            lat.value = place.lat;
            lng.value = place.lng;
            if (updateLabels) {
                city.value = place.city;
                country.value = place.country;
            }
        }

        // Landing search: choosing a place opens the editor.
        const landingSearch = createSearch((place) => {
            applyPlace(place);
            pendingPlace = place;
            enterEditor();
        });

        // Editor search: choosing a place moves the map; the title follows only if asked.
        const editorSearch = createSearch((place) => {
            applyPlace(place, { updateLabels: updateLabelsOnSearch.value });
            framePlace(place);
            editorSearch.state.query = place.name;
        });

        const editorActiveResult = computed(() => {
            const s = editorSearch.state;
            return s.open && s.active >= 0 ? s.results[s.active] : null;
        });
        const updateLabelsText = computed(() => {
            const r = editorActiveResult.value;
            return r ? `Update the poster title: ${[r.city, r.country].filter(Boolean).join(", ")}` : "Update the poster title";
        });

        function applyThemeValues(values) {
            for (const key of Object.keys(themeRefs)) {
                if (key in values) themeRefs[key].value = values[key];
            }
        }

        function setPosterStyle(style, { silent = false } = {}) {
            if (!PosterConfig.styles[style]) return;
            const modified = modifiedFields.value;
            const snapshot = modified.length
                ? { style: posterStyle.value, values: Object.fromEntries(Object.keys(themeRefs).map((k) => [k, themeRefs[k].value])) }
                : null;

            posterStyle.value = style;
            applyThemeValues(PosterConfig.themeDefaults(style));
            updateMapStyle();

            if (snapshot && !silent) {
                const name = style.charAt(0).toUpperCase() + style.slice(1);
                notify(
                    `${name} applied. ${modified.length} custom setting${modified.length > 1 ? "s were" : " was"} replaced.`,
                    "info",
                    {
                        action: {
                            label: "Undo",
                            run: () => {
                                posterStyle.value = snapshot.style;
                                applyThemeValues(snapshot.values);
                                updateMapStyle();
                            },
                        },
                        duration: 8000,
                    },
                );
            }
        }

        const styleNames = Object.keys(PosterConfig.styles);

        function cyclePosterStyle(direction) {
            const currentIndex = styleNames.indexOf(posterStyle.value);
            const nextIndex = (currentIndex + direction + styleNames.length) % styleNames.length;
            setPosterStyle(styleNames[nextIndex]);
        }

        // Keyboard navigation: ←/→ cycle styles, unless the user is typing or choosing.
        window.addEventListener("keydown", (e) => {
            if (viewMode.value !== "editor" || exportState.open) return;
            const target = e.target;
            if (
                target &&
                (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) || target.isContentEditable)
            )
                return;
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                cyclePosterStyle(-1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                cyclePosterStyle(1);
            } else if (e.key === "Escape" && activePanel.value) {
                activePanel.value = null;
            }
        });

        // Landing -> Editor transitions
        async function quickCity(cityName) {
            if (cityName !== "random") {
                landingSearch.state.query = cityName;
                try {
                    const results = await searchPlaces(cityName);
                    if (results.length) {
                        applyPlace(results[0]);
                        pendingPlace = results[0];
                        enterEditor();
                    } else {
                        landingSearch.state.error = `No place found for “${cityName}”.`;
                    }
                } catch (error) {
                    landingSearch.state.error = "Search is unavailable right now. Check your connection and try again.";
                }
                return;
            }

            const cities = PosterConfig.randomCities;
            const pick = cities[Math.floor(Math.random() * cities.length)];
            lat.value = pick.lat;
            lng.value = pick.lng;
            city.value = pick.name;
            country.value = pick.country;
            pendingPlace = null;
            enterEditor();
        }

        async function enterEditor() {
            // Show transition overlay to hide map loading
            transitionShowCity.value = true;
            isTransitioning.value = true;
            landingSearch.clear();
            await nextTick();

            // Wait for overlay to fully cover
            await sleep(400);

            viewMode.value = "editor";
            coords.value = AppUtils.formatCoords(lat.value, lng.value);
            coordsInput.lat = Number(lat.value).toFixed(4);
            coordsInput.lng = Number(lng.value).toFixed(4);

            await nextTick();
            // Let DOM render then init map
            await sleep(150);
            fitPosterToViewport();
            await initMap();
            updateMapPosition();
            if (pendingPlace) framePlace(pendingPlace);
            pendingPlace = null;
            applyColors();
            updateMapStyle();
            fitPosterText();

            // Wait for map tiles to start rendering
            await sleep(600);
            isTransitioning.value = false;
        }

        function fitPosterToViewport() {
            const poster = document.getElementById("poster-render");
            if (!poster) return;

            const posterW = parseFloat(getComputedStyle(poster).getPropertyValue("--poster-width"));
            const posterH = parseFloat(getComputedStyle(poster).getPropertyValue("--poster-height"));
            if (!posterW || !posterH) return;

            const availW = window.innerWidth - 48; // side padding
            const availH = window.innerHeight - 260; // top bar + bottom toolbar + switcher + breathing room
            const scale = Math.min(availW / posterW, availH / posterH);
            poster.style.setProperty("--poster-scale", scale.toFixed(5));
            posterScale.value = scale;
            if (mapInstance.value && !exportState.open) mapInstance.value.setPixelRatio(previewPixelRatio());
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
            await sleep(400);

            viewMode.value = "landing";
            activePanel.value = null;
            editorSearch.clear();

            // Destroy editor map so it can be re-created on next enter
            if (mapInstance.value) {
                mapInstance.value.remove();
                mapInstance.value = null;
                styleReady = false;
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
            await sleep(300);
            isTransitioning.value = false;
        }

        // Resets everything shown in the Map panel to the current theme's values.
        function resetMapColors() {
            const d = themeBase.value;
            customWaterColor.value = d.customWaterColor;
            customLandColor.value = d.customLandColor;
            customRoadColor.value = d.customRoadColor;
            customParkColor.value = d.customParkColor;
            buildingColor.value = d.buildingColor;
            showBuildings.value = d.showBuildings;
            updateMapStyle();
        }

        function setOrientation(newOrientation) {
            orientation.value = newOrientation;
            setTimeout(() => {
                fitPosterToViewport();
                if (mapInstance.value) mapInstance.value.resize();
            }, 100);
        }

        function togglePanel(panelName) {
            activePanel.value = activePanel.value === panelName ? null : panelName;
        }

        // -------------------------------------------------------------------------
        // Title fitting (long city names shrink to stay inside the frame)
        // -------------------------------------------------------------------------
        let fitFrame = 0;
        function fitPosterText() {
            if (fitFrame) cancelAnimationFrame(fitFrame);
            fitFrame = requestAnimationFrame(async () => {
                fitFrame = 0;
                await nextTick();
                if (document.fonts) await document.fonts.ready;
                const poster = document.getElementById("poster-render");
                if (!poster) return;
                poster.querySelectorAll(".poster-city").forEach((el) => fitBlock(el, 0.4));
                poster.querySelectorAll(".poster-country").forEach((el) => fitBlock(el, 0.5));
                poster.querySelectorAll(".poster-title-line").forEach(fitInlineLine);
            });
        }

        // Block line (portrait): measured with offsetWidth, which ignores the preview's CSS scale.
        function fitBlock(el, minRatio) {
            el.style.fontSize = "";
            el.style.letterSpacing = "";
            el.style.textIndent = "";
            el.style.whiteSpace = "nowrap";
            const container = el.parentElement;
            if (!container || !container.clientWidth) return;
            const cs = getComputedStyle(el);
            const size = parseFloat(cs.fontSize);
            const spacing = parseFloat(cs.letterSpacing) || 0;
            const indent = parseFloat(cs.textIndent) || 0;
            const chars = Array.from(el.textContent.trim()).length;
            const dividers = [...el.querySelectorAll(".poster-divider")];
            const gap = parseFloat(cs.columnGap) || 0;
            const extra = dividers.reduce((sum, d) => sum + d.offsetWidth, 0) + (dividers.length ? dividers.length * gap : 0);
            const maxWidth = container.clientWidth * 0.9 - extra;
            const glyphWidth = el.offsetWidth - extra - spacing * chars - indent;
            const fit = AppUtils.fitText({
                glyphWidth,
                gaps: chars + (indent ? 1 : 0),
                size,
                spacing,
                maxWidth,
                minRatio,
            });
            if (fit.size === size && fit.spacing === spacing) return;
            el.style.fontSize = `${fit.size}px`;
            el.style.letterSpacing = `${fit.spacing}px`;
            if (indent) el.style.textIndent = `${fit.spacing}px`;
        }

        // Inline title line (landscape): scale every part by the same ratio.
        function fitInlineLine(line) {
            const parts = [...line.children];
            parts.forEach((p) => {
                p.style.fontSize = "";
                p.style.letterSpacing = "";
            });
            line.style.gap = "";
            line.style.flexWrap = "nowrap";
            const container = line.parentElement;
            if (!container || !container.clientWidth) return;
            const ratio = Math.max(0.4, Math.min(1, (container.clientWidth * 0.9) / line.offsetWidth));
            if (ratio >= 1) return;
            parts.forEach((p) => {
                const cs = getComputedStyle(p);
                p.style.fontSize = `${parseFloat(cs.fontSize) * ratio}px`;
                p.style.letterSpacing = `${(parseFloat(cs.letterSpacing) || 0) * ratio}px`;
            });
            line.style.gap = `${(parseFloat(getComputedStyle(line).columnGap) || 0) * ratio}px`;
        }

        // -------------------------------------------------------------------------
        // Export
        // -------------------------------------------------------------------------
        const exportState = reactive({ open: false, step: "", requested: 0, loaded: 0, width: 0, height: 0, dpi: 0 });
        const cancelExportBtn = ref(null);
        let exportController = null;
        const EXPORT_STEPS = ["layout", "map", "compose"];

        function exportStepState(step) {
            const current = EXPORT_STEPS.indexOf(exportState.step);
            const index = EXPORT_STEPS.indexOf(step);
            if (current > index) return "done";
            if (current === index) return "active";
            return "todo";
        }

        const tileProgress = computed(() =>
            exportState.requested ? Math.round((exportState.loaded / exportState.requested) * 100) : null,
        );

        function cancelExport() {
            if (exportController) exportController.abort();
        }

        async function downloadPoster() {
            if (exportState.open) return;
            const map = mapInstance.value;
            const posterElement = document.getElementById("poster-render");
            if (!map || !styleReady || !posterElement) {
                notify("The map is not ready yet. Wait for it to load and try again.", "error");
                return;
            }
            activePanel.value = null;
            const size = exportInfo.value;
            const controller = new AbortController();
            exportController = controller;
            Object.assign(exportState, { open: true, step: "layout", requested: 0, loaded: 0, width: size.width, height: size.height, dpi: size.dpi });
            await nextTick();
            if (cancelExportBtn.value) cancelExportBtn.value.focus();

            const fileName = `Map2Poster_${AppUtils.sanitizeFilename(city.value)}_${posterStyle.value}_${exportFormat.value}.png`;
            try {
                const result = await PosterExport.render({
                    posterElement,
                    map,
                    size,
                    bgColor: bgColor.value,
                    mapShapePath: PosterConfig.mapShapes[mapShape.value] || null,
                    previewPixelRatio,
                    maxCanvasSide: maxCanvas,
                    signal: controller.signal,
                    onStep: (step, tiles) => {
                        if (step === "tiles") {
                            exportState.requested += tiles.requested || 0;
                            exportState.loaded = Math.min(exportState.requested, exportState.loaded + (tiles.loaded || 0));
                        } else {
                            exportState.step = step;
                        }
                    },
                });
                PosterExport.saveBlob(result.blob, fileName);
                notify(`${fileName} saved`, "success", {
                    detail: `${size.width} × ${size.height} px · ${size.dpi} dpi · ${AppUtils.formatBytes(result.blob.size)}`,
                });
                if (size.limited) notify(`Resolution lowered to ${size.dpi} dpi on this device.`, "info");
                if (result.mapDpi < size.dpi * 0.97)
                    notify(`Your graphics card limits the map to about ${result.mapDpi} dpi. Text and frame stay at ${size.dpi} dpi.`, "info");
            } catch (error) {
                if (error && error.name === "AbortError") {
                    notify("Export cancelled.", "info");
                } else {
                    console.error("Export error:", error);
                    notify(`Export failed: ${(error && error.message) || error}`, "error");
                }
            } finally {
                exportState.open = false;
                exportState.step = "";
                exportController = null;
                fitPosterToViewport();
            }
        }

        function applyColors() {
            document.documentElement.style.setProperty("--poster-border", borderColor.value);
            document.documentElement.style.setProperty("--poster-text", textColor.value);
            document.documentElement.style.setProperty("--poster-bg", bgColor.value);

            const heights = PosterConfig.textBlockHeights;
            const posterTextEls = document.querySelectorAll(".poster-text");
            posterTextEls.forEach((posterTextEl) => {
                const isTop = posterTextEl.classList.contains("poster-text--top");
                let baseHeight = orientation.value === "landscape" ? heights.landscape : heights.default;
                if (labelPlacement.value === "split") baseHeight = isTop ? heights.splitTop : heights.splitBottom;

                if (!showFade.value || fadeIntensity.value === 0) {
                    posterTextEl.style.background = "transparent";
                    posterTextEl.style.height = `${baseHeight}px`;
                    return;
                }

                const grad = AppUtils.computeGradientStyle(bgColor.value, fadeIntensity.value, solidBlockHeight.value, baseHeight);
                posterTextEl.style.height = grad.height;
                posterTextEl.style.background = isTop ? grad.background.replace("to bottom", "to top") : grad.background;
            });
        }

        // -------------------------------------------------------------------------
        // Lifecycle
        // -------------------------------------------------------------------------

        onMounted(() => {
            initLandingMap();
            coords.value = AppUtils.formatCoords(lat.value, lng.value);
            if (document.fonts) document.fonts.addEventListener("loadingdone", fitPosterText);
        });

        // -------------------------------------------------------------------------
        // Watchers
        // -------------------------------------------------------------------------

        watch([lat, lng], () => {
            coords.value = AppUtils.formatCoords(lat.value, lng.value);
        });

        watch(zoom, (value) => {
            if (mapInstance.value && Math.abs(mapInstance.value.getZoom() - value) > 0.005) updateMapPosition();
        });
        watch(
            [borderColor, textColor, bgColor, showFade, fadeIntensity, solidBlockHeight, labelPlacement, orientation],
            () => nextTick(applyColors),
        );
        watch(
            [showBuildings, buildingColor, roadWidthScale, customWaterColor, customRoadColor, customParkColor, customLandColor],
            updateMapStyle,
        );
        watch(
            [city, country, cityFont, countryFont, orientation, labelPlacement, showCity, showCountry, posterStyle, borderStyle, viewMode],
            fitPosterText,
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
            zoomDisplay,
            coordsInput,
            posterStyle,
            styleOptions: PosterConfig.styleOptions,
            styleThumbnails,
            orientation,
            showCoords,
            showCity,
            showCountry,
            showAttribution,
            borderColor,
            textColor,
            bgColor,
            city,
            country,
            isTransitioning,
            transitionShowCity,
            isMapLoading,
            activePanel,
            panelModified,
            modifiedFields,
            displayCity,
            displayCountry,
            displayCoords,
            roadWidthScale,
            showBuildings,
            buildingColor,
            mapPalette,
            posterPalette,
            swatches,
            mapShapeStyle,
            MIN_ZOOM,
            MAX_ZOOM,

            // Search
            landingSearch,
            editorSearch,
            updateLabelsOnSearch,
            updateLabelsText,

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

            // Export
            exportFormat,
            exportDpi,
            exportFormats: Object.keys(PosterConfig.exportFormats),
            exportDpis: PosterConfig.exportDpis,
            exportInfo,
            exportState,
            exportStepState,
            tileProgress,
            cancelExportBtn,

            // Toasts
            toasts,
            dismissToast,
            runToastAction,

            // Theme
            theme,

            // Methods
            toggleTheme,
            updateMapPosition,
            applyCoords,
            setPosterStyle,
            cyclePosterStyle,
            setOrientation,
            togglePanel,
            downloadPoster,
            cancelExport,
            resetMapColors,
            setColor,
            applyColors,

            // Landing methods
            quickCity,
            backToLanding,
        };
    },
});

app.component("color-palette", ColorPalette);
app.mount("#app");
