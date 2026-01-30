# Psymachine v.0.2 — Web App (Heroku)

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

## Original app

The desktop app was C++/FLTK (Windows); this web app reimplements the same generator algorithm in Node/Express and a static frontend.
