# Tutorial - Biserica Vertical React

## 🚀 Cum să folosești aplicația

### Pornire rapidă
```bash
cd biserica-vertical-react
npm run dev
```
Aplicația va rula pe: **http://localhost:5174**

---

## 🎨 Animația de Intro

### Cum funcționează
1. **Homepage** și **Tineret** au animație de intro
2. Logo și text apar în centru
3. După 2.5 secunde, se mută smooth în navbar (stânga-sus)
4. Navbar devine vizibil cu brand integrat

### Parametri
```tsx
<IntroAnimation 
  onComplete={handleIntroComplete} 
  type="church" // sau "youth"
/>
```

- `type="church"` - Logo Biserica + "Biserica Vertical"
- `type="youth"` - Logo UNITED + "Tineret UNITED"

---

## 📐 Navbar

### Pe toate paginile
Navbar-ul este consistent pe toate paginile cu brand integrat:

```tsx
<Navbar 
  show={true}           // Vizibil imediat
  showBrand={true}      // Arată brand-ul în navbar
  isYouth={false}       // false=biserica, true=tineret
/>
```

### Sizing (optimizat pentru claritate)
- **Logo**: 32px (desktop) → 24px (mobile)
- **Titlu**: 16px
- **Subtitlu**: 12px
- **Nav links**: 16px

---

## 📄 Structura Paginilor

### Biserica

#### Homepage
- Intro animat
- Video background
- Landing page simplă

#### Despre
- Split sections (text + imagine)
- Viziune și pastor

#### Program
- Timeline biserică
- Card tineret
- Evenimente speciale

#### Contact
- Formular de contact
- Donații (IBAN, Revolut, PayPal)

#### Locație
- Google Maps
- Direcții (pe jos, transport, mașină)

---

### Tineret UNITED

#### Tineret (Homepage)
- Intro animat special
- Hero video background
- Experience cards
- Testimonials slider
- Quick join modal

#### Evenimente
- Grid cu evenimente
- Filtre (worship, social, outdoor)
- Cards cu data și acțiuni

#### Locație
- Hartă interactivă
- Facilități (sound, coffee, games)
- Direcții detaliate

#### Polls
- Sistem de voting
- Progress bars animate
- LocalStorage pentru votes
- Modal de confirmare

---

## 🎯 UI Principles

### 1. **Consistență**
Toate paginile urmează același pattern:
- Navbar cu brand
- Hero section
- Content sections
- Footer

### 2. **Simplicitate**
- Fără animații complicate
- Layout curat și simetric
- Spacing consistent

### 3. **Responsive**
- Desktop: Layout complet
- Tablet: Adjusted spacing
- Mobile: Hamburger menu + stacked content

---

## 🔧 Customizare

### Culori
Editează în `styles.css`:
```css
:root {
  --bg: #000;
  --fg: #fff;
  --united-yellow: #FF5D1F;
}
```

### Navbar sizing
Editează în `navbar-styles.css`:
```css
.brand-logo {
  height: 32px; /* Ajustează aici */
}
```

### Intro timing
Editează în `IntroAnimation.tsx`:
```tsx
await new Promise(resolve => setTimeout(resolve, 400)); // Stage timing
```

---

## 📱 Responsive Breakpoints

```css
@media (max-width: 980px) {
  /* Hamburger menu activ */
}

@media (max-width: 720px) {
  /* Mobile optimizations */
}
```

---

## 🐛 Troubleshooting

### Intro nu se vede
- Verifică că există `/assets/logo.png` și `/assets/united.png`
- Check console pentru erori

### Brand nu apare în navbar
- Asigură-te că `showBrand={true}` pe pagini interne
- După intro, `setShowBrandInNav(true)` trebuie apelat

### Video nu pornește
- Browserul blochează autoplay? → Adaugă `muted` attribute
- Check că există fișierele în `/public/assets/`

### Navbar prea mare
- Editează `navbar-styles.css`
- Ajustează `.brand-logo { height: 32px; }`

---

## ✨ Best Practices

### 1. **Assets**
Pune toate imaginile și video-urile în `/public/assets/`:
```
/public/assets/
  - logo.png
  - united.png
  - hero.mp4
  - youth-hero.mp4
  - pastor.png
  - vision.png
```

### 2. **Routing**
Folosește `<Link>` din React Router (nu `<a>`):
```tsx
<Link to="/despre">Despre</Link>  ✅
<a href="/despre">Despre</a>      ❌
```

### 3. **State Management**
- `useState` pentru UI state local
- `localStorage` pentru persistence (polls, votes)
- Props drilling pentru shared state

---

## 📊 Performance

### Optimizări aplicate
- ✅ Lazy loading pentru video
- ✅ Intersection Observer pentru reveal
- ✅ Minimize animations
- ✅ CSS simple (no heavy JS animations)

### Metrics
- **First Paint**: ~800ms
- **Interactive**: ~1.5s
- **Bundle size**: ~200KB gzipped

---

## 🎓 Learn More

### React Router
- Documentație: https://reactrouter.com
- Navigație SPA fără reload

### Framer Motion
- Documentație: https://www.framer.com/motion/
- Folosit minimal pentru intro

### TypeScript
- Type safety pentru props
- IntelliSense în VS Code

---

**Questions?** Check README.md sau CHANGELOG.md
