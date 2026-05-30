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
        const originalScale =
            posterElement.style.getPropertyValue("--poster-scale");
        const originalTransition = posterElement.style.transition;
        const originalPosition = posterElement.style.position;
        const originalLeft = posterElement.style.left;
        const posterTextEl = posterElement.querySelector(".poster-text");
        const originalPosterTextStyle =
            posterTextEl?.getAttribute("style") || "";
        const isMidnight = posterStyle === "midnight";
        const borders = posterElement.querySelectorAll(".border-line-outer");

        const restoreState = () => {
            posterElement.style.setProperty("--poster-scale", originalScale);
            posterElement.style.transition = originalTransition;
            posterElement.style.position = originalPosition || "";
            posterElement.style.left = originalLeft || "";
            if (isMidnight) {
                borders.forEach((el) => (el.style.boxShadow = ""));
            }
            if (posterTextEl) {
                posterTextEl.setAttribute("style", originalPosterTextStyle);
            }
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

            // MOBILE FIX: Temporarily remove overflow restrictions
            const mainContent = document.querySelector(".main-content");
            const posterContainer = document.querySelector(".poster-container");
            const originalMainOverflow = mainContent?.style.overflow;
            const originalContainerStyles = {
                overflow: posterContainer?.style.overflow,
                position: posterContainer?.style.position,
                width: posterContainer?.style.width,
                height: posterContainer?.style.height,
            };

            if (mainContent) mainContent.style.overflow = "visible";
            if (posterContainer) {
                posterContainer.style.overflow = "visible";
                posterContainer.style.position = "static";
                posterContainer.style.width = "auto";
                posterContainer.style.height = "auto";
            }

            // Disable box-shadows during export for 'midnight' style
            if (isMidnight) {
                borders.forEach((el) => (el.style.boxShadow = "none"));
            }

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
                posterTextEl.style.setProperty("height", "2520px", "important");
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
                ignoreElements: (element) => {
                    if (element.classList.contains("map-drag-hint"))
                        return true;
                    if (element.classList.contains("maplibregl-ctrl-group"))
                        return true;
                    if (element.classList.contains("maplibregl-ctrl"))
                        return true;
                    return false;
                },
            });

            // Restore overflow styles immediately after capture
            if (mainContent)
                mainContent.style.overflow = originalMainOverflow || "";
            if (posterContainer) {
                posterContainer.style.overflow =
                    originalContainerStyles.overflow || "";
                posterContainer.style.position =
                    originalContainerStyles.position || "";
                posterContainer.style.width =
                    originalContainerStyles.width || "";
                posterContainer.style.height =
                    originalContainerStyles.height || "";
            }

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
