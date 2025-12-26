// ============================================================================
// UTILITIES
// ============================================================================

window.AppUtils = {
    debounce(fn, delay) {
        let timeoutId = null;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    formatCoords(lat, lng) {
        const latDirection = lat >= 0 ? '°N' : '°S';
        const lngDirection = lng >= 0 ? '°E' : '°W';
        return `${Math.abs(lat).toFixed(4)}${latDirection} ${Math.abs(lng).toFixed(4)}${lngDirection}`;
    },

    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Inject pHYs chunk for 300 DPI into PNG Blob
    async setDpi(blob, dpi = 300) {
        const arrayBuffer = await blob.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        
        // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
        // IHDR chunk comes first. We need to insert pHYs after IHDR.
        
        // Calculate PPU (Pixels Per Unit) for 300 DPI
        // 1 inch = 0.0254 meters
        // 300 pixels / 0.0254 meters = ~11811 pixels/meter
        const ppu = Math.round(dpi / 0.0254);
        
        // pHYs chunk structure:
        // Length (4 bytes), Type (4 bytes: pHYs), PPU X (4 bytes), PPU Y (4 bytes), Unit (1 byte: 1 for meters), CRC (4 bytes)
        // Total 9 bytes data + 12 bytes overhead = 21 bytes
        
        const physChunk = new Uint8Array(21);
        const view = new DataView(physChunk.buffer);
        
        view.setUint32(0, 9); // Length of data
        // Chunk Type: pHYs (112 72 89 115)
        physChunk[4] = 112; physChunk[5] = 72; physChunk[6] = 89; physChunk[7] = 115;
        
        view.setUint32(8, ppu); // X axis
        view.setUint32(12, ppu); // Y axis
        physChunk[16] = 1; // Unit specifier: meter
        
        // CRC Calculation (essential for valid PNG)
        const crcTable = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                if (c & 1) c = 0xedb88320 ^ (c >>> 1);
                else c = c >>> 1;
            }
            crcTable[n] = c;
        }
        
        function crc32(buf, off, len) {
            let c = 0xffffffff;
            for (let i = 0; i < len; i++) {
                c = crcTable[(c ^ buf[off + i]) & 0xff] ^ (c >>> 8);
            }
            return c ^ 0xffffffff;
        }
        
        const crc = crc32(physChunk, 4, 13); // Calculate CRC over Type + Data
        view.setUint32(17, crc);
        
        // Construct new blob
        // Insert after IHDR (Length 4 + Type 4 + Data 13 + CRC 4 = 25 bytes + 8 signature = 33 bytes)
        // But simpler to just search for the first chunk end (IHDR)
        
        // IHDR length is always 13 bytes.
        // Signature (8) + IHDR Len (4) + IHDR Type (4) + IHDR Data (13) + IHDR CRC (4) = 33 bytes.
        // So safe to insert at index 33.
        
        const finalData = new Uint8Array(data.length + 21);
        finalData.set(data.subarray(0, 33), 0);
        finalData.set(physChunk, 33);
        finalData.set(data.subarray(33), 54);
        
        return new Blob([finalData], { type: 'image/png' });
    }
};
