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
    const coords = ref('');
    
    // Search
    const searchQuery = ref('');
    const searchError = ref('');
    const isSearching = ref(false);
    
    // Map Customization (Vector)
    const roadWidthScale = ref(1); 
    const mapStyle = ref('positron');
    const showBuildings = ref(false);
    const buildingColor = ref('#dcdcdc');
    
    // Custom Colors
    const customWaterColor = ref(null);
    const customRoadColor = ref(null);
    const customParkColor = ref(null);
    const customLandColor = ref(null);
    
    // Poster customization
    const posterStyle = ref('classic');
    const borderStyle = ref('classic'); // Decoupled border style
    
    const orientation = ref('portrait');
    const showCoords = ref(true);
    
    // Overlay / Fade
    const showOverlay = ref(true);
    const overlayIntensity = ref(40); // % height
    
    const borderColor = ref('#000000');
    const textColor = ref('#000000');
    const bgColor = ref('#ffffff');
    
    // Labels
    const city = ref('Paris');
    const country = ref('France');
    
    // Fonts
    const cityFont = ref('Montserrat, sans-serif');
    const countryFont = ref('Montserrat, sans-serif');
    const coordsFont = ref('Inter, sans-serif');

    const fontOptions = [
      { name: 'Inter', value: 'Inter, sans-serif' },
      { name: 'Montserrat', value: 'Montserrat, sans-serif' },
      { name: 'Space Mono', value: 'Space Mono, monospace' },
      { name: 'Playfair Display', value: 'Playfair Display, serif' },
      { name: 'Lora', value: 'Lora, serif' },
      { name: 'Oswald', value: 'Oswald, sans-serif' },
      { name: 'Raleway', value: 'Raleway, sans-serif' }
    ];
    
    // Border Style Options
    const borderOptions = [
        { name: 'Classic (Simple)', value: 'classic' },
        { name: 'Vintage (Double)', value: 'vintage' },
        { name: 'Blueprint (Technical)', value: 'blueprint' },
        { name: 'Midnight (Neon)', value: 'midnight' },
        { name: 'Swiss (Bold)', value: 'swiss' },
        { name: 'Botanical (Frame)', value: 'botanical' }
    ];
    
    // UI State
    const isLoading = ref(false);
    const isSidebarOpen = ref(false);
    const theme = ref(localStorage.getItem('theme') || 'light');
    
    // -------------------------------------------------------------------------
    // Computed
    // -------------------------------------------------------------------------
    
    const displayCity = computed(() => city.value || 'City');
    const displayCountry = computed(() => country.value || '');
    const displayCoords = computed(() => coords.value);

    // -------------------------------------------------------------------------
    // Methods
    // -------------------------------------------------------------------------
    
    function toggleTheme() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', theme.value);
      localStorage.setItem('theme', theme.value);
    }
    
    function initMap() {
      if (mapInstance.value) return;
      
      const mapElement = document.getElementById('map');
      if (!mapElement) return;
      
      try {
        // OpenFreeMap Positron Style (Free, No Token)
        const styleUrl = 'https://tiles.openfreemap.org/styles/positron';
        
        mapInstance.value = new maplibregl.Map({
          container: 'map',
          style: styleUrl,
          center: [lng.value, lat.value],
          zoom: zoom.value,
          attributionControl: false,
          preserveDrawingBuffer: true,
          maxPitch: 0,
          dragRotate: false
        });
        
        mapInstance.value.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
        
        mapInstance.value.on('load', () => {
          updateMapStyle();
        });

        // Add Click listener to close sidebar on mobile when clicking map
        mapInstance.value.on('click', () => {
             if (window.innerWidth <= 768 && isSidebarOpen.value) {
                 isSidebarOpen.value = false;
             }
        });

        mapInstance.value.on('moveend', () => {
            const center = mapInstance.value.getCenter();
            lat.value = center.lat;
            lng.value = center.lng;
            zoom.value = mapInstance.value.getZoom();
            coords.value = AppUtils.formatCoords(center.lat, center.lng);
        });

        // Initialize coords
        coords.value = AppUtils.formatCoords(lat.value, lng.value);
        
      } catch (error) {
        console.error('Map initialization error:', error);
        AppUtils.showToast('Failed to initialize map', 'error');
      }
    }
    
    function updateMapStyle() {
      if (!mapInstance.value || !mapInstance.value.isStyleLoaded()) return;
      
      MapStyles.apply(mapInstance.value, posterStyle.value, {
        showBuildings: showBuildings.value,
        buildingColor: buildingColor.value,
        roadWidthScale: roadWidthScale.value,
        waterColor: customWaterColor.value,
        roadColor: customRoadColor.value,
        parkColor: customParkColor.value,
        backgroundColor: customLandColor.value
      });
    }
    

    function updateMapPosition() {
      if (!mapInstance.value) return;
      
      let safeLat = parseFloat(lat.value);
      let safeLng = parseFloat(lng.value);
      let safeZoom = parseFloat(zoom.value);
      
      // Handle comma decimals if string
      if (typeof lat.value === 'string') safeLat = parseFloat(lat.value.replace(',', '.'));
      if (typeof lng.value === 'string') safeLng = parseFloat(lng.value.replace(',', '.'));

      if (isNaN(safeLat) || isNaN(safeLng) || isNaN(safeZoom)) return;

      mapInstance.value.jumpTo({
          center: [safeLng, safeLat],
          zoom: safeZoom
      });
    }
    
    const searchLocation = AppUtils.debounce(async () => {
      if (!searchQuery.value.trim()) return;
      
      isSearching.value = true;
      searchError.value = '';
      
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = data[0];
          lat.value = parseFloat(result.lat);
          lng.value = parseFloat(result.lon);
          
          updateMapPosition();
          
          // Update labels if possible (rough guess)
          const parts = result.display_name.split(', ');
          if (parts.length > 0) city.value = parts[0];
          if (parts.length > 1) country.value = parts[parts.length - 1];
          
          // Close sidebar on mobile
          if (window.innerWidth <= 768) isSidebarOpen.value = false;
          
        } else {
          searchError.value = 'Location not found';
        }
      } catch (error) {
        console.error('Search error:', error);
        searchError.value = 'Error searching location';
      } finally {
        isSearching.value = false;
      }
    }, 500);
    
    function setPosterStyle(style) {
      posterStyle.value = style;
      
      // Set default border style to match theme, but can be changed later
      borderStyle.value = style;
      
      // Update Poster Colors & Fonts
      if (style === 'classic') {
          borderColor.value = '#000000';
          textColor.value = '#000000';
          bgColor.value = '#ffffff';
          cityFont.value = 'Montserrat, sans-serif';
          countryFont.value = 'Montserrat, sans-serif';
          coordsFont.value = 'Inter, sans-serif';
          
          showBuildings.value = false;
          buildingColor.value = '#dcdcdc';
          
          overlayIntensity.value = 50;

      } else if (style === 'blueprint') {
          borderColor.value = '#294380';
          textColor.value = '#294380';
          bgColor.value = '#ffffff';
          cityFont.value = 'Space Mono, monospace';
          countryFont.value = 'Space Mono, monospace';
          coordsFont.value = 'Space Mono, monospace';
          
          showBuildings.value = false; // Hide by default
          buildingColor.value = '#e6eaf0';
          
          overlayIntensity.value = 30;

      } else if (style === 'vintage') {
          borderColor.value = '#8b7355';
          textColor.value = '#5c4a3a';
          bgColor.value = '#e0d8c8';
          cityFont.value = 'Montserrat, sans-serif';
          countryFont.value = 'Montserrat, sans-serif';
          coordsFont.value = 'Inter, sans-serif'; 
          
          showBuildings.value = false;
          buildingColor.value = '#d4c5b0';
          
          overlayIntensity.value = 60;
      
      } else if (style === 'midnight') {
          borderColor.value = '#00f3ff';
          textColor.value = '#00f3ff';
          bgColor.value = '#0a0a0f';
          cityFont.value = 'Space Mono, monospace';
          countryFont.value = 'Space Mono, monospace';
          coordsFont.value = 'Space Mono, monospace';

          // Midnight Specific: Show buildings in "night light"
          showBuildings.value = true;
          buildingColor.value = '#fdf6e3'; // Warm light color
          
          overlayIntensity.value = 40;

      } else if (style === 'swiss') {
          borderColor.value = '#000000';
          textColor.value = '#000000';
          bgColor.value = '#ffffff';
          cityFont.value = 'Inter, sans-serif';
          countryFont.value = 'Inter, sans-serif';
          coordsFont.value = 'Inter, sans-serif';
          
          showBuildings.value = false;
          buildingColor.value = '#dcdcdc';
          
          overlayIntensity.value = 0; // Usually no fade

      } else if (style === 'botanical') {
          borderColor.value = '#3a5a40';
          textColor.value = '#3a5a40';
          bgColor.value = '#f1f3f0';
          cityFont.value = 'Playfair Display, serif';
          countryFont.value = 'Lora, serif';
          coordsFont.value = 'Raleway, sans-serif';
          
          showBuildings.value = false;
          buildingColor.value = '#ddbea9';
          
          overlayIntensity.value = 40;
      }

      // Sync Map Customization Colors
      resetMapColors();
    }

    function resetMapColors() {
        const style = posterStyle.value;
        const colors = MapStyles.colors[style];
        
        if (!colors) return;

        // Map colors based on style definitions in map-styles.js
        if (style === 'classic') {
            customWaterColor.value = colors.water || '#ffffff';
            customLandColor.value = colors.background || '#eeeeee';
            customRoadColor.value = colors.roadMajor || '#000000';
            customParkColor.value = colors.park || '#e5e5e5';
        } 
        else if (style === 'vintage') {
            customWaterColor.value = colors.water;
            customLandColor.value = colors.background;
            customRoadColor.value = colors.roads;
            customParkColor.value = colors.parks;
        }
        else if (style === 'blueprint') {
            customWaterColor.value = colors.water;
            customLandColor.value = colors.background;
            customRoadColor.value = colors.roads;
            // Parks are typically hidden/same as background but let's default to white/bg if undefined
            customParkColor.value = colors.background || '#ffffff'; // or colors.park if we add it
        }
        else if (style === 'midnight') {
            customWaterColor.value = colors.water;
            customLandColor.value = colors.background;
            customRoadColor.value = colors.roads;
            customParkColor.value = '#1f2b3e'; // Hardcoded in map-styles.js, surfacing here
        }
        else if (style === 'swiss') {
             customWaterColor.value = colors.water;
             customLandColor.value = colors.background;
             customRoadColor.value = colors.roads;
             customParkColor.value = '#f0f0f0'; // Hardcoded default
        }
        else if (style === 'botanical') {
            customWaterColor.value = colors.water;
            customLandColor.value = colors.background;
            customRoadColor.value = colors.roads;
            customParkColor.value = colors.parks; // Assuming added to colors object
        }
        
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
      const posterElement = document.getElementById('poster-render');
      if (!posterElement) {
        isLoading.value = false;
        return;
      }
      
      // Store original styles to restore later
      const originalScale = posterElement.style.getPropertyValue('--poster-scale');
      const originalTransition = posterElement.style.transition;
      
      try {
        // Create fullscreen loading overlay to hide the scaling
        const overlay = document.createElement('div');
        overlay.id = 'download-overlay';
        overlay.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
            <div style="width: 48px; height: 48px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <span style="color: white; font-size: 1.1rem;">Generating high-resolution poster...</span>
          </div>
        `;
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.9); z-index: 9999;
          display: flex; align-items: center; justify-content: center;
        `;
        document.body.appendChild(overlay);
        
        // Add spinner animation
        const style = document.createElement('style');
        style.id = 'download-overlay-style';
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
        
        // 1. Temporarily upscale poster to FULL native resolution for A2 Print
        // Native width is 5000px (~42cm @ 300DPI) -> Perfect for A2
        posterElement.style.transition = 'none';
        posterElement.style.setProperty('--poster-scale', '1');
        
        // Move poster off-screen but keep in DOM for capture
        const originalPosition = posterElement.style.position;
        const originalLeft = posterElement.style.left;
        posterElement.style.position = 'absolute';
        posterElement.style.left = '-99999px';
        
        // MOBILE FIX: Temporarily remove overflow restrictions to prevent clipping
        const mainContent = document.querySelector('.main-content');
        const posterContainer = document.querySelector('.poster-container');
        const originalMainOverflow = mainContent?.style.overflow;
        const originalContainerStyles = {
            overflow: posterContainer?.style.overflow,
            position: posterContainer?.style.position,
            width: posterContainer?.style.width,
            height: posterContainer?.style.height
        };
        
        if (mainContent) mainContent.style.overflow = 'visible';
        if (posterContainer) {
            posterContainer.style.overflow = 'visible';
            posterContainer.style.position = 'static';
            posterContainer.style.width = 'auto';
            posterContainer.style.height = 'auto';
        }
        
        // HACK: Disable box-shadows during export for 'midnight' style
        // html2canvas struggles with large shadows on huge canvases (renders solid blocks)
        const isMidnight = posterStyle.value === 'midnight';
        const borders = posterElement.querySelectorAll('.border-line-outer');
        if (isMidnight) {
             borders.forEach(el => el.style.boxShadow = 'none');
        }
        
        // 2. Force Map Resize & Redraw to load high-res tiles
        if (mapInstance.value) {
            mapInstance.value.resize();
            // Wait for tiles to fetch (increased delay for huge map)
            await new Promise(r => setTimeout(r, 2000)); 
            mapInstance.value.triggerRepaint();
        }

        // Temporarily apply crisp rendering to avoid anti-aliasing blur
        posterElement.style.imageRendering = 'crisp-edges';
        posterElement.style.webkitFontSmoothing = 'none';
        
        // 3. Capture with html2canvas
        const canvas = await html2canvas(posterElement, {
          scale: 1, 
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          width: posterElement.scrollWidth,
          height: posterElement.scrollHeight,
          windowWidth: posterElement.scrollWidth,
          windowHeight: posterElement.scrollHeight,
          ignoreElements: (element) => {
              if (element.classList.contains('map-drag-hint')) return true;
              return false;
          }
        });
        
        // Disable canvas smoothing for sharper export
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        
        // Restore rendering style
        posterElement.style.imageRendering = '';
        posterElement.style.webkitFontSmoothing = '';
        
        // Restore overflow styles immediately after capture
        if (mainContent) mainContent.style.overflow = originalMainOverflow || '';
        if (posterContainer) {
            posterContainer.style.overflow = originalContainerStyles.overflow || '';
            posterContainer.style.position = originalContainerStyles.position || '';
            posterContainer.style.width = originalContainerStyles.width || '';
            posterContainer.style.height = originalContainerStyles.height || '';
        }
        
        // 4. Convert to Blob and Inject DPI Metadata
        canvas.toBlob(async (blob) => {
            if (!blob) {
                 AppUtils.showToast('Failed to create image blob', 'error');
                 return;
            }
            
            // Inject 300 DPI (pHYs chunk)
            const highResBlob = await AppUtils.setDpi(blob, 300);
            
            const link = document.createElement('a');
            link.download = `MapPoster_${city.value || 'Map'}_${posterStyle.value}.png`;
            link.href = URL.createObjectURL(highResBlob);
            link.click();
            
            // Cleanup
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
            
            AppUtils.showToast('Poster downloaded successfully! (300 DPI)', 'success');
            
            // Restore state
            posterElement.style.setProperty('--poster-scale', originalScale);
            posterElement.style.transition = originalTransition;
            posterElement.style.position = originalPosition || '';
            posterElement.style.left = originalLeft || '';
            if (isMidnight) {
                 borders.forEach(el => el.style.boxShadow = '');
            }
            if (mapInstance.value) mapInstance.value.resize();
            isLoading.value = false;
            
            // Remove overlay
            document.getElementById('download-overlay')?.remove();
            document.getElementById('download-overlay-style')?.remove();
            
        }, 'image/png');
        
      } catch (error) {
        console.error('Export error:', error);
        AppUtils.showToast('Failed to generate poster', 'error');
        // Restore state in case of error
        posterElement.style.setProperty('--poster-scale', originalScale);
        posterElement.style.transition = originalTransition;
        posterElement.style.position = originalPosition || '';
        posterElement.style.left = originalLeft || '';
        if (mapInstance.value) mapInstance.value.resize();
        isLoading.value = false;
        // Remove overlay on error too
        document.getElementById('download-overlay')?.remove();
        document.getElementById('download-overlay-style')?.remove();
      }
    }
    
    // Apply colors watcher
    function applyColors() {
        document.documentElement.style.setProperty('--poster-border', borderColor.value);
        document.documentElement.style.setProperty('--poster-text', textColor.value);
        document.documentElement.style.setProperty('--poster-bg', bgColor.value);
        
        // Overlay Controls
        document.documentElement.style.setProperty('--overlay-opacity', showOverlay.value ? '1' : '0');
        document.documentElement.style.setProperty('--overlay-height', `${overlayIntensity.value}%`);
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------
    
    onMounted(() => {
      // Set initial theme
      document.documentElement.setAttribute('data-theme', theme.value);
      
      // Initialize map
      initMap();
      
      // Initialize colors
      applyColors();
      
      // Initialize Map Defaults
      resetMapColors();
    });
    
    // -------------------------------------------------------------------------
    // Watchers
    // -------------------------------------------------------------------------
    
    watch([lat, lng], () => {
        coords.value = AppUtils.formatCoords(lat.value, lng.value);
    });
    
    watch(zoom, updateMapPosition);
    watch([
      borderColor, textColor, bgColor, 
      showOverlay, overlayIntensity
    ], applyColors);
    
    watch([
        showBuildings, 
        buildingColor,
        roadWidthScale,
        customWaterColor,
        customRoadColor,
        customParkColor,
        customLandColor
    ], updateMapStyle);

    return {
      // State
      lat, lng, zoom,
      searchQuery, searchError, isSearching,
      posterStyle, orientation, showCoords,
      borderColor, textColor, bgColor,
      city, country,
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
      borderStyle, borderOptions,
      showOverlay, overlayIntensity,
      
      // Fonts
      cityFont, countryFont, coordsFont, fontOptions,
      
      // Methods
      toggleTheme,
      updateMapPosition,
      searchLocation,
      setPosterStyle,
      setOrientation,
      toggleSidebar,
      downloadPoster,
      resetMapColors
    };
  }
}).mount('#app');
