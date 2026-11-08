// ============================================================================
// UTILITIES — pure helpers (browser global `AppUtils`, CommonJS for tests)
// ============================================================================
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AppUtils = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
    "use strict";

    function formatCoords(lat, lng) {
        const latDirection = lat >= 0 ? "°N" : "°S";
        const lngDirection = lng >= 0 ? "°E" : "°W";
        return `${Math.abs(lat).toFixed(4)}${latDirection} ${Math.abs(lng).toFixed(4)}${lngDirection}`;
    }

    // Parses a decimal typed with a dot or a comma. Returns NaN when invalid.
    function parseDecimal(value) {
        if (typeof value === "number") return value;
        if (typeof value !== "string") return NaN;
        const cleaned = value.trim().replace(",", ".");
        if (!/^[-+]?\d*\.?\d+$/.test(cleaned)) return NaN;
        return parseFloat(cleaned);
    }

    // ------------------------------------------------------------------ Colors
    // Accepts "#rgb" / "#rrggbb", with or without "#", any case. Returns "#rrggbb" or null.
    function normalizeHex(input) {
        if (typeof input !== "string") return null;
        let v = input.trim().toLowerCase();
        if (!v) return null;
        if (v[0] !== "#") v = "#" + v;
        if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + v.slice(1).split("").map((c) => c + c).join("");
        return /^#[0-9a-f]{6}$/.test(v) ? v : null;
    }

    function hexToRgba(hex, alpha) {
        const h = normalizeHex(hex) || "#000000";
        const r = parseInt(h.slice(1, 3), 16);
        const g = parseInt(h.slice(3, 5), 16);
        const b = parseInt(h.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Gradient behind the poster text. 0–50 moves the fade start up; 50–100 makes it taller.
    // Uses the background colour at alpha 0 (not "transparent") so the fade does not turn grey.
    function computeGradientStyle(bgColor, fadeIntensity, solidBlockHeight, baseHeight = 2520) {
        const intensity = Math.min(100, Math.max(0, Number(fadeIntensity) || 0));
        let elementHeight;
        let gradientStart;
        if (intensity <= 50) {
            elementHeight = baseHeight;
            gradientStart = 100 - intensity * 2;
        } else {
            elementHeight = baseHeight + ((intensity - 50) / 50) * baseHeight;
            gradientStart = 0;
        }
        const fadeEnd = Math.max(gradientStart, 100 - (Number(solidBlockHeight) || 0));
        const bgTransparent = hexToRgba(bgColor, 0);
        const bgSolid = hexToRgba(bgColor, 1);
        return {
            height: `${elementHeight}px`,
            background: `linear-gradient(to bottom, ${bgTransparent} ${gradientStart}%, ${bgSolid} ${fadeEnd}%, ${bgSolid} 100%)`,
        };
    }

    // Shrinks a line of text to fit `maxWidth`: tightens letter-spacing first (down to 40 %),
    // then scales size and spacing together (down to `minRatio`).
    // glyphWidth: width of the glyphs alone at `size`; gaps: number of letter-spacing gaps.
    function fitText({ glyphWidth, gaps, size, spacing, maxWidth, minRatio = 0.4 }) {
        const width = glyphWidth + spacing * gaps;
        if (width <= maxWidth) return { size, spacing, ratio: 1 };
        const minSpacing = spacing > 0 ? spacing * 0.4 : spacing;
        if (gaps > 0 && spacing > 0) {
            const needed = (maxWidth - glyphWidth) / gaps;
            if (needed >= minSpacing) return { size, spacing: needed, ratio: 1 };
        }
        const tight = glyphWidth + minSpacing * gaps;
        const ratio = Math.max(minRatio, Math.min(1, maxWidth / tight));
        return { size: size * ratio, spacing: minSpacing * ratio, ratio };
    }

    // ------------------------------------------------------------------ PNG DPI
    let crcTable = null;
    function crc32(buf, off, len) {
        if (!crcTable) {
            crcTable = new Uint32Array(256);
            for (let n = 0; n < 256; n++) {
                let c = n;
                for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
                crcTable[n] = c >>> 0;
            }
        }
        let c = 0xffffffff;
        for (let i = 0; i < len; i++) c = crcTable[(c ^ buf[off + i]) & 0xff] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    }

    const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

    // Returns a copy of the PNG bytes with a pHYs chunk set to `dpi`.
    // Replaces an existing pHYs chunk, otherwise inserts one right after IHDR.
    function setPngDpi(bytes, dpi) {
        const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        for (let i = 0; i < 8; i++) {
            if (data[i] !== PNG_SIGNATURE[i]) throw new Error("Not a PNG file");
        }
        const ppm = Math.round(dpi / 0.0254); // pixels per metre
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        let offset = 8;
        while (offset + 12 <= data.length) {
            const length = view.getUint32(offset);
            const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
            if (type === "pHYs" && length === 9) {
                const out = data.slice();
                const outView = new DataView(out.buffer);
                outView.setUint32(offset + 8, ppm);
                outView.setUint32(offset + 12, ppm);
                out[offset + 16] = 1;
                outView.setUint32(offset + 17, crc32(out, offset + 4, 13));
                return out;
            }
            if (type === "IDAT" || type === "IEND") break;
            offset += 12 + length;
        }

        const chunk = new Uint8Array(21);
        const chunkView = new DataView(chunk.buffer);
        chunkView.setUint32(0, 9);
        chunk.set([112, 72, 89, 115], 4); // "pHYs"
        chunkView.setUint32(8, ppm);
        chunkView.setUint32(12, ppm);
        chunk[16] = 1; // unit: metre
        chunkView.setUint32(17, crc32(chunk, 4, 13));

        const ihdrEnd = 8 + 12 + view.getUint32(8);
        const out = new Uint8Array(data.length + chunk.length);
        out.set(data.subarray(0, ihdrEnd), 0);
        out.set(chunk, ihdrEnd);
        out.set(data.subarray(ihdrEnd), ihdrEnd + chunk.length);
        return out;
    }

    async function setDpi(blob, dpi = 300) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        return new Blob([setPngDpi(bytes, dpi)], { type: "image/png" });
    }

    // ------------------------------------------------------------------ Files
    function sanitizeFilename(value, fallback = "Map") {
        const cleaned = String(value || "")
            .normalize("NFC")
            .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
            .replace(/\s+/g, "_")
            .replace(/^[-_.]+|[-_.]+$/g, "");
        return cleaned || fallback;
    }

    function formatBytes(bytes) {
        const units = ["B", "KB", "MB", "GB"];
        let value = bytes;
        let unit = 0;
        while (value >= 1024 && unit < units.length - 1) {
            value /= 1024;
            unit++;
        }
        return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
    }

    return {
        formatCoords,
        parseDecimal,
        normalizeHex,
        hexToRgba,
        computeGradientStyle,
        fitText,
        crc32,
        setPngDpi,
        setDpi,
        sanitizeFilename,
        formatBytes,
    };
});
