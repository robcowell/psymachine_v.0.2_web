const path = require('path');
const express = require('express');
const { generate } = require('./lib/generator');

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
  trackLen: '256',
  arpeggioLen: '64',
  instrumentNumber: '0',
  ticksPerBeat: '8',
  seed: '0',
  noteOffOnBeat: false,
  noteOnFirstTick: false
};

// GET /api/preset/default - default preset for new sessions
app.get('/api/preset/default', (req, res) => {
  res.json(defaultPreset);
});

// POST /api/generate - generate Renoise XML from params
app.post('/api/generate', (req, res) => {
  const body = req.body || {};
  const params = {
    baseNote: body.baseNote ?? defaultPreset.baseNote,
    otherNotes: body.otherNotes ?? defaultPreset.otherNotes,
    baseNoteP: body.baseNoteP ?? defaultPreset.baseNoteP,
    otherNotesP: body.otherNotesP ?? defaultPreset.otherNotesP,
    removeNoteP: body.removeNoteP ?? defaultPreset.removeNoteP,
    addNoteP: body.addNoteP ?? defaultPreset.addNoteP,
    changeNoteP: body.changeNoteP ?? defaultPreset.changeNoteP,
    noteOffP: body.noteOffP ?? defaultPreset.noteOffP,
    noteOffVariationP: body.noteOffVariationP ?? defaultPreset.noteOffVariationP,
    noteFlutterP: body.noteFlutterP ?? defaultPreset.noteFlutterP,
    trackLen: body.trackLen ?? defaultPreset.trackLen,
    arpeggioLen: body.arpeggioLen ?? defaultPreset.arpeggioLen,
    instrumentNumber: body.instrumentNumber ?? defaultPreset.instrumentNumber,
    ticksPerBeat: body.ticksPerBeat ?? defaultPreset.ticksPerBeat,
    seed: body.seed ?? defaultPreset.seed,
    noteOffOnBeat: Boolean(body.noteOffOnBeat),
    noteOnFirstTick: Boolean(body.noteOnFirstTick)
  };
  const result = generate(params);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.type('application/xml').send(result.xml);
});

// SPA fallback: serve index.html for non-API GET routes (e.g. /generate)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Psymachine web app listening on port ${PORT}`);
});
