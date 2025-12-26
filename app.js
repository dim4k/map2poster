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
    // const showLabels = ref(false); // Removed
    const roadWidthScale = ref(1); 
    const mapStyle = ref('positron');
    const showBuildings = ref(false);
    const buildingColor = ref('#dcdcdc');
    
    // Poster customization
    const posterStyle = ref('classic');
    const orientation = ref('portrait');
    const showCoords = ref(true);
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
        buildingColor: buildingColor.value
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
      
      if (style === 'classic') {
          borderColor.value = '#000000';
          textColor.value = '#000000';
          bgColor.value = '#ffffff';
          // Fonts (Original Defaults)
          cityFont.value = 'Montserrat, sans-serif';
          countryFont.value = 'Montserrat, sans-serif';
          coordsFont.value = 'Inter, sans-serif';

      } else if (style === 'blueprint') {
          borderColor.value = '#294380';
          textColor.value = '#294380';
          bgColor.value = '#ffffff';
           // Fonts
          cityFont.value = 'Space Mono, monospace';
          countryFont.value = 'Space Mono, monospace';
          coordsFont.value = 'Space Mono, monospace';

      } else if (style === 'vintage') {
          borderColor.value = '#8b7355';
          textColor.value = '#5c4a3a';
          bgColor.value = '#e0d8c8';
           // Fonts (Original Defaults)
          cityFont.value = 'Montserrat, sans-serif';
          countryFont.value = 'Montserrat, sans-serif';
          coordsFont.value = 'Inter, sans-serif'; 
      
      } else if (style === 'midnight') {
          borderColor.value = '#00f3ff';
          textColor.value = '#00f3ff';
          bgColor.value = '#0a0a0f';
          
          cityFont.value = 'Space Mono, monospace';
          countryFont.value = 'Space Mono, monospace';
          coordsFont.value = 'Space Mono, monospace';

      } else if (style === 'swiss') {
          borderColor.value = '#000000';
          textColor.value = '#000000';
          bgColor.value = '#ffffff';
          
          cityFont.value = 'Inter, sans-serif';
          countryFont.value = 'Inter, sans-serif';
          coordsFont.value = 'Inter, sans-serif';

      } else if (style === 'botanical') {
          borderColor.value = '#3a5a40';
          textColor.value = '#3a5a40';
          bgColor.value = '#f1f3f0';
          
          cityFont.value = 'Playfair Display, serif';
          countryFont.value = 'Lora, serif';
          coordsFont.value = 'Raleway, sans-serif';
      }

      updateMapStyle(); 
    }
    
    function setOrientation(newOrientation) {
      orientation.value = newOrientation;
      setTimeout(() => {
         if (mapInstance.value) mapInstance.value.resize();
      }, 100);
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
        // 1. Temporarily upscale poster to FULL native resolution for A2 Print
        // Native width is 5000px (~42cm @ 300DPI) -> Perfect for A2
        posterElement.style.transition = 'none';
        posterElement.style.setProperty('--poster-scale', '1');
        
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

        // 3. Capture with html2canvas (scale 1 of the upscaled element)
        const canvas = await html2canvas(posterElement, {
          scale: 1, 
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          ignoreElements: (element) => {
              if (element.classList.contains('map-drag-hint')) return true;
              return false;
          }
        });
        
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
            if (isMidnight) {
                 borders.forEach(el => el.style.boxShadow = '');
            }
            if (mapInstance.value) mapInstance.value.resize();
            isLoading.value = false;
            
        }, 'image/png');
        
        // Return here properly handling the async flow
        // The finally block in the original function executes immediately after await html2canvas
        // But toBlob is callback based. So we need to handle "finally" logic carefully or just rely on the callback
        // To keep it clean, I'll remove the original finally block execution for the restore part and move it into the callback
        // BUT, if error occurs in try/catch, we need restoration.
        
      } catch (error) {
        console.error('Export error:', error);
        AppUtils.showToast('Failed to generate poster', 'error');
        // Restore state in case of error
        posterElement.style.setProperty('--poster-scale', originalScale);
        posterElement.style.transition = originalTransition;
        if (mapInstance.value) mapInstance.value.resize();
        isLoading.value = false;
      }
      // Note: "finally" block removed/handled manually because of callback flow overlap
    }
    
    // Apply colors watcher
    function applyColors() {
        document.documentElement.style.setProperty('--poster-border', borderColor.value);
        document.documentElement.style.setProperty('--poster-text', textColor.value);
        document.documentElement.style.setProperty('--poster-bg', bgColor.value);
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
    });
    
    // -------------------------------------------------------------------------
    // Watchers
    // -------------------------------------------------------------------------
    
    watch([lat, lng], () => {
        coords.value = AppUtils.formatCoords(lat.value, lng.value);
    });
    
    watch(zoom, updateMapPosition);
    watch([borderColor, textColor, bgColor], applyColors);
    watch([showBuildings, buildingColor], updateMapStyle);

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
      // displayCountry, // Duplicate removed
      displayCoords,
      roadWidthScale,
      showBuildings,
      buildingColor,
      
      // Fonts
      cityFont, countryFont, coordsFont, fontOptions,
      
      // Methods
      toggleTheme,
      updateMapPosition,
      searchLocation,
      setPosterStyle,
      setOrientation,
      toggleSidebar,
      downloadPoster
    };
  }
}).mount('#app');
