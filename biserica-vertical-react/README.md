# Biserica Vertical - React Application

Aplicație React modernă pentru Biserica Vertical cu toate paginile reconstruite 1:1 din HTML/CSS/JS original.

## 🎨 Features

### Animație Nouă de Intro
- Animație modernă cu glassmorphism și particule
- Tranziții smooth cu Framer Motion
- Efecte de glow și rings expansion
- Optimizată pentru performance

### Pagini Implementate

#### Biserica
- **Homepage** - Landing page cu video background și intro animat
- **Despre** - Declarație de viziune și informații despre pastor
- **Program** - Program biserică și tineret cu timeline interactiv
- **Locație** - Hartă Google Maps și direcții
- **Contact** - Formular de contact și donații

#### Tineret UNITED
- **Tineret** - Homepage cu intro special, hero video, testimonials slider
- **Evenimente** - Grid cu evenimente, filtre interactive
- **Locație** - Hartă interactivă, facilități, direcții
- **Polls** - Sistem de voting cu progress bars și modal de confirmare

### Componente Refolosibile
- `IntroAnimation` - Animație de intro configurabilă (church/youth)
- `Navbar` - Navigație responsive cu hamburger menu
- `BrandStatic` - Logo și brand pentru pagini interne
- `Footer` - Footer normal și youth variant

## 🚀 Tehnologii

- **React 19** + TypeScript
- **Framer Motion** - Animații smooth
- **React Router** - Navigație SPA
- **Tailwind CSS** (optional) - Utility classes
- **Vite** - Build tool rapid

## 📦 Instalare

```bash
cd biserica-vertical-react
npm install
```

## 🔧 Development

```bash
npm run dev
```

Aplicația va fi disponibilă la `http://localhost:5173`

## 🏗️ Build pentru producție

```bash
npm run build
```

Fișierele de producție vor fi în directorul `dist/`

## 📁 Structură Proiect

```
src/
├── components/
│   ├── IntroAnimation.tsx    # Animație intro nouă
│   ├── Navbar.tsx             # Navigație responsive
│   ├── BrandStatic.tsx        # Logo static
│   └── Footer.tsx             # Footer
├── pages/
│   ├── Homepage.tsx           # Pagina principală
│   ├── Despre.tsx             # Despre noi
│   ├── Program.tsx            # Program biserică
│   ├── Locatie.tsx            # Locația noastră
│   ├── Contact.tsx            # Contact și donații
│   ├── Tineret.tsx            # Tineret homepage
│   ├── UnitedEvenimente.tsx   # Evenimente tineret
│   ├── UnitedLocatie.tsx      # Locație tineret
│   ├── UnitedPolls.tsx        # Polls interactive
│   └── planner/
│       ├── Login.tsx          # Planner login
│       └── Dashboard.tsx      # Planner dashboard
├── App.tsx                    # Router principal
└── main.tsx                   # Entry point

public/
├── assets/                    # Imagini și video
│   ├── logo.png
│   ├── united.png
│   ├── hero.mp4
│   └── youth-hero.mp4
└── styles.css                 # Stiluri originale
```

## ✨ Diferențe față de versiunea HTML

### Îmbunătățiri
1. **Animație Intro Nouă** - Complet redesigned cu efecte moderne
2. **SPA Experience** - Navigare fără reload de pagină
3. **Component-Based** - Cod refolosibil și ușor de menținut
4. **TypeScript** - Type safety pentru mai puține bug-uri
5. **Performance** - React optimization și lazy loading

### Păstrat 1:1
- Toate stilurile CSS originale
- Layout-ul exact
- Funcționalitățile JavaScript
- Structura de conținut
- Assets-uri (imagini, video)

## 🎯 Funcționalități Interactive

### Homepage
- Video background cu autoplay
- Intro animat cu particule
- Tranziție smooth către conținut

### Tineret
- Intro special cu energy burst
- Video hero background
- Testimonials slider automat
- Modal de quick join
- Stats counter

### Evenimente
- Filtre interactive
- Cards animate on scroll
- Responsive grid

### Polls
- Sistem de voting cu localStorage
- Progress bars animate
- Modal de confirmare
- Vote tracking

### Navbar
- Hamburger menu responsive
- Mobile menu full-screen
- Sticky navigation
- Active link highlighting

## 🔗 API & Backend

Aplicația este pregătită pentru integrare cu backend-ul existent din `/backend`.

Endpoint-uri necesare:
- Contact form submission
- Event registration
- Poll voting
- Newsletter subscription

## 📱 Responsive

Toate paginile sunt complet responsive:
- Desktop (>1100px)
- Tablet (720px - 1100px)
- Mobile (<720px)

Hamburger menu activat la <980px

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎨 Customization

### Culori
Variabilele CSS din `styles.css`:
- `--united-yellow: #FF5D1F` - Accent color tineret
- `--bg: #000` - Background
- `--fg: #fff` - Foreground text

### Animații
Timings în `IntroAnimation.tsx`:
- Particule fade in: 600ms
- Text reveal: 1000ms
- Move to corner: 800ms

## 📝 Notes

- Assets-urile (imagini, video) trebuie copiate din `/assets` în `/public/assets`
- Fișierul `styles.css` original este inclus în `/public`
- Toate funcționalitățile JavaScript din `script.js` au fost convertite în React hooks și componente

## 🐛 Known Issues

Niciun issue cunoscut - toate funcționalitățile din versiunea HTML au fost implementate.

## 📞 Support

Pentru întrebări sau probleme:
- Email: contact@bisericavertical.ro
- Facebook: @bisericavertical
- Instagram: @bisericavertical

---

**Created by:** AI Assistant  
**Date:** Octombrie 2025  
**Version:** 1.0.0
