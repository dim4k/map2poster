// ============================================================================
// POSTER EXPORT
// ----------------------------------------------------------------------------
// 1. The map area is re-rendered at the output resolution by a hidden map,
//    piece by piece (at most 4096 px per piece), so the size is not bound by
//    the GPU canvas limit. Pieces are rendered up to 2x larger and scaled down
//    (supersampling) so thin roads come out smooth.
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
    // Largest output: Chrome refuses canvases above ~268M pixels, and the overlay
    // and output canvases are both held in memory while composing.
    const MAX_OUTPUT_PIXELS = 150000000;
    const IDLE_TIMEOUT = 60000;
    const MAX_SUPERSAMPLE = 2;
    // Map pixels rendered across all pieces; bounds the supersampling (export time).
    const SUPERSAMPLE_PIXELS = 256 * 1024 * 1024;
    const PIECE_MARGIN = 8; // device px rendered around each piece, then cropped

    function isIOS() {
        if (typeof navigator === "undefined") return false;
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }

    // Output size for a paper format. The poster is designed at A1 (posterSize).
    // `maxPixels` lowers the dpi when the browser cannot hold the canvas.
    function exportSize({ format, dpi, orientation, posterSize, formats, maxPixels = MAX_OUTPUT_PIXELS }) {
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

    // Supersampling factor for the map (1 = none). The map is rendered at
    // `scale * factor` and scaled down into the poster; `maxPixels` bounds the
    // total rendered pixels, i.e. the export time.
    function supersample({ mapWidth, mapHeight, scale, maxPixels = SUPERSAMPLE_PIXELS }) {
        const w = mapWidth * scale;
        const h = mapHeight * scale;
        if (!(w > 0 && h > 0)) return 1;
        const factor = Math.min(MAX_SUPERSAMPLE, Math.sqrt(maxPixels / (w * h)));
        // Below 1.25x the gain is not worth the extra render time.
        return factor >= 1.25 ? Math.floor(factor * 100) / 100 : 1;
    }

    // Splits a width × height area into pieces of at most `piece` units.
    function pieceGrid(width, height, piece) {
        const pieces = [];
        for (let y = 0; y < height; y += piece)
            for (let x = 0; x < width; x += piece)
                pieces.push({ x, y, w: Math.min(piece, width - x), h: Math.min(piece, height - y) });
        return pieces;
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

    function canvasToBlob(canvas) {
        return new Promise((resolve) => {
            try {
                canvas.toBlob(resolve, "image/png");
            } catch (error) {
                resolve(null);
            }
        });
    }

    // Renders the main map's area (`rect`, CSS px) with a hidden map, piece by
    // piece at `ratio` device px per CSS px, and draws each piece into `ctx` at
    // `target` (output px). The main map itself is not touched.
    async function drawMapPieces({ map, rect, target, ratio, maxPiecePixels, ctx, signal, onStep }) {
        const margin = Math.ceil(PIECE_MARGIN / ratio);
        const piece = Math.max(64, Math.floor(maxPiecePixels / ratio) - 2 * margin);
        const side = piece + 2 * margin;
        const pieces = pieceGrid(rect.w, rect.h, piece);
        const scale = target.w / rect.w;
        const centerOf = (p) => map.unproject([p.x + piece / 2, p.y + piece / 2]);

        const host = document.createElement("div");
        host.style.cssText = `position:fixed;left:${-(side + 100)}px;top:0;width:${side}px;height:${side}px;pointer-events:none;`;
        document.body.appendChild(host);
        let pieceMap = null;
        onStep("tiles", { requested: pieces.length });
        try {
            pieceMap = new map.constructor({
                container: host,
                style: map.getStyle(),
                center: centerOf(pieces[0]),
                zoom: map.getZoom(),
                bearing: map.getBearing(),
                minZoom: 0,
                maxZoom: 24,
                interactive: false,
                attributionControl: false,
                preserveDrawingBuffer: true,
                fadeDuration: 0,
                pixelRatio: ratio,
                maxCanvasSize: [Math.ceil(side * ratio) + 2, Math.ceil(side * ratio) + 2],
            });
            for (const p of pieces) {
                pieceMap.jumpTo({ center: centerOf(p) });
                await waitForIdle(pieceMap, signal, IDLE_TIMEOUT);
                throwIfAborted(signal);
                const canvas = pieceMap.getCanvas();
                const k = canvas.width / side; // device px per CSS px actually rendered
                ctx.drawImage(
                    canvas,
                    margin * k, margin * k, p.w * k, p.h * k,
                    target.x + p.x * scale, target.y + p.y * scale, p.w * scale, p.h * scale,
                );
                onStep("tiles", { loaded: 1 });
            }
        } finally {
            if (pieceMap) pieceMap.remove();
            host.remove();
        }
    }

    /**
     * @returns {Promise<{ blob: Blob }>}
     */
    async function render({ posterElement, map, size, bgColor, mapShapePath, maxCanvasSide = 4096, signal, onStep = () => {} }) {
        const body = document.body;
        let overlay = null;
        let output = null;

        body.classList.add("is-exporting");
        try {
            onStep("layout");
            if (document.fonts) await document.fonts.ready;
            throwIfAborted(signal);

            // The poster is laid out at its design size; the map area is rendered piece by piece.
            onStep("map");
            map.resize();
            const container = posterElement.querySelector(".map-shape-container");
            const rect = {
                x: container.offsetLeft,
                y: container.offsetTop,
                w: container.offsetWidth,
                h: container.offsetHeight,
            };
            const target = { x: rect.x * size.scale, y: rect.y * size.scale, w: rect.w * size.scale, h: rect.h * size.scale };

            output = document.createElement("canvas");
            output.width = size.width;
            output.height = size.height;
            const ctx = output.getContext("2d");
            if (!ctx) throw new Error("this browser cannot create the image.");
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, size.width, size.height);

            const ios = isIOS();
            const factor = supersample({
                mapWidth: rect.w,
                mapHeight: rect.h,
                scale: size.scale,
                maxPixels: ios ? IOS_MAX_PIXELS : SUPERSAMPLE_PIXELS,
            });
            ctx.save();
            if (mapShapePath) ctx.clip(shapeClipPath(mapShapePath, target));
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            await drawMapPieces({
                map,
                rect,
                target,
                ratio: size.scale * factor,
                maxPiecePixels: Math.min(ios ? 2048 : 4096, maxCanvasSide),
                ctx,
                signal,
                onStep,
            });
            ctx.restore();

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
            ctx.drawImage(overlay, 0, 0, size.width, size.height);
            overlay.width = overlay.height = 0;

            const blob = await canvasToBlob(output);
            if (!blob) throw new Error("the image is too large for this browser. Choose a smaller format or a lower resolution.");
            throwIfAborted(signal);
            return { blob: await AppUtils.setDpi(blob, size.dpi) };
        } finally {
            body.classList.remove("is-exporting");
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

    return { IOS_MAX_PIXELS, MAX_OUTPUT_PIXELS, isIOS, exportSize, supersample, pieceGrid, render, saveBlob };
});
