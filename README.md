<p align="center">
  <img src="assets/favicon.svg" alt="Map2Poster" width="80" />
</p>

<h1 align="center">Map2Poster</h1>

<p align="center">
  A client-side map poster generator — no install, no account, no API key.<br/>
</p>

<p align="center">
  <a href="https://dim4k.github.io/map2poster/"><img src="https://img.shields.io/badge/Live%20Demo-try%20it%20now-brightgreen?style=for-the-badge" alt="Live Demo" /></a>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#%EF%B8%8F-tech-stack">Tech Stack</a>
</p>

<p align="center">
  <img src="assets/demo.png" alt="Map2Poster Screenshot" width="600" />
</p>

## ✨ Features

- **10 poster styles** — Classic, Blueprint, Vintage, Midnight, Swiss, Botanical, Modern, Ocean, Asphalt, Neon
- **Map shapes** — Rectangle, Circle, Heart, Star
- **Label placement** — Bottom, Top, Center, Split
- **Full color control** — Borders, text, background, water, roads, parks, land
- **Typography** — 7 fonts, independent per label (city, country, coordinates)
- **Orientation** — Portrait & Landscape
- **Gradient fade** — Adjustable intensity and solid block height
- **High-res export** — 7000×9900px / 300 DPI / A1 print-ready PNG
- **Privacy** — Entirely client-side, no data collection

## 🚀 Quick Start

**Online** — open [dim4k.github.io/map2poster](https://dim4k.github.io/map2poster/) in your browser.

**Local** — clone and open `index.html`:

```sh
git clone https://github.com/dim4k/map2poster.git
```

No build step. Works with any static file server.

## 🛠️ Tech Stack

| Layer  | Tool                                                        |
| ------ | ----------------------------------------------------------- |
| UI     | [Vue 3](https://vuejs.org/) (Composition API)               |
| Maps   | [MapLibre GL JS](https://maplibre.org/)                     |
| Tiles  | [OpenFreeMap](https://openfreemap.org/) (free, no key)      |
| Export | [html2canvas](https://html2canvas.hertzen.com/) + FileSaver |

## 📝 License

This project is open source and available under the MIT License.

---

<p align="center">Made with ❤️ for beautiful map posters.</p>
