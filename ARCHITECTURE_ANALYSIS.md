# O Ponto de Virada — Architecture Analysis

**Project**: Devotional study app focused on Gospel of Mark (Portuguese)  
**Type**: Single-page application (SPA) with client-side rendering  
**Tech Stack**: Vanilla JS, Modular CSS, JSON data, HTML5  
**Fonts**: Playfair Display (display), Inter (body)  
**Theme**: Dark mode with gold accents (#d7b26d)

---

## 1. JAVASCRIPT ARCHITECTURE

### Core Files Overview

| File | Lines | Purpose | Key Responsibility |
|------|-------|---------|-------------------|
| **episodes.js** | 1087 | Episode loading & rendering | Main rendering pipeline; builds episode UI from JSON |
| **navigation.js** | 147 | View state management | Switches between home/season/episode views |
| **search.js** | 127 | Full-text search | Searches all loaded episodes; returns matched blocks |
| **storage.js** | 55 | LocalStorage persistence | Progress tracking, prayer requests, leader notes |
| **modules/timeline.js** | 200 | Timeline navigation | Block-by-block reading experience |
| **modules/leader-tools.js** | 238 | Leader UI tools | Notes textarea, prayer requests panel |
| **modules/app-state.js** | 27 | Global state store | Centralized AppState object |
| **modules/scripture.js** | 57 | Bible text display | Scripture highlight modals |
| **modules/share.js** | 167 | Export/sharing | Episode summary export |

### Module Dependency Graph

```
index.html
  ├─ navigation.js (view routing)
  │   ├─ episodes.js (main rendering)
  │   │   ├─ app-state.js (state container)
  │   │   ├─ search.js (search indexing)
  │   │   ├─ modules/timeline.js (block navigation)
  │   │   ├─ modules/leader-tools.js (UI components)
  │   │   ├─ modules/scripture.js (modal system)
  │   │   └─ modules/share.js (export)
  │   └─ storage.js (persistence layer)
  │
  └─ CSS Modules (01-tokens → 16-content-types)
```

### Initialization Flow

```
1. HTML loads → links all CSS modules + JS files
2. navigation.js: VIEWS = ['home-view', 'season-view', 'episode-view']
3. User clicks "Entrar na Temporada" → loadSeason('data/seasons/marcos/meta.json')
4. episodes.js:
   - fetchJson() loads meta.json
   - setSeason(season) stores in AppState
   - buildEpisodeList() renders 4 episode cards
   - showOnly('season-view') switches view
5. User clicks episode → openEpisode(id)
6. episodes.js:
   - Fetches episodes/{id}.json
   - setEpisode(episode) + setScripture() populates state
   - renderEpisodeHome(episode) builds: hero + scripture + hub cards + leader launchers
   - showOnly('episode-view')
7. User clicks "Prepare-se" or "Conduza a célula" → openEpisodeSection(type)
8. episodes.js:
   - Switches to reading mode: document.body.classList.add('episode-reading-active')
   - renderExactEpisodeStep() iterates prepare/conduct blocks
   - Timeline UI appears with navigation
```

### Data Flow: JSON → DOM

**Source**: `data/seasons/marcos/meta.json` + `data/seasons/marcos/episodes/{1-4}.json`

```
meta.json (season metadata)
  └─ episodes[] (brief episode refs)
      └─ points to episodes/N.json (full episode content)

episodes/N.json structure:
{
  id, title, subtitle, img, challenge,
  scriptureHighlight: { reference, verse, fullText },
  prepare: [ {type, title, content[]}, ... ],
  conduct: [ {type, title, content[]}, ... ]
}

Rendering Pipeline:
1. renderEpisodeHome() → builds cards from meta
2. renderExactEpisodeStep() → iterates prepare/conduct blocks
3. renderExactStepContent() → context-aware rendering:
   - "scripture" type → renders scripture card
   - "reflection" type → text flow + visual carousel
   - "story" type → text + inline notes widget
   - "challenge" type → styled challenge box
   - "dynamic" type → interactive decision points
```

### Content Types Supported

| Type | Rendered As | Used In | Example |
|------|------------|---------|---------|
| **scripture** | Scripture card + full text button | prepare | "Leia Marcos 1:1–15" |
| **manifesto** | Highlighted text sections | prepare | Main idea explanation |
| **teaching** | Paragraph list (bulleted flow) | prepare | Theological teaching |
| **reflection** | Text flow + visual carousel | prepare | Thematic images for contemplation |
| **story** | Text flow + inline story notes | prepare/conduct | Leader opening story |
| **challenge** | Styled challenge box | prepare | "Desafio da semana" |
| **dynamic** | Interactive choice flow | conduct | "Escolha opção A ou B" |
| **default** | Text flow | fallback | Plain paragraphs |

### State Management (AppState)

```javascript
const AppState = {
  season: null,           // Current season meta {id, title, episodes[]}
  episode: null,          // Current full episode {prepare, conduct, ...}
  scripture: null,        // Current scripture highlight
  timeline: { current: 0 }  // Position in reading (prepare/conduct)
}
```

**Mutation**: Direct via `setSeason()`, `setEpisode()`, `setScripture()`  
**Scope**: Global window object for HTML onclick handlers  
**Persistence**: None in AppState; use Storage.js for progress/notes/prayers

### Search Implementation

```javascript
performSearch():
  1. Get all loaded episodes from AppState.season.episodes[]
  2. For each episode: fetch its JSON file
  3. Build searchableText from:
     - Meta fields: title, subtitle, summary, challenge
     - Scripture: reference, verse, fullText
     - All blocks: label, title, content[], questions[], steps[]
  4. Match term (case-insensitive substring)
  5. Return matches with blockIndex
  6. onClick → openEpisodeFromSearch(id, blockIndex) jumps to block
```

**Limitation**: Searches only loaded episodes (user must enter season first)

### Leader Tools (Storage + UI)

```javascript
Storage layer:
  - PROGRESS: {[episodeId]: {completed, date}}
  - PRAYERS: {[episodeId]: [prayer1, prayer2, ...]}
  - NOTES: {[episodeId]: [{text, date}, {text, date}, ...]}
  All stored in localStorage

UI (leader-tools.js):
  renderLeaderArea(id):
    - Textarea for notes (save → Storage.saveNotes)
    - History display below (load via loadLeaderHistory)
    - Prayer input + list (add → Storage.savePrayers)
    - "Marcar como concluído" toggle button
    - Export episode summary (share.js)
    - "Voltar" + "Próximo episódio" navigation
```

### Export/Share Feature

```javascript
exportEpisodeSummary(id):
  1. Get current episode from AppState
  2. Build text summary from:
     - Metadata: title, subtitle, summary, challenge
     - Scripture highlight
     - All prepare blocks (truncated)
     - Notes & prayers from Storage
  3. Create shareable text/HTML
  4. Copy to clipboard or open share dialog
```

---

## 2. CSS ARCHITECTURE

### Module System (16 files, 01-tokens → 13-responsive)

| Module | Lines | Purpose | Key Decisions |
|--------|-------|---------|---------------|
| **01-tokens.css** | 11 | CSS variables | `--bg`, `--gold`, `--text`, `--purple`, etc. |
| **02-reset.css** | 27 | Global reset | Box-sizing, font smoothing, scroll behavior |
| **03-layout.css** | 107 | Containers & layout | `.container` (540px max), `.section`, `.card`, `.glass` |
| **04-buttons.css** | 79 | Button styles | `.primary-btn`, `.btn-gold`, states (hover, active) |
| **05-header.css** | 49 | Top nav bar | Logo, header-actions, sticky positioning |
| **06-home.css** | 151 | Hero + season cards | `.hero`, `.season-card`, `.episode-card` |
| **07-season.css** | 170 | Season view | Episode grid, coming-soon state |
| **08-episode.css** | 3381 | **[LARGEST]** Episode reading | Hero, steps, timeline, "Correção v7" overrides |
| **09-timeline.css** | 528 | Timeline flow | `.timeline-item`, `.timeline-dot`, markers |
| **10-scripture.css** | 168 | Scripture cards | Blockquote styling, Bible text display |
| **11-leader-tools.css** | 428 | Leader UI | Textarea, prayer list, notes history |
| **12-share.css** | 315 | Export buttons | Share panel, export styling |
| **13-responsive.css** | 195 | Media queries | 520px, 768px, 700px breakpoints |
| **14-popup.css** | 51 | Modals | Manifesto popup, generic modal overlay |
| **15-search.css** | 67 | Search UI | Search input, results list |
| **16-content-types.css** | 82 | Block types | `.visual-card`, `.conduct-showcase`, `.highlight-gold` |

### Token System

```css
/* 01-tokens.css */
:root {
  --bg:     #0c0c0f;        /* Dark background */
  --card:   #151519;        /* Card background */
  --soft:   #9b9ba7;        /* Soft gray text */
  --gold:   #d7b26d;        /* Primary accent */
  --gold2:  #e8c87a;        /* Secondary accent */
  --line:   rgba(255,255,255,.06);    /* Borders */
  --text:   #f5f5f7;        /* Primary text */
  --purple: #1a1024;        /* Accent background */
}
```

**Usage**: Tokens referenced across all modules for consistency

### Responsive Design Strategy

**Breakpoints**: 520px (mobile), 700px (tablet), 768px (small desktop)

```css
/* Desktop-first approach: base styles apply to all sizes */

@media (max-width: 768px) {
  /* Adjust scripture card padding, verse font-size */
  .scripture-verse { font-size: 16px; }
}

@media (max-width: 520px) {
  /* Mobile reading comfort */
  .timeline-item.is-current {
    width: 100%;
    margin-left: 0;
    padding: 30px 20px 34px;
  }
  .timeline-marker { display: none; }
  
  /* Hide desktop-only elements */
}
```

**Key Pattern**: Hide timeline markers on mobile; expand content to full width for reading comfort

### "Correção v7" Pattern & !important Usage

**ISSUE IDENTIFIED** (see session memory):

The file `08-episode.css` contains **two conflicting definitions** of the same selectors:

1. **First definition** (~line 385): Larger sizes (initial design)
   ```css
   .reference-step { margin-bottom: 56px; }
   .reference-dot { width: 18px; height: 18px; }
   .reference-step-body { padding: 28px; }
   ```

2. **Second definition** (~line 2478): Smaller sizes with `!important` flags (Correção v7 — "adjustments requested")
   ```css
   .reference-step { margin-bottom: 34px !important; }
   .reference-dot { width: 10px !important; height: 10px !important; }
   .reference-step-body { padding: 22px !important; }
   ```

**Problem**: The `!important` flags **force the second definition** to win regardless of specificity, making changes to the first definition invisible.

**Why This Happened**: Appears to be a version control artifact — design was revised ("v7"), and instead of removing old code, a new section was added with `!important` to guarantee visibility.

### Visual Hierarchy Creation

**Premium Look Achieved Via**:

| Technique | CSS | Visual Effect |
|-----------|-----|---------------|
| **Backdrop Blur** | `backdrop-filter: blur(20px)` | Glassmorphic cards |
| **Gold Accents** | `color: var(--gold)` on labels/badges | Luxury feel |
| **Radial Gradients** | `radial-gradient(circle at 72% 24%, rgba(215, 178, 109, .14), ...)` | Subtle lighting effects |
| **Box Shadows** | `0 36px 84px rgba(0,0,0,.52)` | Depth & floating effect |
| **Serif Headlines** | `font-family: 'Playfair Display'` | Sophisticated typography |
| **Generous Spacing** | `padding: 60px 48px`, `margin-bottom: 56px` | Breathing room |
| **Smooth Transitions** | `transition: transform .4s ease` | Polished interactions |
| **Viewport-Relative Sizing** | `font-size: clamp(28px, 4vw, 52px)` | Responsive elegance |

### Media Query Coordination

**Pattern**: Each module references the same breakpoints:

```
520px → Mobile layout adjustments
700px → Desktop typography scaling
768px → Responsive utility tweaks
```

**Coordination Method**: Shared `13-responsive.css` sets media query policies, but each module (08, 09, 11, etc.) maintains its own responsive rules. This creates **potential fragmentation** if breakpoints drift.

---

## 3. DATA FLOW

### JSON Structure

```
data/
  seasons/
    marcos/
      meta.json (season metadata)
      episodes/
        1.json, 2.json, 3.json, 4.json
```

**meta.json**:
```json
{
  "id": "marcos",
  "title": "Marcos",
  "subtitle": "O Rei em Movimento",
  "episodes": [
    {
      "id": 1,
      "title": "Quem está sentado no trono?",
      "file": "data/seasons/marcos/episodes/1.json",
      "status": "available"
    }
  ]
}
```

**episodes/N.json**:
```json
{
  "id": 1,
  "title": "...",
  "scriptureHighlight": {
    "reference": "Marcos 1:1–15",
    "verse": "...",
    "fullText": "..."
  },
  "prepare": [
    {
      "type": "manifesto",
      "title": "Entenda a ideia principal",
      "content": ["...", "...", ...]
    }
  ],
  "conduct": [
    {
      "type": "story",
      "title": "...",
      "content": [...]
    }
  ]
}
```

### Data Transformation Pipeline

```
Fetch JSON
  ↓
buildSearchBlocksFromEpisode(episode)
  └─ Merges prepare + conduct into flat blocks[]
     Each block has: {label, title, type, content}
  ↓
renderExactEpisodeStep(item, index)
  └─ Maps to DOM: <article class="reference-step">
  └─ Applies content-specific HTML based on item.type
  ↓
DOM Rendering
  └─ User sees text, images, interactive elements
```

**Key**: No server-side transformation — all logic runs client-side post-fetch

### Caching & State

```javascript
/* AppState keeps episode in memory during session */
AppState.episode = episode  // Stays until user navigates away

/* No cache invalidation → user gets same episode until browser refresh */

/* localStorage persists separately */
Storage.getProgress()        // Loads on app init
Storage.saveProgress(...)    // Updates on completion
```

**Strategy**: Session memory (fast) + persistent storage (progress/notes)  
**Limitation**: No offline support; requires network for each season/episode load

---

## 4. CURRENT VISUAL APPROACH

### What Makes It Look Premium

#### Color Palette
- **Dark background** (#0c0c0f) → reduces eye strain, premium feel
- **Gold accents** (#d7b26d) → luxury, spirituality
- **Subtle whites** (#f5f5f7) → breathing room, not harsh
- **Card backgrounds** (#151519) → slight elevation from main background

#### Typography
- **Serif headlines** (Playfair Display): Sophisticated, editorial
- **Clean body** (Inter): Modern, readable
- **Responsive sizes**: `clamp(28px, 4vw, 52px)` adapts to screen

#### Spacing & Layout
- **Large margins**: `.container` max-width 540px with 22px padding
- **Breathing room**: 56px section padding, 28px card padding
- **Generous vertical rhythm**: `margin-bottom: 56px` for blocks

#### Effects & Interactions
- **Backdrop blur**: Cards feel layered, floating
- **Radial gradients**: Subtle lighting (gold glow at 72%, 24%)
- **Smooth shadows**: `0 36px 84px` creates depth
- **Hover effects**: Buttons scale, cards shift up 2px
- **Transitions**: `.4s ease` on transforms

#### Visual Hierarchy
1. **Hero section**: Full-width cinematic image with dark overlay
2. **Titles**: Large Playfair text (#f5f5f7)
3. **Scripture**: Blockquote with gold reference
4. **Content blocks**: Numbered steps with connecting lines
5. **Actions**: Gold buttons with glass backgrounds

### CSS Properties Creating Hierarchy

| Level | Element | Properties |
|-------|---------|------------|
| **L1: Hero** | `.episode-cinematic-hero` | `min-height: 70vh`, `background-size: cover`, gradient overlay |
| **L2: Titles** | `h1, h2` | `font-size: clamp(...)`, Playfair, white, 1.08 line-height |
| **L3: Sections** | `.section` | `padding: 56px 0`, centered container |
| **L4: Cards** | `.reference-step-body` | `.glass` + `padding: 28px`, shadow, border |
| **L5: Text** | `p, small` | Descending font-size, soft gray for secondary |

### Custom Fonts & Effects

```css
/* Fonts */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:...&family=Inter:...');

/* Key Effects */
backdrop-filter: blur(20px);              /* Glassmorphic */
background: radial-gradient(...);         /* Subtle lighting */
box-shadow: 0 36px 84px rgba(...);       /* Depth */
transition: transform .4s ease;           /* Smoothness */
```

**Animation**: `.viewFadeIn` — 450ms fade-in when switching views

---

## 5. TECHNICAL DEBT & ISSUES

### Broken Functionality

#### 1. **CSS Override Cascade Issue** ⚠️ CRITICAL
- **Location**: `css/modules/08-episode.css` line ~2478
- **Problem**: "Correção v7" section uses `!important` to override earlier definitions
- **Impact**: Any changes to first definition are invisible
- **Fix Required**: Remove `!important` or consolidate definitions
- **Status**: Documented in session memory

#### 2. **Search Requires Season Load**
- **Issue**: `performSearch()` reads from `AppState.season.episodes`
- **Impact**: User gets "Entre na temporada antes de pesquisar" if search called on home
- **Better**: Could cache all episodes on load, or fetch meta without requiring season entry

#### 3. **Dynamic Content Type** (Partial Implementation)
- **Location**: `episodes.js` line ~350
- **Issue**: Interactive decision flows ("escolha A ou B") have parsing logic that assumes specific text patterns
- **Risk**: If JSON format changes, parsing breaks silently

### Accessibility Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Missing ARIA labels on many buttons | Medium | Screen readers can't read purpose |
| `aria-hidden="true"` on decorative icons is good | — | ✓ Done correctly |
| No keyboard navigation for timeline | Medium | Tab users can't navigate blocks |
| Color-only indicators (e.g., gold badges) | Medium | Color-blind users miss meaning |
| No `alt` text fallback for lazy images | Low | Broken images are unlabeled |
| Font scaling not tested at extreme sizes | Low | Large text users may see overlap |

### Performance Bottlenecks

| Area | Issue | Impact |
|------|-------|--------|
| **Episode JSON files** | No pagination/lazy loading | Loading 1.json is fast; adding 20+ episodes would cause lag |
| **Search** | Re-fetches all episode JSON every search | N/A now (4 episodes), becomes problematic at scale |
| **Images** | `loading="lazy"` on carousel images | Good, but external Unsplash URLs add latency |
| **CSS file size** | `08-episode.css` = 3381 lines! | 27x larger than most modules; potential parse time impact |
| **No minification** | All CSS/JS unminified | Larger download than necessary |
| **LocalStorage** | No size limits checked | Prayers/notes could accumulate infinitely |

### Browser Compatibility

| Feature | Supported | Issue |
|---------|-----------|-------|
| CSS Grid | Yes | Used in timeline, no IE11 fallback |
| Backdrop Filter | Partial | Safari on iOS lacks support; falls back to solid |
| CSS Variables | Yes | IE11 doesn't support; entire theme breaks |
| Fetch API | Yes | No IE11 support |
| LocalStorage | Yes | All browsers |
| Smooth scroll behavior | Yes | Older Safari doesn't support smooth |
| Gradient text | Not used | N/A |

**Compatibility Target**: Likely modern browsers only (Chrome 80+, Firefox 75+, Safari 13+)

### Code Quality Issues

#### 1. **Global Function Namespace Pollution**
```javascript
// All functions exposed to window for HTML onclick handlers
<button onclick="openEpisode(1)">  <!-- openEpisode must be global -->

// 100+ functions in global scope; no module bundler
```

**Risk**: Name collisions, hard to refactor

#### 2. **No Error Handling for Missing Data**
```javascript
// If episode.prepare is undefined, code doesn't crash, but renders empty
const items = sectionType === 'conduct' ? (episode.conduct || []) : (episode.prepare || []);
```

**Risk**: Silent failures; user gets blank screen

#### 3. **Duplicate CSS**
```css
/* 03-layout.css defines .keywords twice with slightly different values */
.keywords {
  font-size: 10px;
  letter-spacing: .2em;
  ...
}
/* Later in same file */
.keywords {
  font-size: 10px;
  letter-spacing: .2em;  /* Same */
  line-height: 2;        /* Different from first (was missing) */
}
```

#### 4. **Backup Files in Production**
```
js-backup-final/
css-backup-final/
episodes-backup.js
episodes-clean-backup.js
```

**Risk**: Users might accidentally load old versions; clutters repo

#### 5. **Magic Numbers in CSS**
```css
.timeline-dot {
  width: 34px;   /* Where does 34px come from? */
  margin-top: 4px;  /* Why 4px? */
}
```

**Risk**: No documentation; hard to adjust responsively

#### 6. **No Build Process**
- All files served as-is
- No tree-shaking
- No minification
- No linting
- CSS modules load in order (relies on cascade)

### Potential Runtime Failures

| Scenario | Current Behavior | Risk |
|----------|------------------|------|
| Network error fetching episode JSON | Shows toast "Não foi possível..." | User can't access episode; no retry |
| Missing episode image | Fallback to error handler adds `.no-image` class | Page might look broken |
| Corrupted JSON (invalid format) | JSON.parse throws; logged to console | User sees blank screen; no error message |
| LocalStorage quota exceeded | savePrayers() fails silently | User loses prayer data without knowing |
| Episode with no "prepare" blocks | Renders empty "Prepare-se" section | Confusing UX |

### Observations

✅ **Strengths**:
- Clean separation of concerns (routing, state, rendering, persistence)
- Modular CSS architecture (16 modules, token system)
- Good mobile-first responsive approach
- Smooth animations and premium visual design
- Leader-friendly tools (notes, prayers)
- Search functionality implemented
- Accessibility baseline (ARIA where important)

⚠️ **Areas for Improvement**:
- Massive CSS file (08-episode.css needs refactoring)
- Global function namespace (needs module bundler)
- CSS override issues with `!important`
- Error handling inconsistent
- No offline support
- Performance not optimized for scale (100+ episodes)
- Browser compatibility edge cases (CSS variables, backdrop-filter)
- No build/deployment pipeline

---

## RECOMMENDATIONS

1. **Immediate**: Fix "Correção v7" CSS override issue (remove `!important`, consolidate definitions)
2. **Short-term**: Add error boundaries, improve error messages to users
3. **Medium-term**: Refactor `08-episode.css` into smaller modules; add build process (webpack/vite)
4. **Long-term**: Consider migration to React/Vue for scale (100+ episodes); add offline support

---

**Generated**: 2026-06-04  
**Last Updated**: From codebase analysis of `/workspaces/pontodevirada`
