# 🗺️ Map2Poster

> Generate stunning high-resolution map posters with customized styling.

![Demo](demo.png)

## ✨ Features

- **Beautiful Map Posters** — Create print-ready city maps for wall art
- **Search Any Location** — Find cities, addresses, or landmarks instantly
- **Dark/Light Themes** — Modern glassmorphism UI with seamless theme switching
- **Customization Options**:
  - 3 unique poster styles: **Classic**, **Blueprint**, and **Vintage**
  - **Portrait** & **Landscape** orientations
  - Custom colors for borders, text, and background
  - Adjustable zoom level (10-18)
  - Toggle coordinates and country display
- **High Resolution Export** — Download at 5000×7000px (or 7000×5000px landscape)
- **Responsive Design** — Fully functional on desktop and mobile devices
- **Privacy Focused** — No data collection, purely client-side rendering

## 🚀 Quick Start

1. **Clone the repository**
   ```sh
   git clone https://github.com/dim4k/mapbox2image.git
   ```

2. **Open `index.html`** in your browser
   - No build step required! Just open the file directly or serve it with a local server.
   - Recommended: Use VS Code's "Live Server" extension.

3. **Enjoy!**
   - Search for a city
   - Tweak the styles
   - Click **Download Poster**

## 🎨 Poster Styles

| Style | Description |
|-------|-------------|
| **Classic** | Timeless design with bold double borders and clean typography. |
| **Blueprint** | Technical aesthetic with grid lines and monospaced fonts. |
| **Vintage** | Warm sepia tones, retro textures, and classic serif fonts. |

## 🛠️ Technologies

- **[Vue 3](https://vuejs.org/)** — Reactive UI and Composition API
- **[MapLibre GL JS](https://maplibre.org/)** — Open-source WebGL map rendering
- **[html2canvas](https://html2canvas.hertzen.com/)** — DOM-to-canvas rendering for export
- **[FileSaver.js](https://github.com/eligrey/FileSaver.js)** — Client-side file saving

## 📝 Tips

- **Browser Support**: Works best in **Chrome** or **Edge** (Chromium-based browsers) for the most accurate poster rendering.
- **Zoom Level**: For the best detail-to-context ratio, try zoom levels between **12 and 15**.
- **Mobile**: The app is fully responsive! You can design posters on your phone, but downloading on Desktop is recommended for the full resolution file handling.

## 📄 License

MIT — Feel free to use and modify for your own projects!

---