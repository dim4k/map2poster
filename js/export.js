// ============================================================================
// POSTER EXPORT
// ----------------------------------------------------------------------------
// 1. The map is re-rendered at the output resolution (setPixelRatio), so the
//    printed map gets the requested dpi instead of a stretched screen canvas.
//    When the GPU allows it, it is rendered up to 2x larger and scaled down
//    (supersampling): thin roads and diagonal edges come out smooth instead of
//    stair-stepped.
// 2. html2canvas captures only the poster overlay (frame, labels, fade) with the
//    map area left transparent.
// 3. Both layers are composed on a canvas; the map is clipped to its shape
//    (circle, heart, star), which CSS masks cannot provide to html2canvas.
// ============================================================================
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.PosterExport = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
    "use strict";

    const IOS_MAX_PIXELS = 16777216; // iOS Safari canvas area limit
    const IDLE_TIMEOUT = 60000;
    const MAX_SUPERSAMPLE = 2;
    // Map canvas budget for supersampling (~256 MB of RGBA). A1 at 1x already
    // exceeds it, so A1 is never supersampled.
    const SUPERSAMPLE_PIXELS = 64 * 1024 * 1024;

    function isIOS() {
        if (typeof navigator === "undefined") return false;
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }

    // Output size for a paper format. The poster is designed at A1 (posterSize).
    // `maxPixels` lowers the dpi when the browser cannot hold the canvas (iOS).
    function exportSize({ format, dpi, orientation, posterSize, formats, maxPixels = Infinity }) {
        const short = formats[format];
        if (!short) throw new Error(`Unknown format: ${format}`);
        let effectiveDpi = dpi;
        let scale = (short / formats.A1) * (dpi / 300);
        const base = orientation === "landscape"
            ? { w: posterSize.height, h: posterSize.width }
            : { w: posterSize.width, h: posterSize.height };
        let width = Math.round(base.w * scale);
        let height = Math.round(base.h * scale);
        if (width * height > maxPixels) {
            const k = Math.sqrt(maxPixels / (width * height));
            effectiveDpi = Math.floor(dpi * k);
            scale = (short / formats.A1) * (effectiveDpi / 300);
            width = Math.round(base.w * scale);
            height = Math.round(base.h * scale);
        }
        return { width, height, scale, dpi: effectiveDpi, requestedDpi: dpi, limited: effectiveDpi < dpi };
    }

    // Supersampling factor for the map canvas (1 = none). The map is rendered at
    // `scale * factor` and downscaled into the poster; the factor stays within the
    // GPU canvas side and the pixel budget.
    function supersample({ mapWidth, mapHeight, scale, maxSide = Infinity, maxPixels = SUPERSAMPLE_PIXELS }) {
        const w = mapWidth * scale;
        const h = mapHeight * scale;
        if (!(w > 0 && h > 0)) return 1;
        const bySide = maxSide / Math.max(w, h);
        const byArea = Math.sqrt(maxPixels / (w * h));
        const factor = Math.min(MAX_SUPERSAMPLE, bySide, byArea);
        // Below 1.25x the gain is not worth the extra GPU memory and render time.
        return factor >= 1.25 ? Math.floor(factor * 100) / 100 : 1;
    }

    // Clip path for a shape: 100×100 path fitted ("contain") and centred in `rect`.
    function shapeClipPath(pathData, rect) {
        const side = Math.min(rect.w, rect.h);
        const x = rect.x + (rect.w - side) / 2;
        const y = rect.y + (rect.h - side) / 2;
        const path = new Path2D();
        path.addPath(new Path2D(pathData), new DOMMatrix().translate(x, y).scale(side / 100));
        return path;
    }

    function abortError() {
        return new DOMException("Export cancelled", "AbortError");
    }

    function throwIfAborted(signal) {
        if (signal && signal.aborted) throw abortError();
    }

    function waitForIdle(map, signal, timeout) {
        return new Promise((resolve, reject) => {
            let timer = null;
            const cleanup = () => {
                clearTimeout(timer);
                map.off("idle", onIdle);
                if (signal) signal.removeEventListener("abort", onAbort);
            };
            const onIdle = () => { cleanup(); resolve(); };
            const onAbort = () => { cleanup(); reject(abortError()); };
            timer = setTimeout(() => {
                cleanup();
                reject(new Error("map tiles took too long to load. Check your connection and try again."));
            }, timeout);
            map.on("idle", onIdle);
            if (signal) signal.addEventListener("abort", onAbort, { once: true });
            map.triggerRepaint();
        });
    }

    // Halves the canvas until it is at most 2x the target, so the final draw
    // averages neighbouring pixels instead of skipping them (bilinear sampling
    // only looks at 2x2 pixels).
    function downscaled(source, width, height) {
        let current = source;
        while (current.width >= width * 2 && current.height >= height * 2) {
            const next = document.createElement("canvas");
            next.width = Math.round(current.width / 2);
            next.height = Math.round(current.height / 2);
            const ctx = next.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(current, 0, 0, next.width, next.height);
            if (current !== source) current.width = current.height = 0;
            current = next;
        }
        return current;
    }

    function canvasToBlob(canvas) {
        return new Promise((resolve) => {
            try {
                canvas.toBlob(resolve, "image/png");
            } catch (error) {
                resolve(null);
            }
        });
    }

    /**
     * @returns {Promise<{ blob: Blob, mapDpi: number }>}
     */
    async function render({ posterElement, map, size, bgColor, mapShapePath, previewPixelRatio, maxCanvasSide, signal, onStep = () => {} }) {
        const body = document.body;
        let overlay = null;
        let output = null;
        const onTileLoading = (e) => { if (e.tile) onStep("tiles", { requested: 1 }); };
        const onTileLoaded = (e) => { if (e.tile && e.dataType === "source") onStep("tiles", { loaded: 1 }); };

        body.classList.add("is-exporting");
        try {
            onStep("layout");
            if (document.fonts) await document.fonts.ready;
            throwIfAborted(signal);

            // Map at export resolution: the container keeps its design size, the canvas gets more pixels.
            onStep("map");
            map.on("dataloading", onTileLoading);
            map.on("data", onTileLoaded);
            map.resize();
            const container = posterElement.querySelector(".map-shape-container");
            const rect = {
                x: container.offsetLeft,
                y: container.offsetTop,
                w: container.offsetWidth,
                h: container.offsetHeight,
            };
            const factor = supersample({
                mapWidth: rect.w,
                mapHeight: rect.h,
                scale: size.scale,
                maxSide: maxCanvasSide,
                maxPixels: isIOS() ? IOS_MAX_PIXELS : SUPERSAMPLE_PIXELS,
            });
            map.setPixelRatio(size.scale * factor);
            await waitForIdle(map, signal, IDLE_TIMEOUT);
            throwIfAborted(signal);

            const mapCanvas = map.getCanvas();
            const mapRatio = Math.min(1, mapCanvas.width / (rect.w * size.scale));

            onStep("compose");
            const posterWidth = posterElement.offsetWidth;
            const posterHeight = posterElement.offsetHeight;
            overlay = await html2canvas(posterElement, {
                scale: size.scale,
                backgroundColor: null,
                useCORS: true,
                logging: false,
                width: posterWidth,
                height: posterHeight,
                windowWidth: posterWidth,
                windowHeight: posterHeight,
                ignoreElements: (el) =>
                    !!el.classList &&
                    (el.classList.contains("map-shape-container") ||
                        el.classList.contains("map-drag-hint") ||
                        el.classList.contains("map-loading-overlay")),
            });
            throwIfAborted(signal);

            output = document.createElement("canvas");
            output.width = size.width;
            output.height = size.height;
            const ctx = output.getContext("2d");
            if (!ctx) throw new Error("this browser cannot create the image.");
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, size.width, size.height);

            const target = { x: rect.x * size.scale, y: rect.y * size.scale, w: rect.w * size.scale, h: rect.h * size.scale };
            ctx.save();
            if (mapShapePath) ctx.clip(shapeClipPath(mapShapePath, target));
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            const mapImage = downscaled(mapCanvas, Math.round(target.w), Math.round(target.h));
            ctx.drawImage(mapImage, target.x, target.y, target.w, target.h);
            if (mapImage !== mapCanvas) mapImage.width = mapImage.height = 0;
            ctx.restore();
            ctx.drawImage(overlay, 0, 0, size.width, size.height);

            // Give the GPU memory back before encoding.
            map.setPixelRatio(previewPixelRatio());

            const blob = await canvasToBlob(output);
            if (!blob) throw new Error("the image is too large for this browser. Choose a smaller format or 150 dpi.");
            throwIfAborted(signal);
            return {
                blob: await AppUtils.setDpi(blob, size.dpi),
                mapDpi: Math.round(size.dpi * mapRatio),
            };
        } finally {
            map.off("dataloading", onTileLoading);
            map.off("data", onTileLoaded);
            body.classList.remove("is-exporting");
            map.setPixelRatio(previewPixelRatio());
            map.resize();
            for (const canvas of [overlay, output]) {
                if (canvas) {
                    canvas.width = 0;
                    canvas.height = 0;
                }
            }
        }
    }

    function saveBlob(blob, name) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    return { IOS_MAX_PIXELS, isIOS, exportSize, supersample, render, saveBlob };
});
