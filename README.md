# Interactive Pixel Art Portfolio

Interaktivní portfolio překladatelky a korektorky jako 2D platformer postavený s **Phaser 3**, **TypeScript** a **Vite**.

## 🎮 Ovládání

### Desktop
- **A** / **←** - Pohyb doleva
- **D** / **→** - Pohyb doprava
- **W** / **↑** / **Mezerník** - Skok
- **L** nebo **kliknutí na tlačítko jazyka** - Přepnout jazyk (CZ/EN)
- **C** nebo **kliknutí na tlačítko barvy** - Přepnout barvu kočky

### Mobil
- **Levá strana obrazovky** - Pohyb doleva
- **Pravá strana obrazovky** - Pohyb doprava
- **Horní třetina obrazovky** - Skok
- **Tlačítko v pravém horním rohu** - Přepnout jazyk nebo barvu kočky

## 🚀 Vývoj

### Instalace
```bash
npm install
```

### Lokální server
```bash
npm run dev
```

### Build pro produkci
```bash
npm run build
```

### Preview produkčního buildu
```bash
npm run preview
```

## 🎨 Vlastní Assety

Projekt používá placeholder assety. Pro nahrání vlastních assetů postupujte podle následujících pokynů:

### 📁 Struktura složek
```
public/assets/
├── sprites/
│   ├── orange/     # Orange skin kočky
│   │   ├── Idle.png
│   │   └── Walk.png
│   └── white/      # White skin kočky
│       ├── Idle.png
│       └── Walk.png
├── backgrounds/    # Parallax pozadí (vrstvy)
└── ui/            # UI elementy
```

### 🐱 Sprite Sheety pro kočku (Player)

**Formát:** PNG sprite sheet, 48x48px per frame

**Požadované soubory pro každý skin:**
- **Idle.png** - Klidový stav (4 framy)
- **Walk.png** - Chůze (6 framů)

**Přidání nového skinu:**
Viz [ADDING_SKINS.md](./ADDING_SKINS.md) pro detailní návod.

Stručně:
1. Vytvořte složku `public/assets/sprites/[název-skinu]/`
2. Přidejte `Idle.png` a `Walk.png`
3. Do `src/data/catSkin.ts` přidejte název do `AVAILABLE_SKINS`

this.setTexture('player-placeholder');

// Za:
this.setTexture('cat-spritesheet');
```

A v `src/scenes/GameScene.ts` přidejte do `preload()`:
```typescript
preload(): void {
  this.load.spritesheet('cat-spritesheet', 'assets/sprites/cat-spritesheet.png', {
    frameWidth: 32,
    frameHeight: 32
  });
}
```

### 🌄 Parallax pozadí

**Formát:** PNG obrázky, doporučená šířka 800px, výška 600px

**Vrstvy:**
- **bg-layer-1.png** - Vzdálená vrstva (např. nebe, mraky)
- **bg-layer-2.png** - Střední vrstva (např. hory, stromy)

**Umístění:** `public/assets/backgrounds/`

**Úprava kódu:** V `src/scenes/GameScene.ts`, metoda `createParallaxBackground()`:
```typescript
preload(): void {
  this.load.image('bg1', 'assets/backgrounds/bg-layer-1.png');
  this.load.image('bg2', 'assets/backgrounds/bg-layer-2.png');
}

private createParallaxBackground(): void {
  this.bg1 = this.add.tileSprite(0, 0, 2000, 600, 'bg1');
  this.bg1.setOrigin(0, 0);
  this.bg1.setScrollFactor(0);
  this.bg1.setDepth(-2);

  this.bg2 = this.add.tileSprite(0, 0, 2000, 600, 'bg2');
  this.bg2.setOrigin(0, 0);
  this.bg2.setScrollFactor(0.3);
  this.bg2.setDepth(-1);
}
```

### 💬 Dialog obsah

Upravte dialogy ve vašem portfoliu v souboru `src/data/dialogs.ts`. Dialogy podporují lokalizaci do češtiny a angličtiny:
```typescript
export const DIALOGS: DialogData[] = [
  {
    id: 'welcome',
    x: 200,           // X pozice triggeru
    width: 150,       // Šířka trigger zóny
    text: {
      cs: 'Váš český text zde',
      en: 'Your English text here',
    },
  },
  // ... další dialogy
];
```

**Vizuální indikátory trigger zón:**
- Žluté obdélníky s pulsující animací označují aktivní trigger zóny
- Ikona "!" nad každou zónou poskakuje pro lepší viditelnost
- Po průchodu zónou a zobrazení dialogu se indikátory plynule skryjí
- Indikátory jsou placeholder - připravené pro nahrazení sprite sheety

**Nahrazení vizuálních indikátorů vlastním sprite:**
V `src/scenes/GameScene.ts`, metoda `createDialogTriggers()` obsahuje grafické placeholder elementy. Pro vlastní sprite:
1. Nahrajte sprite sheet do `public/assets/ui/trigger-icon.png`
2. V `preload()` přidejte: `this.load.image('trigger-icon', 'assets/ui/trigger-icon.png');`
3. Nahraďte graphics kód za: `this.add.image(dialog.x, 690, 'trigger-icon');`

### 🌐 Lokalizace

Hra podporuje **češtinu (CZ)** a **angličtinu (EN)**. Hráč může přepínat mezi jazyky klávesou **L**. Jazyk se ukládá do `localStorage`.

**Přidání nového jazyka:**
1. Aktualizujte `src/types/DialogData.ts` - přidejte jazyk do `Language` typu
2. Rozšiřte `LocalizedText` interface o nový jazyk
3. Přidejte překlady do všech dialogů v `src/data/dialogs.ts`
4. Aktualizujte `src/data/localization.ts` pro podporu nového jazyka

## 🌐 Deployment na GitHub Pages

### 1. Nastavení repository
1. Vytvořte nový GitHub repository
2. Push kód do repository

### 2. Povolení GitHub Pages
1. Jděte do **Settings** → **Pages**
2. V sekci **Source** vyberte **GitHub Actions**

### 3. Úprava base path
V souboru `vite.config.ts` změňte `base` na název vašeho repository:
```typescript
export default defineConfig({
  base: '/your-repo-name/',  // Změňte 'elusse' na název vašeho repo
  // ...
});
```

### 4. Deploy
GitHub Actions automaticky nasadí na každý push do `main` branch. Web bude dostupný na:
```
https://your-username.github.io/your-repo-name/
```

## 📚 Technologie

- **Phaser 3** - Game framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **GitHub Actions** - CI/CD pipeline

## 🎯 Features

- ✅ 2D Platformer mechaniky
- ✅ Pixel art rendering (crisp pixels)
- ✅ Desktop + Mobile controls (WASD, Arrow keys, Touch)
- ✅ Parallax scrolling pozadí
- ✅ Smooth camera follow
- ✅ Automatické speech bubbles
- ✅ 7 interaktivních dialog zón
- ✅ **Lokalizace: Čeština + Angličtina**
- ✅ Responsive design

## 📝 Licence

MIT - Použijte volně pro své portfolio!
