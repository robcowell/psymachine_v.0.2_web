# Psymachine v.0.3 — Web App (Heroku)

Once upon a time there was a coder/scener called [Arguru](https://en.wikipedia.org/wiki/Juan_Antonio_Arguelles_Rius). He developed many cool music tools, including NoiseTrekker — and this evolved into Renoise. Amongst other tools he wrote was PsyMachine — a psytrance pattern generator for Renoise. Sadly, Arguru died in a car crash in 2007, but I've ported PsyMachine to a Node.js web app.

**v.0.3** evolves the original single-pattern melody generator into a **full composition engine**: multi-track, multi-pattern Renoise songs with bar-accurate arrangements, top-down motif composition, harmonic layers, and named instrument slots in exported `.xrns` files. **Lead only** mode still exports single-pattern clipboard XML (legacy Arguru workflow).

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 (or the port shown in the console; Heroku sets `PORT`).

## Deploy to Heroku

1. **From CLI**

   ```bash
   heroku create your-app-name
   git add . && git commit -m "Add web app" && git push heroku main
   heroku open
   ```

2. **From GitHub**

   - Push this repo to GitHub.
   - In [Heroku Dashboard](https://dashboard.heroku.com), New → Create new app.
   - Connect the GitHub repo and enable automatic deploys, or Deploy branch manually.
   - The app uses the `Procfile` (`web: node server.js`) and `package.json` (Node 18+).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Web UI |
| GET | `/api/preset/default` | Default preset (JSON) |
| GET | `/api/arrangements` | Arrangement templates (bar-based + legacy) |
| GET | `/api/arrangements/:id/timeline` | Section map (`?patternCount=`, `linesPerPattern=`, `lpb=`, `seed=`) |
| GET | `/api/composition/styles` | Bar-based style profiles (Progressive, Full-On) |
| GET | `/api/instruments` | Renoise slot placeholder names and hints |
| POST | `/api/generate` | Single lead track → Renoise clipboard XML |
| POST | `/api/generate/xrns` | Full song → `.xrns` binary download |
| POST | `/api/generate/xrns/info` | Song stats preview (tracks, duration, composition metadata) |
| POST | `/api/generate/song` | Legacy JSON (first-pattern clipboard XML + metadata) |

## Full song (.xrns)

**Full song** mode builds a complete Renoise project you can open directly in Renoise 3.4.x.

### Tracks (9 slots)

| Slot | Track | Role |
|------|-------|------|
| 0 | Lead / Melody | Main hook motif — sq/wavetable lead |
| 1 | Bass | Offbeat or rolling 16ths — root-led psy bass |
| 2 | Kick | Four-on-the-floor (C-4) |
| 3 | Snare / Clap | Lines 4, 12, 20… — every other kick at 4 LPB |
| 4 | Hi-Hats | 16ths + open accents (F#-4 / A#-4) |
| 5 | FX | Risers, impacts, sweeps |
| 6 | Perc / Crash | Phrase crashes, ride (off by default) |
| 7 | Counter Lead | Call-response answer — pluck / acid |
| 8 | Pad | Breakdown chords — atmosphere |

Each track can be toggled on/off and assigned a Renoise instrument slot. The downloaded `.xrns` includes **named instrument placeholders** (e.g. `Lead Synth - sq/wavetable hook`, `Bass - offbeat/rolling psy`) so you know what to load in each slot.

### Composition engine

Bar-based arrangements (**Progressive**, **Full-On**) use a top-down pipeline:

```
Track → Sections → Phrases → Motifs → Notes
```

- **Parent motif** — A 2-bar melodic DNA is generated first (contour → scale degrees → rhythm → notes). ~90% of lead material derives from this motif and its variants.
- **Motif family** — Transpositions, reversals, octave shifts, and rhythmic mutations of the parent motif across sections.
- **Phrase structure** — Phrases are built from motif cells with section-aware density.
- **Counter lead** — Harmonic complement that fills gaps in the main lead (real counterpoint, not a copy).
- **Chord engine** — Section chord progressions drive pad voicings and harmonic context.
- **Energy curve** — Each section has an energy level (0–100) that maps to per-track density and lead probability.
- **Section objectives** — Breakdowns, themes, climax, etc. control which layers are active.

After generation, the UI shows composition metadata: style, total bars, parent motif pitch sequence, motif family variants, and chord progression.

### Arrangements

**Bar-based (default)** — Fixed bar-count sections, seed-deterministic lengths:

- **Progressive Psytrance** — Intro → groove → development → themes → breakdown → climax → outro (~6–8 min, BPM 136–140, offbeat bass).
- **Full-On Psytrance** — DJ intro → groove → themes → breaks → peak → outro (~7–9 min, BPM 142–148, rolling bass).

Pattern count is derived automatically from the bar timeline when left blank. The section map in the UI shows energy levels per section.

**Legacy (pattern-fraction)** — Still available for older workflows:

- **Classic** — Intro → build → drop → breakdown → drop → outro
- **Minimal / Progressive** — Gradual layer addition
- **Single Loop** — All tracks at full density (good for 1-pattern loops)

Legacy arrangements use the original Arguru `generateMelodyCells` algorithm for the lead track.

### Groove rules

At **4 lines per beat** (LPB), bar-based songs enforce a consistent psytrance groove:

- **Kick** — Every quarter note (lines 0, 4, 8, 12…). Never randomly thinned when active.
- **Snare / clap** — Lines 4, 12, 20, 28… (beats 2 & 4, layered on every other kick).
- **Bass** — Offbeat or rolling 16ths depending on style; 16th push/tail when dense. Not randomly thinned when active.
- **Hi-hats** — 16th closed hats with open accents on offbeats.

Non-melodic tracks (kick, bass, drums, pads, chords) use **octave 4** note triggers; FX uses octave 5.

### Song parameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| BPM | 138 | Style profiles pick within range when using bar-based arrangements |
| LPB | 4 | Forced to 4 in bar-based mode and XRNS export |
| Lines per pattern | 64 | 4 bars at 4 LPB |
| Pattern count | auto | From bar timeline or target length in minutes |
| Target length | 7 min | Used when pattern count is empty |
| Bass style | offbeat | `offbeat`, `rolling`, or `staccato` |
| Seed | 0 | Same seed → same bar counts, motif, and patterns |

Song XML is built from modular XRNS templates (`lib/xrns/`) with doc_version 66.

Open the downloaded `psymachine-song.xrns` in Renoise and assign your instruments to slots 0–8.

For load testing: `node scripts/minimal-xrns.js` writes `templates/minimal-test.xrns` (1 pattern, kick only).

## Lead only

**Lead only** mode generates one pattern as Renoise clipboard XML — paste into an existing Renoise track. Uses the original Arguru cell-mutation algorithm with configurable note probabilities. No track names, no pattern sequence, no multi-track output.

## Presets

- **Save preset** — Downloads a `.json` file with current values.
- **Load preset** — Upload a `.json` file or a legacy `.pmp` (line-by-line) file.

## Scale Finder & chord picker

In the **Lead notes** panel:

- **Key** — Sets the base note (e.g. C → C-4). Choose from the 12 chromatic roots.
- **Scale** — Choose a mode (e.g. Major, Harmonic Minor, Dorian); scale notes are shown read-only.
- **Chords** — A grid of chords (I through vii) valid in the current key and scale. Click to toggle; selected chords fill **Other notes** with the unique note set (octave 4). Combine multiple chords to merge their notes.

Manual entry in Base note and Other notes still works alongside the picker.

## Project layout

```
lib/
  generator.js              # Original Arguru melody cell algorithm
  song-generator.js         # Full song orchestration
  bass-generator.js         # Offbeat / rolling / staccato bass
  drum-generator.js         # Kick, snare/clap, hi-hats, perc
  fx-generator.js           # FX hits and sparse accents
  music-theory.js           # Note pools, drum triggers, octave conventions
  instrument-presets.js     # Named Renoise slot placeholders
  arrangement.js            # Legacy pattern-fraction arrangements
  xrns/                     # Modular .xrns XML builder
  composition/              # Bar-based composition engine
    style-profiles.js       # Progressive / Full-On defaults
    arrangement-bars.js     # Bar-accurate section templates
    composition-context.js  # Shared pipeline state
    compose.js              # Top-down plan builder
    parent-motif.js         # Parent motif + motif family
    contour.js              # Melodic contour shapes
    phrase-structure.js     # Phrase assembly from motifs
    lead-generator.js       # Lead + counter lead rendering
    counterpoint.js         # Harmonic complement for lead2
    chord-engine.js         # Section chord progressions
    pad-generator.js        # Pad voicings from chords
    energy-curve.js         # Energy → density mapping
    section-objectives.js   # Per-section musical goals
public/                     # Static web UI
server.js                   # Express API
```

## Original app

The desktop app was C++/FLTK (Windows); this web app reimplements the same generator algorithm in Node/Express and a static frontend, extended with the composition engine described above.
