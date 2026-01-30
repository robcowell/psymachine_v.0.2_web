# Psymachine v.0.2 — Web App (Heroku)

Once upon a time there was a coder/scener called [Arguru](https://en.wikipedia.org/wiki/Juan_Antonio_Arguelles_Rius). He developed many cool music tools, including NoiseTrekker - and this evolved into Renoise. Amongst other tools he wrote, was PsyMachine - a psytrance pattern generator for Renoise. Sadly, Arguru died in a car crash in 2007, but I've ported PsyMachine to a nodeJS web app now

Web version of Psymachine: generates Renoise pattern XML from notes, percents, and parameters. Same logic as the original C++/FLTK desktop app.

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

- **GET /** — Web UI
- **GET /api/preset/default** — Default preset (JSON)
- **POST /api/generate** — Body: JSON with all input fields; response: Renoise pattern XML

## Presets

- **Save preset**: downloads a `.json` file with current values.
- **Load preset**: upload a `.json` file or a legacy `.pmp` (line-by-line) file.

## Scale Finder

In the **Notes** panel, the Scale Finder lets you build note sets from key, mode, and chords instead of typing them by hand:

- **Key** — Sets the base note (e.g. C → C-4). Choose from the 12 chromatic roots.
- **Scale** — Choose a mode (e.g. Major, Harmonic Minor, Dorian); the scale notes are shown in a read-only field.
- **Chords** — A grid of chords (I through vii) valid in the current key and scale. Click a chord to **toggle** it; selected chords are highlighted. **Other notes** is filled with the **unique** set of note names from all selected chords (with octave -4). You can select multiple chords to combine their notes.

Manual entry in Base note and Other notes still works; the Scale Finder simply fills those fields so you can edit or mix with typed notes.

## Original app

The desktop app was C++/FLTK (Windows); this web app reimplements the same generator algorithm in Node/Express and a static frontend.
