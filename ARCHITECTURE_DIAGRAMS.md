# Visual Architecture Diagrams

## Component Interaction Flow

```mermaid
graph TD
    A["User at Home"] -->|"Click: Entrar na Temporada"| B["loadSeason<br/>meta.json"]
    B -->|"Parse JSON"| C["setSeason<br/>AppState.season"]
    C -->|"Render cards"| D["buildEpisodeList"]
    D -->|"Show season-view"| E["Season View<br/>4 Episode Cards"]
    
    E -->|"Click Episode"| F["openEpisode<br/>episodes/N.json"]
    F -->|"Parse JSON"| G["setEpisode<br/>AppState.episode"]
    G -->|"buildSearchBlocks"| H["Create searchable blocks"]
    H -->|"Render hero+hub"| I["renderEpisodeHome"]
    I -->|"Show episode-view"| J["Episode Hub<br/>2 Main Buttons"]
    
    J -->|"Click Prepare-se"| K["openEpisodeSection<br/>prepare"]
    K -->|"Iterate prepare[]"| L["renderExactEpisodeStep"]
    L -->|"Content-aware HTML"| M["renderExactStepContent"]
    M -->|"Body.classList:<br/>episode-reading-active"| N["Reading View<br/>Timeline + Navigation"]
    
    N -->|"Save progress"| O["Storage.saveProgress"]
    N -->|"Add prayer"| P["Storage.savePrayers"]
    N -->|"Write notes"| Q["Storage.saveNotes"]
    
    O & P & Q -->|"localStorage"| R["LocalStorage<br/>Persistence"]
    R -->|"Load on init"| S["Re-populate fields<br/>Next session"]
```

## Module Dependency Tree

```mermaid
graph LR
    HTML["index.html<br/>HTML5 Structure"]
    
    subgraph CSS["CSS Modules"]
        T01["01-tokens<br/>Variables"]
        T02["02-reset<br/>Global Reset"]
        T03["03-layout<br/>Containers"]
        T04["04-buttons"]
        T05["05-header"]
        T06["06-home"]
        T07["07-season"]
        T08["08-episode<br/>⚠️ 3381 lines"]
        T09["09-timeline"]
        T10["10-scripture"]
        T11["11-leader-tools"]
        T12["12-share"]
        T13["13-responsive<br/>Media queries"]
        T14["14-popup"]
        T15["15-search"]
        T16["16-content-types"]
    end
    
    subgraph JS["JavaScript"]
        NAV["navigation.js<br/>View routing"]
        EPI["episodes.js<br/>Main rendering"]
        SEA["search.js<br/>Text search"]
        STO["storage.js<br/>LocalStorage"]
        
        subgraph MOD["Modules/"]
            AS["app-state.js<br/>State container"]
            TL["timeline.js<br/>Navigation"]
            LT["leader-tools.js<br/>UI"]
            SC["scripture.js<br/>Bible display"]
            SH["share.js<br/>Export"]
        end
    end
    
    HTML --> CSS
    HTML --> JS
    
    NAV -->|"Switch views"| EPI
    EPI -->|"Search index"| SEA
    EPI -->|"Load/save"| STO
    EPI -->|"Global state"| AS
    EPI -->|"Block navigation"| TL
    EPI -->|"Render tools"| LT
    EPI -->|"Scripture modal"| SC
    EPI -->|"Export episode"| SH
    
    T01 -->|"Theme tokens"| T02 & T03 & T04
    T02 -->|"Box-sizing, reset"| T03 & T06 & T07
    T03 -->|"Container, layout"| T06 & T07 & T08 & T11
    
    style T08 fill:#ffcccc
    style EPI fill:#ccffcc
```

## Data Flow: JSON to DOM

```mermaid
graph TD
    J1["meta.json<br/>Season metadata<br/>episodes: [{id, title, file, status}]"]
    J2["episodes/1.json<br/>Prepare section<br/>Conduct section"]
    
    J1 -->|"fetchJson"| P1["parseJSON"]
    P1 -->|"setSeason"| S1["AppState.season"]
    S1 -->|"buildEpisodeList"| D1["Episode cards<br/>DOM rendered"]
    
    J2 -->|"fetchJson"| P2["parseJSON"]
    P2 -->|"setEpisode"| S2["AppState.episode"]
    P2 -->|"buildSearchBlocks"| S3["AppState.blocks"]
    
    S2 -->|"renderEpisodeHome"| D2["Hero + Hub<br/>Leader launchers"]
    S2 -->|"openEpisodeSection"| P3["Iterate blocks"]
    P3 -->|"renderExactStepContent<br/>Check block.type"| P4["Content routing"]
    
    P4 -->|"type=scripture"| C1["Scripture card<br/>+ modal"]
    P4 -->|"type=reflection"| C2["Text flow<br/>+ carousel"]
    P4 -->|"type=story"| C3["Text flow<br/>+ notes widget"]
    P4 -->|"type=dynamic"| C4["Interactive<br/>choice"]
    
    C1 & C2 & C3 & C4 -->|"Append to DOM"| D3["Reading view<br/>Timeline visible"]
    
    D3 -->|"User saves"| ST["Storage.saveNotes"]
    ST -->|"JSON.stringify"| LS["localStorage"]
    LS -->|"Persist"| F["Next session"]
```

## Responsive Design Breakpoints

```mermaid
graph LR
    BASE["Desktop<br/>Base styles<br/>max-width: 540px"]
    
    BASE -->|"@media max-width: 768px"| B768["Tablet<br/>Adjust font-size<br/>Reduce padding"]
    B768 -->|"@media max-width: 700px"| B700["Small Desktop<br/>Scale typography<br/>clamp()"]
    B700 -->|"@media max-width: 520px"| B520["Mobile<br/>Hide timeline markers<br/>Full-width content<br/>Reading comfort"]
    
    B520 --> M1["Hide: .timeline-marker"]
    B520 --> M2["Full-width:<br/>.timeline-item.is-current"]
    B520 --> M3["Padding: 30px 20px<br/>Reading view"]
    B520 --> M4["Touch-friendly sizes"]
    
    style B520 fill:#ffffcc
```

## CSS Override Problem: Correção v7

```
File: 08-episode.css

Line ~385 (Initial Design):
────────────────────────────
.reference-step {
  margin-bottom: 56px;
}
.reference-dot {
  width: 18px;
  height: 18px;
  box-shadow: 0 0 0 12px ...;
}
.reference-step-body:not(.no-card) {
  padding: 28px;
}
                ↓ (Later in file)
                
Line ~2478 (Correção v7):
────────────────────────────
/* Correção v7 — ajustes solicitados... */

.reference-step {
  margin-bottom: 34px !important;  ← WINS (smaller spacing)
}
.reference-dot {
  width: 10px !important;           ← WINS (smaller dot)
  height: 10px !important;
}
.reference-step-body:not(.no-card) {
  padding: 22px !important;         ← WINS (tighter padding)
}

RESULT: Second definition wins due to !important
        → First definition is invisible/useless
        → Cascade broken by `!important` flags
```

## Error Handling Gaps

```mermaid
graph TD
    A["User Action"]
    A -->|"loadSeason<br/>meta.json"| B{Network OK?}
    B -->|"No"| C["console.error<br/>Show toast<br/>No retry"]
    B -->|"Yes"| D["Parse JSON"]
    D -->|"Invalid format"| E["JSON.parse throws<br/>Caught, logged<br/>User sees blank"]
    D -->|"Valid"| F["Render normal"]
    
    G["Storage.savePrayers"]
    G -->|"LocalStorage full"| H["Silent failure<br/>User loses data"]
    
    I["Search term typed"]
    I -->|"No season loaded"| J["Search disabled<br/>Message shown"]
    I -->|"Season loaded"| K["Search works"]
    
    style C fill:#ffcccc
    style E fill:#ffcccc
    style H fill:#ffcccc
```

## State Management: AppState

```javascript
┌─────────────────────────────┐
│      AppState (Global)      │
│                             │
│ season: null                │ ← Current season metadata
│   .id, .title, .episodes[]  │
│                             │
│ episode: null               │ ← Current full episode
│   .id, .title, .prepare[]   │
│   .conduct[], .scripture    │
│                             │
│ scripture: null             │ ← Current verse highlight
│   .reference, .verse        │
│                             │
│ timeline: { current: 0 }    │ ← Position in reading
│                             │
└─────────────────────────────┘
       ↑           ↓
   Setters:   Getters:
   setSeason renderEpisodeHome
   setEpisode openEpisodeSection
   setScripture buildSearchBlocks
```

---

**Diagrams generated**: 2026-06-04
