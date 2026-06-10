const path = require('path');
const express = require('express');
const { generate } = require('./lib/generator');
const { generateSong, generateSongXrns, listArrangements } = require('./lib/song-generator');
const { getSectionTimeline } = require('./lib/arrangement');
const { listStyles, isBarBasedStyle, getBarSectionTimeline, energyToTrackDensities } = require('./lib/composition');
const { createCompositionContext } = require('./lib/composition/composition-context');
const { listInstrumentPresets } = require('./lib/instrument-presets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default preset (matches original .pmp defaults)
const defaultPreset = {
  baseNote: 'E-4',
  otherNotes: 'F-4 A-4 B-4 E-5 F-5 A-5 B-5 E-6',
  baseNoteP: '40',
  otherNotesP: '50',
  removeNoteP: '5',
  addNoteP: '20',
  changeNoteP: '20',
  noteOffP: '40',
  noteOffVariationP: '20',
  noteFlutterP: '20',
  trackLen: '64',
  arpeggioLen: '16',
  instrumentNumber: '0',
  ticksPerBeat: '4',
  seed: '0',
  noteOffOnBeat: false,
  noteOnFirstTick: false
};

const defaultSongPreset = {
  ...defaultPreset,
  mode: 'song',
  linesPerPattern: '64',
  trackLen: '64',
  patternCount: '',
  songMinutes: '7',
  bpm: '138',
  lpb: '4',
  arpeggioLen: '16',
  scaleKey: 'E',
  scaleMode: '12',
  arrangement: 'progressive',
  bassStyle: 'offbeat',
  bassVariationP: '25',
  openHatP: '25',
  hatSkipP: '12',
  snareRollP: '30',
  useClap: true,
  melodyOctave: '4',
  tracks: {
    lead: { enabled: true, instrument: '0' },
    lead2: { enabled: true, instrument: '7' },
    pad: { enabled: true, instrument: '8' },
    bass: { enabled: true, instrument: '1' },
    kick: { enabled: true, instrument: '2' },
    snare: { enabled: true, instrument: '3' },
    hihat: { enabled: true, instrument: '4' },
    fx: { enabled: true, instrument: '5' },
    perc: { enabled: false, instrument: '6' }
  }
};

function mergePreset(body, base) {
  const params = { ...base };
  for (const key of Object.keys(base)) {
    if (body[key] !== undefined) params[key] = body[key];
  }
  if (body.tracks) params.tracks = { ...base.tracks, ...body.tracks };
  return params;
}

// GET /api/preset/default - default preset for new sessions
app.get('/api/preset/default', (req, res) => {
  res.json(defaultSongPreset);
});

// GET /api/arrangements - list psytrance arrangement templates
app.get('/api/arrangements', (req, res) => {
  res.json(listArrangements());
});

// GET /api/composition/styles - bar-based style profiles
app.get('/api/composition/styles', (req, res) => {
  res.json(listStyles());
});

// GET /api/instruments - Renoise slot placeholder names
app.get('/api/instruments', (req, res) => {
  res.json(listInstrumentPresets());
});

// GET /api/arrangements/:id/timeline?patternCount=32&linesPerPattern=64&lpb=8&seed=0
app.get('/api/arrangements/:id/timeline', (req, res) => {
  const arrangementId = req.params.id;
  const linesPerPattern = parseInt(req.query.linesPerPattern, 10) || 64;
  const lpb = parseInt(req.query.lpb, 10) || 4;
  const seed = parseInt(req.query.seed, 10) || 0;
  let patternCount = parseInt(req.query.patternCount, 10) || parseInt(req.query.trackLen, 10);

  if (isBarBasedStyle(arrangementId)) {
    const ctx = createCompositionContext({
      arrangement: arrangementId,
      seed,
      linesPerPattern,
      lpb,
      patternCount: Number.isFinite(patternCount) ? patternCount : undefined
    });
    const timeline = getBarSectionTimeline(
      arrangementId,
      ctx.patternCount,
      linesPerPattern,
      lpb,
      seed,
      energyToTrackDensities
    );
    return res.json({ timeline, patternCount: ctx.patternCount, totalBars: ctx.barTimeline?.totalBars });
  }

  const count = patternCount || 32;
  res.json({ timeline: getSectionTimeline(arrangementId, count), patternCount: count });
});

// POST /api/generate - generate single-track Renoise XML (legacy)
app.post('/api/generate', (req, res) => {
  const body = req.body || {};
  const params = mergePreset(body, defaultPreset);
  const result = generate(params);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.type('application/xml').send(result.xml);
});

// POST /api/generate/song - generate multi-track song (metadata + optional clipboard XML)
app.post('/api/generate/song', (req, res) => {
  const body = req.body || {};
  const params = mergePreset(body, defaultSongPreset);
  const result = generateSong(params);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({
    xml: result.xml,
    tracks: result.tracks,
    timeline: result.timeline,
    key: result.key,
    scaleIdx: result.scaleIdx,
    patternCount: result.patternCount,
    durationFormatted: result.durationFormatted
  });
});

// POST /api/generate/xrns - full Renoise song file (.xrns)
app.post('/api/generate/xrns', async (req, res) => {
  try {
    const body = req.body || {};
    const params = mergePreset(body, defaultSongPreset);
    const result = await generateSongXrns(params);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    const buffer = Buffer.from(result.xrnsBase64, 'base64');
    const filename = 'psymachine-song.xrns';
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Psymachine-Pattern-Count', String(result.patternCount));
    res.setHeader('X-Psymachine-Duration', result.durationFormatted);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message || 'XRNS generation failed.' });
  }
});

// POST /api/generate/xrns/info - preview song stats without downloading
app.post('/api/generate/xrns/info', async (req, res) => {
  const body = req.body || {};
  const params = mergePreset(body, defaultSongPreset);
  const { generateSongProject } = require('./lib/song-generator');
  const result = generateSongProject(params);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.json({
    tracks: result.tracks,
    timeline: result.timeline,
    patternCount: result.patternCount,
    linesPerPattern: result.linesPerPattern,
    bpm: result.bpm,
    lpb: result.lpb,
    durationFormatted: result.durationFormatted,
    durationSeconds: result.durationSeconds,
    sectionNames: [...new Set(result.sectionNames)],
    key: result.key,
    scaleIdx: result.scaleIdx,
    composition: result.composition
  });
});

// SPA fallback: serve index.html for non-API GET routes (e.g. /generate)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Psymachine web app listening on port ${PORT}`);
});
