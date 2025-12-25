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
      MapStyles.apply(mapInstance.value, posterStyle.value);
    }
    
    function updateMapPosition() {
      if (!mapInstance.value) return;
      mapInstance.value.jumpTo({
          center: [lng.value, lat.value],
          zoom: zoom.value
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
      } else if (style === 'blueprint') {
          borderColor.value = '#294380';
          textColor.value = '#294380';
          bgColor.value = '#ffffff';
      } else if (style === 'vintage') {
          borderColor.value = '#8b7355';
          textColor.value = '#5c4a3a';
          bgColor.value = '#e0d8c8';
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
      
      // Force map redraw to ensure full resolution
      if (mapInstance.value) {
          mapInstance.value.triggerRepaint();
          await new Promise(r => setTimeout(r, 1000));
      }

      const posterElement = document.getElementById('poster-render');
      if (!posterElement) {
        isLoading.value = false;
        return;
      }
      
      try {
        const canvas = await html2canvas(posterElement, {
          scale: 4, // High Resolution export
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
          ignoreElements: (element) => {
              if (element.classList.contains('map-drag-hint')) return true;
              return false;
          }
        });
        
        const link = document.createElement('a');
        link.download = `MapPoster_${city.value || 'Map'}_${posterStyle.value}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        AppUtils.showToast('Poster downloaded successfully!', 'success');
        
      } catch (error) {
        console.error('Export error:', error);
        AppUtils.showToast('Failed to generate poster', 'error');
      } finally {
        isLoading.value = false;
      }
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
