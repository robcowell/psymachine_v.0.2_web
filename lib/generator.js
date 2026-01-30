/**
 * Psymachine generator logic - ported from C++ (generator.cpp)
 * Generates Renoise pattern XML from note/percent/parameter inputs.
 */

// Parameter indices (from parameterindex.h)
const iBaseNote = 0, iOtherNotes = 1, maxNoteInputFields = 2;
const iBaseNoteP = 0, iOtherNotesP = 1, iRemoveNoteP = 2, iAddNoteP = 3, iChangeNoteP = 4,
  iNoteOffP = 5, iNoteOffVariationP = 6, iNoteFlutterP = 7, maxPercentsInputFields = 8;
const iTrackLen = 0, iArpeggioLen = 1, iInstrumentNumber = 2, iTicksPerBeat = 3, iSeed = 4, maxOtherVarInputFields = 5;
const iNoteOffOnBeat = 5, iNoteOnFirstTick = 6, iCheckButtonEnd = 7;

function superTrim(input) {
  if (!input || typeof input !== 'string') return '';
  let startPos = 0;
  while (startPos < input.length && input[startPos] === ' ') startPos++;
  let endPos = input.length - 1;
  while (endPos > startPos && input[endPos] === ' ') endPos--;
  endPos++;
  let temp = '';
  for (let a = startPos; a < endPos; a++) {
    temp += input[a];
    if (input[a] === ' ') {
      a++;
      while (a < endPos && input[a] === ' ') a++;
      a--;
    }
  }
  return temp;
}

function randomPercent(percent, rng) {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return (rng() * 100 | 0) + 1 <= percent;
}

function parseNotes(input) {
  const trimmed = superTrim(input);
  if (trimmed.length === 0) return [];
  return trimmed.split(/\s+/).map(s => s.toUpperCase()).filter(Boolean);
}

/**
 * Build a seeded RNG (simple LCG)
 */
function seededRandom(seed) {
  let s = Math.imul(seed, 1) || 0;
  if (s <= 0) s = (Date.now() & 0x7fffffff);
  return function () {
    s = Math.imul(48271, s) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

/**
 * @param {Object} params - All input params (notes, percents, otherVar, checkboxes)
 * @returns {{ xml: string, error?: string }}
 */
function generate(params) {
  const {
    baseNote,
    otherNotes,
    baseNoteP, otherNotesP, removeNoteP, addNoteP, changeNoteP,
    noteOffP, noteOffVariationP, noteFlutterP,
    trackLen, arpeggioLen, instrumentNumber, ticksPerBeat, seed,
    noteOffOnBeat, noteOnFirstTick
  } = params;

  const notesStr = (baseNote || '').trim() + ' ' + (otherNotes || '').trim();
  const notes = parseNotes(notesStr);
  if (notes.length === 0) return { error: 'Base note is required.' };

  const percents = [
    parseInt(baseNoteP, 10) || 0,
    parseInt(otherNotesP, 10) || 0,
    parseInt(removeNoteP, 10) || 0,
    parseInt(addNoteP, 10) || 0,
    parseInt(changeNoteP, 10) || 0,
    parseInt(noteOffP, 10) || 0,
    parseInt(noteOffVariationP, 10) || 0,
    parseInt(noteFlutterP, 10) || 0
  ];

  let trackLength = parseInt(trackLen, 10) || 256;
  let arpLen = parseInt(arpeggioLen, 10) || 64;
  const instNum = String(instrumentNumber ?? '0').trim();
  let ticksPerB = parseInt(ticksPerBeat, 10) || 8;
  const seedVal = parseInt(seed, 10) || 0;

  if (arpLen > trackLength) arpLen = trackLength;
  if (ticksPerB < 1) ticksPerB = 1;

  const noteTickAdd = Math.max(1, Math.floor(ticksPerB / 4));
  const maxNotes = notes.length;
  const rng = seededRandom(seedVal);

  const track = Array(trackLength).fill('');

  function genRandomNote(trackPos) {
    if ((rng() * 2 | 0) === 0) {
      if (randomPercent(percents[iBaseNoteP], rng)) track[trackPos] = notes[0];
      else if (randomPercent(percents[iOtherNotesP], rng)) track[trackPos] = notes[(rng() * (maxNotes - 1) | 0) + 1];
    } else {
      if (randomPercent(percents[iOtherNotesP], rng)) track[trackPos] = notes[(rng() * (maxNotes - 1) | 0) + 1];
      else if (randomPercent(percents[iBaseNoteP], rng)) track[trackPos] = notes[0];
    }
  }

  function forceGenRandomNote(trackPos) {
    if ((rng() * 2 | 0) === 0) {
      if (randomPercent(percents[iBaseNoteP], rng)) track[trackPos] = notes[0];
      else track[trackPos] = notes[(rng() * (maxNotes - 1) | 0) + 1];
    } else {
      if (randomPercent(percents[iOtherNotesP], rng)) track[trackPos] = notes[(rng() * (maxNotes - 1) | 0) + 1];
      else track[trackPos] = notes[0];
    }
  }

  // noteOnFirstTick
  forceGenRandomNote(0);
  if (!noteOnFirstTick) track[0] = '';

  // randomizeArpeggioNotes
  for (let a = 0; a < arpLen; a += noteTickAdd) genRandomNote(a);

  // randomizeNoteOffs
  for (let a = 0; a < arpLen; a++) {
    if (track[a] === '' && randomPercent(percents[iNoteOffP], rng)) track[a] = 'OFF';
  }

  // copyArpeggioToWholeTrack
  for (let a = arpLen, b = 0; a < trackLength; a++, b++) track[a] = track[b];

  // randomizeVariations
  for (let a = arpLen; a < trackLength; a += noteTickAdd) {
    if (track[a] !== '' && track[a] !== 'OFF') {
      if (randomPercent(percents[iChangeNoteP], rng)) forceGenRandomNote(a);
      if (randomPercent(percents[iRemoveNoteP], rng)) track[a] = '';
    } else if (randomPercent(percents[iAddNoteP], rng)) forceGenRandomNote(a);
  }
  for (let a = arpLen; a < trackLength; a++) {
    if (track[a] === '' && randomPercent(percents[iNoteOffVariationP], rng)) track[a] = 'OFF';
  }

  // randomizeNoteFlutter
  if (percents[iNoteFlutterP] !== 0) {
    let b = percents[iNoteFlutterP];
    let c = (rng() * maxNotes | 0);
    for (let a = 0; a < trackLength; a += noteTickAdd) {
      if (randomPercent(b, rng)) {
        if ((rng() * 2 | 0) === 0) {
          track[a] = notes[c];
          b = 100;
          if (c >= (rng() * maxNotes | 0) + 2) { b = 50; c = (rng() * maxNotes | 0); }
          c++; if (c === maxNotes) c = maxNotes - 1;
        } else {
          track[a] = notes[c];
          b = 100;
          if (c <= (rng() * maxNotes | 0) - 2) { b = 50; c = (rng() * maxNotes | 0); }
          c--; if (c < 0) c = 0;
        }
      }
    }
  }

  // noteOffOnBeat
  if (noteOffOnBeat) {
    for (let a = 0; a < trackLength; a += ticksPerB) track[a] = 'OFF';
  }

  // deleteUselessNoteOffs
  for (let a = 0; a < trackLength; a++) {
    if (track[a] === 'OFF') {
      for (;;) {
        a++;
        if (a >= trackLength) break;
        if (track[a] === 'OFF' || track[a] === '') track[a] = '';
        else break;
      }
    }
  }

  // Build Renoise XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<PatternClipboard.BlockBuffer doc_version="0">\n';
  xml += '<TrackColumns>\n<TrackColumn>\n<TrackColumn>\n<Lines>\n';
  for (let a = 0; a < trackLength; a++) {
    if (track[a] === '') {
      xml += '<Line index="' + a + '"/>\n';
    } else {
      xml += '<Line index="' + a + '">\n<NoteColumns>\n<NoteColumn>\n';
      xml += '<Note>' + track[a] + '</Note>\n';
      if (track[a] !== 'OFF') xml += '<Instrument>' + instNum + '</Instrument>\n';
      xml += '</NoteColumn>\n</NoteColumns>\n</Line>\n';
    }
  }
  xml += '</Lines><ColumnType>NoteColumn</ColumnType>\n</TrackColumn>\n</TrackColumn>\n</TrackColumns>\n</PatternClipboard.BlockBuffer>\n';
  return { xml };
}

module.exports = { generate, parseNotes, superTrim };
