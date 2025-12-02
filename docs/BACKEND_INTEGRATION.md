# Backend Integration Specification

> Dokument pro integraci Elusse Game Builderu s backendem.  
> Verze: 1.1 | Datum: 2. prosince 2025

---

## Obsah

1. [Přehled](#přehled)
2. [Tech Stack](#tech-stack)
3. [Datové modely](#datové-modely)
4. [API Endpointy](#api-endpointy)
5. [Statické vs. dynamické assety](#statické-vs-dynamické-assety)
6. [Autentizace (OAuth 2.0)](#autentizace-oauth-20)
7. [.NET Implementace](#net-implementace)
8. [Frontend integrace](#frontend-integrace)
9. [Doporučení pro implementaci](#doporučení-pro-implementaci)

---

## Přehled

Elusse je 2D parallax game builder, kde uživatelé vytváří interaktivní scény z předpřipravených assetů. Backend potřebuje persistovat:

- **Scény** — konfigurace umístěných objektů, dialog zón, rámečků a sociálních ikon
- **Uživatelské preference** — vybrané pozadí, jazyk, skin postavy
- **Uživatelské účty** — základní auth pro přiřazení scén

### Současný stav

| Data | Aktuální uložení | Cílové uložení |
|------|------------------|----------------|
| Konfigurace scény | `public/config/map.json` | **Backend DB** |
| Vybrané pozadí | `localStorage` | **Backend DB** |
| Jazyk UI | `localStorage` | Backend DB (volitelně) |
| Skin postavy | `localStorage` | Backend DB (volitelně) |
| PNG assety | Statické soubory | **Statické (CDN)** |

---

## Tech Stack

### Doporučená architektura

| Vrstva | Technologie | Poznámka |
|--------|-------------|----------|
| **Frontend** | Svelte 5 + TypeScript + Phaser.js | Již implementováno |
| **Backend** | .NET 8 + ASP.NET Core Minimal APIs | Silné typování, výkon |
| **Databáze** | PostgreSQL + EF Core | JSONB pro `config`, relace pro zbytek |
| **Auth** | Google OAuth 2.0 + JWT | Access + Refresh tokeny |
| **Hosting** | Railway / Azure App Service / Docker | Dle preference |

### Proč PostgreSQL (ne MongoDB)

| Kritérium | PostgreSQL ✅ | MongoDB |
|-----------|--------------|---------|
| Struktura dat | Jasně definované schéma (`MapConfig`) | Flexibilní, ale nepotřebujeme |
| JSON podpora | `JSONB` — ukládá `config` + indexuje | Nativní, ale overkill |
| Relace | `User → Scenes` je čistá 1:N | Řeší se ručně |
| Transakce | ACID out of the box | Složitější |

### Proč .NET (ne PHP)

| Kritérium | .NET ✅ | PHP (Laravel) |
|-----------|---------|---------------|
| Typování | Silné — matchuje TypeScript na FE | Slabé |
| Performance | Velmi rychlé (Kestrel) | Pomalejší |
| JSON handling | `System.Text.Json` — nativní | Více boilerplate |
| Long-term | Microsoft backing | Stagnuje |

---

## Datové modely

### User

```typescript
interface User {
  id: string;                    // UUID
  email: string;                 // Unikátní
  displayName?: string;          // Volitelné zobrazované jméno
  createdAt: Date;
  updatedAt: Date;
}
```

**SQL:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  google_id VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  refresh_token VARCHAR(255),
  refresh_token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_google_id ON users(google_id);
```

> **Poznámka:** `password_hash` je NULL pro OAuth uživatele, `google_id` je NULL pro email/password uživatele.

---

### UserPreferences

```typescript
interface UserPreferences {
  userId: string;                // FK → User
  language: 'cs' | 'en';         // Jazyk UI (default: 'cs')
  catSkin: 'orange' | 'white';   // Skin postavy (default: 'orange')
  lastOpenedSceneId?: string;    // FK → Scene — poslední otevřená scéna
}
```

**SQL:**
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(5) DEFAULT 'cs',
  cat_skin VARCHAR(10) DEFAULT 'orange',
  last_opened_scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL
);
```

---

### Scene

Hlavní entita — reprezentuje jednu uživatelskou scénu.

```typescript
interface Scene {
  id: string;                    // UUID
  userId: string;                // FK → User (vlastník)
  name: string;                  // Název scény (např. "Můj les")
  slug?: string;                 // URL-friendly identifikátor
  backgroundFolder: string;      // 'forest_green' | 'forest_blue' | ...
  isPublic: boolean;             // Veřejně přístupná?
  config: MapConfig;             // JSON — hlavní konfigurace (viz níže)
  createdAt: Date;
  updatedAt: Date;
}
```

**SQL:**
```sql
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  background_folder VARCHAR(50) NOT NULL DEFAULT 'forest_green',
  is_public BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scenes_user_id ON scenes(user_id);
CREATE INDEX idx_scenes_slug ON scenes(slug);
```

---

### MapConfig (JSON v Scene.config)

Toto je hlavní JSON objekt uložený v `scenes.config`:

```typescript
interface MapConfig {
  worldWidth: number;            // Šířka světa v px (default: 2500)
  worldHeight: number;           // Výška světa v px (default: 640)
  playerStartX: number;          // Spawn X pozice hráče
  playerStartY: number;          // Spawn Y pozice hráče
  placedItems: PlacedItem[];     // Umístěné předměty
  dialogZones: DialogZone[];     // Dialog zóny
  placedFrames: PlacedFrame[];   // Textové rámečky
  placedSocials: PlacedSocial[]; // Sociální ikony
}
```

**Příklad:**
```json
{
  "worldWidth": 2500,
  "worldHeight": 640,
  "playerStartX": 250,
  "playerStartY": 540,
  "placedItems": [],
  "dialogZones": [],
  "placedFrames": [],
  "placedSocials": []
}
```

---

### PlacedItem

Předmět umístěný ve scéně.

```typescript
interface PlacedItem {
  id: string;                    // Unikátní ID (např. 'item_1732123456789_abc')
  assetKey: string;              // Klíč assetu: 'tent' | 'lamp' | 'sign_left' | ...
  x: number;                     // Pozice X ve světě
  y: number;                     // Pozice Y (typicky 0)
  scale?: number;                // Měřítko (default dle itemu: 4-8)
  depth?: number;                // Hloubka: 5 = za hráčem, 15 = před hráčem
  yOffset?: number;              // Vertikální offset od země
  flipX?: boolean;               // Horizontální překlopení
  physicsEnabled?: boolean;      // Blokuje hráče? (default: false)
}
```

**Dostupné assety (assetKey):**

| Klíč | Soubor | Default scale |
|------|--------|---------------|
| `tent` | `tent.png` | 6 |
| `lamp` | `lamp.png` | 8 |
| `sign_left` | `sign_left.png` | 7 |
| `sign_right` | `sign_right.png` | 7 |
| `stone_0` | `stone_0.png` | 4 |
| `stone_1` | `stone_1.png` | 5 |
| `stone_2` | `stone_2.png` | 4 |

---

### DialogZone

Zóna, která při vstupu hráče zobrazí dialog.

```typescript
interface DialogZone {
  id: string;                    // Unikátní ID (např. 'zone_1732123456789_abc')
  x: number;                     // Levý okraj zóny (X pozice)
  width: number;                 // Šířka zóny v px
  color: string;                 // Barva pro editor (hex, např. '#e74c3c')
  texts: LocalizedText[];        // Vícejazyčné texty
}

interface LocalizedText {
  language: string;              // 'cs' | 'en'
  title: string;                 // Nadpis (tučně)
  content: string;               // Obsah dialogu
}
```

---

### PlacedFrame

Textový rámeček s možností odkazu.

```typescript
interface PlacedFrame {
  id: string;                    // Unikátní ID
  frameKey: string;              // 'base_1' až 'base_25'
  x: number;                     // Pozice X
  y: number;                     // Pozice Y
  scale?: number;                // Měřítko (default: 4)
  depth?: number;                // Hloubka
  rotation?: number;             // Rotace: 0 nebo 90
  backgroundColor: string;       // Hex barva pozadí
  textColor?: string;            // Hex barva textu (default: '#333333')
  textSize?: number;             // Velikost fontu v px (default: 16)
  textAlign?: 'top' | 'center' | 'bottom';  // Zarovnání textu
  texts: FrameLocalizedText[];   // Vícejazyčné texty
  url?: string;                  // Volitelný odkaz
}

interface FrameLocalizedText {
  language: string;              // 'cs' | 'en'
  text: string;                  // Text v rámečku
}
```

---

### PlacedSocial

Sociální ikona s odkazem.

```typescript
interface PlacedSocial {
  id: string;                    // Unikátní ID
  socialKey: string;             // Klíč ikony (viz tabulka níže)
  x: number;                     // Pozice X
  y: number;                     // Pozice Y
  scale?: number;                // Měřítko: 1.5 (S), 2 (M), 2.5 (L)
  depth?: number;                // Hloubka
  url?: string;                  // URL odkazu (otevře se v novém tabu)
}
```

**Dostupné sociální ikony (socialKey):**

| Klíč | Soubor |
|------|--------|
| `discord` | `Discord.png` |
| `facebook` | `Facebook.png` |
| `instagram` | `Instagram.png` |
| `kofi` | `Ko Fi.png` |
| `linkedin` | `LinkedIn.png` |
| `patreon` | `Patreon.png` |
| `tiktok` | `TikTok.png` |
| `twitch` | `Twitch.png` |
| `twitter` | `Twitter.png` |
| `whatsapp` | `Whatsapp.png` |
| `youtube` | `Youtube.png` |

---

## API Endpointy

### Autentizace

| Metoda | Endpoint | Popis | Request | Response |
|--------|----------|-------|---------|----------|
| `POST` | `/api/auth/register` | Registrace | `{ email, password }` | `{ user, token }` |
| `POST` | `/api/auth/login` | Přihlášení | `{ email, password }` | `{ user, token }` |
| `POST` | `/api/auth/logout` | Odhlášení | — | `{ success }` |
| `GET` | `/api/auth/me` | Aktuální uživatel | — | `{ user }` |

---

### Uživatelské preference

| Metoda | Endpoint | Popis | Request | Response |
|--------|----------|-------|---------|----------|
| `GET` | `/api/users/me/preferences` | Načíst preference | — | `UserPreferences` |
| `PATCH` | `/api/users/me/preferences` | Aktualizovat preference | `Partial<UserPreferences>` | `UserPreferences` |

**Příklad PATCH:**
```json
{
  "language": "en",
  "catSkin": "white"
}
```

---

### Scény

Uživatel může mít **neomezený počet scén**. Každá scéna má vlastní konfiguraci, pozadí a slug pro sdílení.

| Metoda | Endpoint | Popis | Request | Response |
|--------|----------|-------|---------|----------|
| `GET` | `/api/scenes` | Seznam mých scén | `?limit=20&offset=0` | `{ scenes: Scene[], total: number }` |
| `POST` | `/api/scenes` | Vytvořit novou scénu | `{ name, backgroundFolder? }` | `Scene` |
| `GET` | `/api/scenes/:id` | Načíst scénu | — | `Scene` |
| `PUT` | `/api/scenes/:id` | Uložit scénu | `{ name?, backgroundFolder?, config?, isPublic? }` | `Scene` |
| `PATCH` | `/api/scenes/:id` | Částečná aktualizace | `Partial<Scene>` | `Scene` |
| `DELETE` | `/api/scenes/:id` | Smazat scénu | — | `{ success }` |
| `POST` | `/api/scenes/:id/duplicate` | Duplikovat scénu | `{ name? }` | `Scene` |
| `GET` | `/api/scenes/public/:slug` | Načíst veřejnou scénu (bez auth) | — | `Scene` |

**Příklad GET `/api/scenes` response:**
```json
{
  "scenes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Můj lesní svět",
      "slug": "muj-lesni-svet",
      "backgroundFolder": "forest_green",
      "isPublic": true,
      "createdAt": "2025-12-02T10:00:00Z",
      "updatedAt": "2025-12-02T14:30:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Zimní krajina",
      "slug": "zimni-krajina",
      "backgroundFolder": "forest_blue",
      "isPublic": false,
      "createdAt": "2025-12-01T08:00:00Z",
      "updatedAt": "2025-12-01T08:00:00Z"
    }
  ],
  "total": 2
}
```

> **Poznámka:** V seznamu scén se nevrací `config` — ten je velký a načítá se až při `GET /api/scenes/:id`.

**Příklad POST `/api/scenes`:**
```json
{
  "name": "Můj lesní svět",
  "backgroundFolder": "forest_green"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "...",
  "name": "Můj lesní svět",
  "slug": "muj-lesni-svet",
  "backgroundFolder": "forest_green",
  "isPublic": false,
  "config": {
    "worldWidth": 2500,
    "worldHeight": 640,
    "playerStartX": 250,
    "playerStartY": 540,
    "placedItems": [],
    "dialogZones": [],
    "placedFrames": [],
    "placedSocials": []
  },
  "createdAt": "2025-12-02T10:00:00Z",
  "updatedAt": "2025-12-02T10:00:00Z"
}
```

**Příklad PUT `/api/scenes/:id` (uložení konfigurace):**
```json
{
  "backgroundFolder": "forest_blue",
  "config": {
    "worldWidth": 2500,
    "worldHeight": 640,
    "playerStartX": 300,
    "playerStartY": 540,
    "placedItems": [
      {
        "id": "item_1733130000000_abc",
        "assetKey": "tent",
        "x": 500,
        "y": 0,
        "scale": 6,
        "depth": 5,
        "yOffset": -50
      }
    ],
    "dialogZones": [],
    "placedFrames": [],
    "placedSocials": []
  }
}
```

---

### Dostupné assety (read-only katalog)

| Metoda | Endpoint | Popis | Response |
|--------|----------|-------|----------|
| `GET` | `/api/assets/backgrounds` | Seznam pozadí | `BackgroundConfig[]` |
| `GET` | `/api/assets/items` | Seznam předmětů | `ItemDefinition[]` |
| `GET` | `/api/assets/frames` | Seznam rámečků | `FrameDefinition[]` |
| `GET` | `/api/assets/socials` | Seznam sociálních ikon | `SocialDefinition[]` |

> **Poznámka:** Tyto endpointy jsou volitelné. Katalog assetů se nemění často, takže může zůstat staticky v kódu frontendu. Ale pokud chcete dynamicky přidávat nové assety bez redeploy FE, pak má smysl je servírovat z BE.

---

## Statické vs. dynamické assety

### Zůstává statické (CDN / `public/`)

Tyto soubory jsou velké a nemění se — hostovat na CDN nebo jako statické soubory:

```
public/assets/
├── backgrounds/
│   ├── forest_green/    (0.png - 5.png, preview.png)
│   ├── forest_blue/
│   ├── forest_birch/
│   ├── forest_fantasy/
│   ├── forest_gold/
│   ├── forest_jungle/
│   └── forest_summer/
├── sprites/
│   ├── orange/          (Idle.png, Walk.png)
│   └── white/
├── icons/               (item PNG soubory)
├── frames/              (base_1.png - base_25.png)
└── socials/             (Discord.png, Twitter.png, ...)
```

**Odhadovaná velikost:** ~5-10 MB celkem (všechny PNG)

### Přichází z backendu (JSON)

- `Scene.config` — typicky 5-50 KB podle komplexity scény
- `UserPreferences` — < 1 KB

---

## Autentizace (OAuth 2.0)

### Přehled

Používáme **Google OAuth 2.0** s JWT tokeny:

| Token | Expirace | Úložiště |
|-------|----------|----------|
| Access Token | 15 minut | Paměť (JavaScript) |
| Refresh Token | 7 dní | httpOnly cookie |

### Auth endpointy

| Metoda | Endpoint | Popis | Request | Response |
|--------|----------|-------|---------|----------|
| `GET` | `/api/auth/google/url` | Vrátí Google OAuth URL | `?redirectUri=...` | `{ url }` |
| `POST` | `/api/auth/google` | Výměna code za tokeny | `{ code, redirectUri? }` | `{ user, accessToken, expiresAt }` |
| `POST` | `/api/auth/refresh` | Obnovení access tokenu | (cookie) | `{ user, accessToken, expiresAt }` |
| `POST` | `/api/auth/logout` | Odhlášení | — | `{ success }` |
| `GET` | `/api/auth/me` | Aktuální uživatel | — | `{ user, preferences }` |

### OAuth Flow diagram

```
┌─────────────┐     1. Click "Login with Google"      ┌─────────────┐
│   Frontend  │ ────────────────────────────────────> │   Backend   │
│  (Svelte)   │ <──────────────────────────────────── │   (.NET)    │
└─────────────┘     2. Returns Google OAuth URL       └─────────────┘
       │
       │ 3. Redirect to Google
       ▼
┌─────────────┐
│   Google    │
│   OAuth     │
└─────────────┘
       │
       │ 4. User logs in, redirects back with ?code=xxx
       ▼
┌─────────────┐     5. POST /api/auth/google          ┌─────────────┐
│  Callback   │ ────────────────────────────────────> │   Backend   │
│   Page      │                                       │             │
└─────────────┘                                       │ 6. Exchange │
       ▲                                              │    code for │
       │                                              │    tokens   │
       │     8. { user, accessToken }                 │             │
       │        + httpOnly cookie (refreshToken)      │ 7. Create/  │
       └────────────────────────────────────────────── │    find user│
                                                      └─────────────┘
```

### Google Cloud Console setup

1. Jdi na [console.cloud.google.com](https://console.cloud.google.com)
2. Vytvoř projekt → **APIs & Services → Credentials**
3. **Create Credentials → OAuth client ID**

```
Application type: Web application
Name:             Elusse

Authorized JavaScript origins:
  http://localhost:5173          # Dev
  https://elusse.app             # Produkce

Authorized redirect URIs:
  http://localhost:5173/auth/callback
  https://elusse.app/auth/callback
```

> **Tip:** Google povoluje `localhost` bez HTTPS — výjimka pro development.

### Příklad auth headeru

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## .NET Implementace

### Struktura projektu

```
Elusse.Api/
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
├── Controllers/
│   ├── AuthController.cs
│   ├── ScenesController.cs
│   └── PreferencesController.cs
├── Models/
│   ├── User.cs
│   ├── Scene.cs
│   ├── UserPreferences.cs
│   └── AuthModels.cs
├── Services/
│   └── JwtService.cs
└── Data/
    └── AppDbContext.cs
```

### Konfigurace (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=elusse;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Secret": "your-super-secret-key-min-32-characters-long!",
    "Issuer": "elusse-api",
    "Audience": "elusse-app",
    "AccessTokenExpirationMinutes": 15,
    "RefreshTokenExpirationDays": 7
  },
  "Google": {
    "ClientId": "xxxxx.apps.googleusercontent.com",
    "ClientSecret": "GOCSPX-xxxxx"
  },
  "Frontend": {
    "Url": "http://localhost:5173"
  }
}
```

### C# Modely

```csharp
public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? GoogleId { get; set; }
    public string? PasswordHash { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    public UserPreferences? Preferences { get; set; }
    public ICollection<Scene> Scenes { get; set; } = new List<Scene>();
}

public class Scene
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = null!;
    public string? Slug { get; set; }
    public string BackgroundFolder { get; set; } = "forest_green";
    public bool IsPublic { get; set; }
    public JsonDocument Config { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    public User User { get; set; } = null!;
}

public class UserPreferences
{
    public Guid UserId { get; set; }
    public string Language { get; set; } = "cs";
    public string CatSkin { get; set; } = "orange";
    public Guid? LastOpenedSceneId { get; set; }
    
    public User User { get; set; } = null!;
}
```

### Program.cs (základní setup)

```csharp
var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
        };
    });

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://elusse.app")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### JWT Service

```csharp
public class JwtService
{
    private readonly IConfiguration _config;

    public (string Token, DateTime ExpiresAt) GenerateAccessToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName ?? user.Email)
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiration = DateTime.UtcNow.AddMinutes(
            int.Parse(_config["Jwt:AccessTokenExpirationMinutes"]!));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiration,
            signingCredentials: creds
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiration);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
```

---

## Frontend integrace

### Auth Service (TypeScript)

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface AuthState {
  user: { id: string; email: string; displayName?: string } | null;
  accessToken: string | null;
  expiresAt: Date | null;
}

class AuthService {
  private state: AuthState = { user: null, accessToken: null, expiresAt: null };

  // Přesměrování na Google login
  async loginWithGoogle() {
    const response = await fetch(`${API_URL}/api/auth/google/url`);
    const { url } = await response.json();
    window.location.href = url;
  }

  // Callback po Google loginu
  async handleGoogleCallback(code: string) {
    const response = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ 
        code,
        redirectUri: `${window.location.origin}/auth/callback`
      })
    });

    if (!response.ok) throw new Error('Authentication failed');

    const data = await response.json();
    this.state = {
      user: data.user,
      accessToken: data.accessToken,
      expiresAt: new Date(data.expiresAt)
    };

    return data.user;
  }

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const data = await response.json();
      this.state = {
        user: data.user,
        accessToken: data.accessToken,
        expiresAt: new Date(data.expiresAt)
      };

      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  // Auth header pro API requesty
  getAuthHeaders(): Record<string, string> {
    if (!this.state.accessToken) return {};
    return { 'Authorization': `Bearer ${this.state.accessToken}` };
  }

  async logout() {
    if (this.state.accessToken) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
    }
    this.state = { user: null, accessToken: null, expiresAt: null };
  }

  get user() { return this.state.user; }
  get isAuthenticated() { return !!this.state.accessToken; }
}

export const authService = new AuthService();
```

### Callback stránka (Svelte)

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { authService } from '$lib/services/auth';

  let error = '';
  let loading = true;

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      error = 'No authorization code received';
      loading = false;
      return;
    }

    try {
      await authService.handleGoogleCallback(code);
      window.location.href = '/builder';
    } catch (e) {
      error = 'Authentication failed. Please try again.';
      loading = false;
    }
  });
</script>

{#if loading}
  <p>Přihlašování...</p>
{:else if error}
  <p class="error">{error}</p>
  <a href="/">Zpět</a>
{/if}
```

### Lokální vývoj

```bash
# Backend (.NET)
cd Elusse.Api
dotnet run   # → http://localhost:5000

# Frontend (Vite)
cd elusse
npm run dev  # → http://localhost:5173
```

---

## Doporučení pro implementaci

### 1. Ukládání scény

**Možnost A: Explicitní Save tlačítko**
- Uživatel klikne "Uložit" → `PUT /api/scenes/:id`
- Jednodušší, méně API callů
- Riziko ztráty práce při pádu prohlížeče

**Možnost B: Autosave**
- Debounced ukládání (např. 30s po poslední změně)
- Lepší UX, ale více API callů
- Doporučuji kombinovat s explicitním Save

### 2. Lazy loading pozadí

Pozadí mají 4-7 PNG vrstev. Načítat je až když uživatel zvolí konkrétní pozadí:

```typescript
// Příklad lazy loading
async function loadBackground(folder: string) {
  const layers = await Promise.all(
    [0, 1, 2, 3, 4, 5].map(i => 
      loadImage(`/assets/backgrounds/${folder}/${i}.png`)
    )
  );
  return layers;
}
```

### 3. Veřejné sdílení scén

Flow pro sdílení:
1. Uživatel nastaví `isPublic: true`
2. Vygeneruje se unikátní `slug`
3. Veřejná URL: `https://elusse.app/s/{slug}`
4. Návštěvník načte scénu přes `GET /api/scenes/public/:slug`

### 4. Validace na backendu

Validovat `MapConfig` při ukládání:
- `worldWidth` a `worldHeight` — kladná čísla, rozumné limity (např. max 10000)
- `placedItems[].assetKey` — musí existovat v katalogu
- `dialogZones[].width` — kladné číslo
- `placedFrames[].frameKey` — `base_1` až `base_25`
- `placedSocials[].socialKey` — musí existovat v katalogu
- URL pole — validní URL formát

### 5. Migrace z localStorage

Při prvním přihlášení uživatele:
1. Načíst `localStorage` hodnoty (`background`, `catSkin`, `language`)
2. Vytvořit `UserPreferences` na BE s těmito hodnotami
3. Vymazat `localStorage` (nebo ponechat jako fallback)

---

## Přílohy

### A. Kompletní TypeScript typy

Viz `src/types/` a `src/data/mapConfig.ts` v projektu.

### B. Dostupná pozadí

| Folder | Název | Vrstev | Foreground |
|--------|-------|--------|------------|
| `forest_green` | Forest Green | 6 | 1 |
| `forest_blue` | Forest Blue | 6 | 0 |
| `forest_birch` | Forest Birch | 5 | 0 |
| `forest_fantasy` | Forest Fantasy | 7 | 2 |
| `forest_gold` | Forest Gold | 6 | 2 |
| `forest_jungle` | Forest Jungle | 4 | 0 |
| `forest_summer` | Forest Summer | 5 | 1 |

---

## Changelog

- **1.1** (2. 12. 2025) — Přidán tech stack, Google OAuth 2.0, .NET implementace, frontend integrace
- **1.0** (2. 12. 2025) — Iniciální verze dokumentu
