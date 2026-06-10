/** Write a tiny .xrns (1 pattern, kick only) for Renoise load testing. */
const fs = require('fs');
const path = require('path');
const { generateSongXrns } = require('../lib/song-generator');

const out = path.join(__dirname, '../templates/minimal-test.xrns');

generateSongXrns({
  patternCount: 1,
  linesPerPattern: 16,
  bpm: 145,
  lpb: 4,
  seed: 42,
  tracks: {
    lead: { enabled: false, instrument: '0' },
    bass: { enabled: false, instrument: '1' },
    kick: { enabled: true, instrument: '2' },
    snare: { enabled: false, instrument: '3' },
    hihat: { enabled: false, instrument: '4' },
    fx: { enabled: false, instrument: '5' },
    perc: { enabled: false, instrument: '6' }
  }
}).then((r) => {
  if (r.error) throw new Error(r.error);
  fs.writeFileSync(out, Buffer.from(r.xrnsBase64, 'base64'));
  console.log('Wrote', out, '(' + r.xrnsByteLength + ' bytes)');
});
