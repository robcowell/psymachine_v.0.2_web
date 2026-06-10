/**
 * Build a Renoise .xrns file (ZIP containing Song.xml).
 * Template parts derived from templates/Empty.xrns (Renoise 3.4.x, doc_version 66).
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { buildPatternTrackXml } = require('./pattern-lines');

const PARTS_DIR = path.join(__dirname, 'parts');
const TRACK_COLORS = [
  '206,39,196',
  '41,120,166',
  '41,166,80',
  '166,120,41',
  '120,41,166',
  '41,166,153',
  '166,41,120',
  '80,166,41'
];

let partsCache = null;

function loadParts() {
  if (partsCache) return partsCache;
  const read = (name) => fs.readFileSync(path.join(PARTS_DIR, name + '.xml'), 'utf8');
  partsCache = {
    head: read('head'),
    instrument: read('instrument'),
    sequencerTrack: read('sequencerTrack'),
    sequencerMaster: read('sequencerMaster'),
    sequencerSend: read('sequencerSend'),
    patternTrackEmpty: read('patternTrackEmpty'),
    patternMaster: read('patternMaster'),
    patternSend: read('patternSend'),
    tailAfterTracks: read('tailAfterTracks')
  };
  return partsCache;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function namedSequencerTrack(template, name, color) {
  return template
    .replace(/<Name>[^<]*<\/Name>/, `<Name>${escapeXml(name)}</Name>`)
    .replace(/<Color>[^<]*<\/Color>/, `<Color>${color}</Color>`);
}

function buildHead(parts, options) {
  const { bpm, lpb, songName, artist } = options;
  return parts.head
    .replace(/<BeatsPerMin>\d+<\/BeatsPerMin>/, `<BeatsPerMin>${bpm}</BeatsPerMin>`)
    .replace(/<LinesPerBeat>\d+<\/LinesPerBeat>/, `<LinesPerBeat>${lpb}</LinesPerBeat>`)
    .replace(/<SongName>[^<]*<\/SongName>/, `<SongName>${escapeXml(songName || 'Psymachine Song')}</SongName>`)
    .replace(/<Artist>[^<]*<\/Artist>/, `<Artist>${escapeXml(artist || 'Psymachine v.0.3')}</Artist>`);
}

function namedInstrument(template, name, bpm) {
  let inst = template.replace(
    /<BeatsPerMin>\d+<\/BeatsPerMin>/g,
    `<BeatsPerMin>${bpm}</BeatsPerMin>`
  );
  const nameTag = `<Name>${escapeXml(name)}</Name>`;
  // Instrument display name must sit after SelectedPresetIsModified (not inside Macro nodes).
  if (
    /<SelectedPresetIsModified>(?:true|false)<\/SelectedPresetIsModified>\s*<Name>[^<]*<\/Name>/.test(inst)
  ) {
    inst = inst.replace(
      /(<SelectedPresetIsModified>(?:true|false)<\/SelectedPresetIsModified>\s*)<Name>[^<]*<\/Name>/,
      `$1${nameTag}`
    );
  } else {
    inst = inst.replace(
      /(<SelectedPresetIsModified>)(?:true|false)(<\/SelectedPresetIsModified>)/,
      `$1true$2\n      ${nameTag}`
    );
  }
  return inst;
}

function buildInstruments(parts, instrumentCount, bpm, slotNames = {}) {
  const count = Math.max(1, instrumentCount);
  const blocks = [];
  for (let i = 0; i < count; i++) {
    const label = slotNames[i] || `Instrument ${i + 1}`;
    blocks.push(namedInstrument(parts.instrument, label, bpm));
  }
  return `  <Instruments>\n${blocks.join('\n')}\n  </Instruments>`;
}

function buildSequencerTracks(parts, tracks) {
  return tracks.map((t, i) =>
    namedSequencerTrack(parts.sequencerTrack, t.name, TRACK_COLORS[i % TRACK_COLORS.length])
  ).join('\n');
}

function buildPatternXml(parts, linesPerPattern, tracks, patternTracks) {
  const patternTrackXml = tracks.map((t, i) =>
    buildPatternTrackXml(patternTracks[i].cells, t.instrument, parts.patternTrackEmpty)
  ).join('\n');

  return `      <Pattern>
        <NumberOfLines>${linesPerPattern}</NumberOfLines>
        <Tracks>
${patternTrackXml}
          ${parts.patternMaster.trim()}
          ${parts.patternSend.trim()}
        </Tracks>
      </Pattern>`;
}

function buildPatternPool(parts, linesPerPattern, tracks, patterns) {
  const patternBlocks = patterns.map((patternTracks) =>
    buildPatternXml(parts, linesPerPattern, tracks, patternTracks)
  );
  return `  <PatternPool>
    <HighliteStep>0</HighliteStep>
    <DefaultPatternLength>${linesPerPattern}</DefaultPatternLength>
    <Patterns>
${patternBlocks.join('\n')}
    </Patterns>
  </PatternPool>`;
}

function buildPatternSequence(patternCount, sectionNames) {
  const entries = [];
  for (let i = 0; i < patternCount; i++) {
    const section = sectionNames[i] || '';
    const isStart = i > 0 && section && section !== sectionNames[i - 1];
    entries.push(`      <SequenceEntry>
        <Pattern>${i}</Pattern>
        <IsSectionStart>${isStart ? 'true' : 'false'}</IsSectionStart>
        <SectionName>${escapeXml(section || 'Section')}</SectionName>
      </SequenceEntry>`);
  }
  return `  <PatternSequence>
    <CurrentPosition>0</CurrentPosition>
    <SequenceEntries>
${entries.join('\n')}
    </SequenceEntries>
    <SequenceSelection>
      <CursorPos>-1</CursorPos>
      <RangePos>-1</RangePos>
    </SequenceSelection>
    <LoopSelection>
      <CursorPos>-1</CursorPos>
      <RangePos>-1</RangePos>
    </LoopSelection>
    <PatternNameWidth>0</PatternNameWidth>
    <PatternMatrixWidth>248</PatternMatrixWidth>
    <PatternSlotHeight>30</PatternSlotHeight>
    <PatternSlotWidth>24</PatternSlotWidth>
    <HighliteStep>2</HighliteStep>
    <HighliteOffset>0</HighliteOffset>
    <KeepSequenceSorted>true</KeepSequenceSorted>
  </PatternSequence>
  <LastSoloedOutMode>Active</LastSoloedOutMode>
</RenoiseSong>`;
}

/**
 * @param {Object} project
 * @param {Object[]} project.tracks - { name, instrument }
 * @param {Object[][]} project.patterns - per-pattern array of { cells } aligned to tracks
 * @param {number} project.linesPerPattern
 * @param {number} project.bpm
 * @param {number} project.lpb
 * @param {string[]} [project.sectionNames]
 * @param {string} [project.songName]
 * @returns {Promise<Buffer>}
 */
async function buildXrns(project) {
  const parts = loadParts();
  const {
    tracks,
    patterns,
    linesPerPattern,
    bpm = 145,
    lpb = 4,
    sectionNames = [],
    songName,
    instrumentSlotNames = {}
  } = project;

  if (!tracks?.length || !patterns?.length) {
    throw new Error('XRNS requires at least one track and one pattern.');
  }

  let maxInst = 0;
  tracks.forEach(t => {
    const n = parseInt(t.instrument, 10);
    if (Number.isFinite(n)) maxInst = Math.max(maxInst, n);
  });
  const slotKeys = Object.keys(instrumentSlotNames).map(Number).filter(n => Number.isFinite(n));
  const instrumentCount = Math.max(maxInst + 1, slotKeys.length ? Math.max(...slotKeys) + 1 : 1);

  let xml = buildHead(parts, { bpm, lpb, songName });
  xml += '\n' + buildInstruments(parts, instrumentCount, bpm, instrumentSlotNames);
  xml += '\n  <SelectedInstrumentIndex>0</SelectedInstrumentIndex>\n  <Tracks>\n';
  xml += buildSequencerTracks(parts, tracks);
  xml += '\n    ' + parts.sequencerMaster.trim() + '\n';
  xml += '    ' + parts.sequencerSend.trim() + '\n';
  xml += parts.tailAfterTracks + '\n';
  xml += buildPatternPool(parts, linesPerPattern, tracks, patterns) + '\n';
  xml += buildPatternSequence(patterns.length, sectionNames);

  const zip = new JSZip();
  zip.file('Song.xml', xml);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { buildXrns, loadParts };
