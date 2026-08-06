// ============================================================================
// POSTER EXPORT LOGIC
// ============================================================================

window.PosterExport = {
    createOverlay() {
        const overlay = document.createElement("div");
        overlay.id = "download-overlay";
        overlay.innerHTML = `
          <div class="download-overlay-content">
            <div class="download-overlay-line"></div>
            <span class="download-overlay-text">Exporting poster</span>
            <div class="download-overlay-line"></div>
          </div>
        `;
        document.body.appendChild(overlay);
    },

    removeOverlay() {
        const overlay = document.getElementById("download-overlay");
        if (overlay) {
            overlay.style.opacity = "0";
            setTimeout(() => overlay.remove(), 400);
        }
    },

    async execute({
        posterElement,
        posterStyle,
        bgColor,
        fadeIntensity,
        solidBlockHeight,
        showFade,
        mapInstance,
        city,
        onDone,
    }) {
        const posterTextEl = posterElement.querySelector(".poster-text");
        const mainContent = document.querySelector(".main-content");
        const posterContainer = document.querySelector(".poster-container");
        const glowBorders =
            posterStyle === "midnight"
                ? [...posterElement.querySelectorAll(".border-line-outer")]
                : [];

        // Snapshot every inline style we are about to mutate so we can always roll back.
        const snapshots = [
            posterElement,
            posterTextEl,
            mainContent,
            posterContainer,
            ...glowBorders,
        ]
            .filter(Boolean)
            .map((el) => [el, el.getAttribute("style")]);

        const restoreState = () => {
            snapshots.forEach(([el, style]) => {
                if (style === null) el.removeAttribute("style");
                else el.setAttribute("style", style);
            });
            if (mapInstance) mapInstance.resize();
            this.removeOverlay();
            onDone();
        };

        try {
            this.createOverlay();

            // 1. Temporarily upscale poster to FULL native resolution
            posterElement.style.transition = "none";
            posterElement.style.setProperty("--poster-scale", "1");
            posterElement.style.position = "absolute";
            posterElement.style.left = "-99999px";

            // MOBILE FIX: overflow restrictions would clip the upscaled poster
            if (mainContent) mainContent.style.overflow = "visible";
            if (posterContainer) {
                posterContainer.style.overflow = "visible";
                posterContainer.style.position = "static";
                posterContainer.style.width = "auto";
                posterContainer.style.height = "auto";
            }

            glowBorders.forEach((el) => (el.style.boxShadow = "none"));

            // Apply gradient as inline style for html2canvas compatibility
            if (posterTextEl && showFade) {
                const grad = AppUtils.computeGradientStyle(
                    bgColor,
                    fadeIntensity,
                    solidBlockHeight,
                );
                posterTextEl.style.setProperty(
                    "height",
                    grad.height,
                    "important",
                );
                posterTextEl.style.setProperty(
                    "background",
                    grad.background,
                    "important",
                );
            } else if (posterTextEl) {
                posterTextEl.style.setProperty(
                    "background",
                    "transparent",
                    "important",
                );
                posterTextEl.style.setProperty(
                    "height",
                    `${PosterConfig.textBlockHeights.default}px`,
                    "important",
                );
            }

            // 2. Force Map Redraw
            if (mapInstance) {
                mapInstance.resize();
                await new Promise((r) => setTimeout(r, 1500));
                mapInstance.triggerRepaint();
                await new Promise((r) => setTimeout(r, 2500));
            }

            // 3. Capture with html2canvas
            const canvas = await html2canvas(posterElement, {
                scale: 1,
                useCORS: true,
                allowTaint: true,
                backgroundColor: bgColor,
                logging: false,
                width: posterElement.scrollWidth,
                height: posterElement.scrollHeight,
                windowWidth: posterElement.scrollWidth,
                windowHeight: posterElement.scrollHeight,
                ignoreElements: (element) =>
                    element.classList.contains("map-drag-hint") ||
                    element.classList.contains("maplibregl-ctrl-group") ||
                    element.classList.contains("maplibregl-ctrl"),
            });

            // 4. Convert to Blob and Inject DPI Metadata
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    AppUtils.showToast("Failed to create image blob", "error");
                    restoreState();
                    return;
                }

                const highResBlob = await AppUtils.setDpi(blob, 300);

                const link = document.createElement("a");
                link.download = `MapPoster_${city || "Map"}_${posterStyle}.png`;
                link.href = URL.createObjectURL(highResBlob);
                link.click();
                setTimeout(() => URL.revokeObjectURL(link.href), 100);

                AppUtils.showToast(
                    "Poster downloaded successfully! (300 DPI, A1 print-ready)",
                    "success",
                );
                restoreState();
            }, "image/png");
        } catch (error) {
            console.error("Export error:", error);
            AppUtils.showToast("Failed to generate poster", "error");
            restoreState();
        }
    },
};
