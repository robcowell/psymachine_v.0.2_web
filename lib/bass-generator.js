/**
 * Psytrance bassline generators — archetype-driven and legacy style fallbacks.
 */

const { randomPercent } = require('./rng');
const { getArchetype } = require('./pattern-archetypes/registry');
const { sixteenthToLine, barLineCount } = require('./pattern-archetypes/encode');
const { applyPatternEvolution } = require('./pattern-archetypes/evolver');
const { getBassArchetypeId } = require('./pattern-archetypes/compositor');
const { getChordAtBar } = require('./composition/chord-engine');
const { BASS_OCTAVE } = require('./music-theory');

function emptyTrack(len) {
  return Array(len).fill('');
}

/** Map chord-engine voicing to bass-register root / fifth / passing pool. */
function noteAtBassOctave(noteToken) {
  const m = String(noteToken).trim().match(/^([A-G]#?)-?(\d+)$/);
  if (!m) return noteToken;
  return m[1].length === 1 ? `${m[1]}-${BASS_OCTAVE}` : `${m[1]}${BASS_OCTAVE}`;
}

function chordToBassPool(chord) {
  const withOct = noteAtBassOctave;
  const rootNote = withOct(chord.rootNote);
  const fifthNote = withOct(chord.fifthNote);
  const thirdNote = chord.thirdNote ? withOct(chord.thirdNote) : rootNote;
  const passingNotes = [...new Set([rootNote, thirdNote, fifthNote])];
  return { rootNote, fifthNote, thirdNote, passingNotes };
}

/**
 * Chord-aligned pool for one bar. Every rootChangeEveryBars, alternate root vs fifth
 * within the current harmony (2 bars rolling, 4 bars offbeat).
 */
function resolveBarBassPool(chordTimeline, absoluteBar, rootChangeEveryBars = 4) {
  const chord = getChordAtBar(chordTimeline, absoluteBar);
  const pool = chordToBassPool(chord);
  if (!rootChangeEveryBars || rootChangeEveryBars < 2) return pool;

  const phase = Math.floor(absoluteBar / rootChangeEveryBars) % 2;
  if (phase === 1) {
    return { ...pool, rootNote: pool.fifthNote, fifthNote: pool.rootNote };
  }
  return pool;
}

function poolAtLine(chordTimeline, globalBar, line, ticksPerBeat, rootChangeEveryBars, fallbackPool) {
  if (!chordTimeline) return fallbackPool;
  const barLines = barLineCount(ticksPerBeat);
  const absoluteBar = (globalBar ?? 0) + Math.floor(line / barLines);
  return resolveBarBassPool(chordTimeline, absoluteBar, rootChangeEveryBars);
}

function defaultRootChangeEveryBars(style) {
  return style === 'rolling' ? 2 : 4;
}

/** Ch. 29 — mid-bass 16ths leave quarter-note downbeats open for kick. */
function isRollingKickSpace(options, rhythmPlan) {
  const style = options.bassStyle ?? rhythmPlan?.bassStyle;
  return style === 'rolling';
}

function isDownbeatLine(line, ticksPerBeat) {
  const beatStep = Math.max(1, ticksPerBeat);
  return line % beatStep === 0;
}

function clearRollingDownbeats(track, ticksPerBeat) {
  const beatStep = Math.max(1, ticksPerBeat);
  for (let i = 0; i < track.length; i += beatStep) {
    track[i] = '';
  }
  return track;
}

function pickWeightedBassNote(bassPool, weights, rng) {
  const { rootNote, fifthNote, passingNotes } = bassPool;
  const rootP = weights.rootP ?? 80;
  const fifthP = weights.fifthP ?? 15;
  const roll = (rng() * 100) | 0;
  if (roll < rootP) return rootNote;
  if (roll < rootP + fifthP) return fifthNote;
  const passing = (passingNotes || []).filter(n => n !== rootNote && n !== fifthNote);
  if (passing.length) return passing[(rng() * passing.length) | 0];
  return rootNote;
}

/**
 * Classic rolling psytrance bass: 16th notes on root with occasional fifth/passing tones.
 */
function generateRollingBass(trackLength, ticksPerBeat, bassPool, rng, options = {}) {
  const track = emptyTrack(trackLength);
  const { rootNote, passingNotes } = bassPool;
  const notes = passingNotes.length ? passingNotes : [rootNote];
  const sixteenth = Math.max(1, Math.floor(ticksPerBeat / 4));
  const { variationP = 25, octaveJumpP = 10, rootP, fifthP, passingP } = options;
  const weights = { rootP, fifthP, passingP };

  let currentNote = rootNote;
  for (let i = 0; i < trackLength; i += sixteenth) {
    if (isDownbeatLine(i, ticksPerBeat)) continue;
    const barPool = options.chordTimeline
      ? poolAtLine(options.chordTimeline, options.globalBar, i, ticksPerBeat, options.rootChangeEveryBars ?? 4, bassPool)
      : bassPool;
    if (rootP != null) {
      currentNote = pickWeightedBassNote(barPool, weights, rng);
    } else if (randomPercent(variationP, rng) && barPool.passingNotes.length > 1) {
      currentNote = barPool.passingNotes[(rng() * barPool.passingNotes.length | 0)];
    } else {
      currentNote = barPool.rootNote;
    }
    if (randomPercent(octaveJumpP, rng) && barPool.passingNotes.length > 2) {
      currentNote = barPool.passingNotes[barPool.passingNotes.length - 1];
    }
    track[i] = currentNote;
  }
  return track;
}

/**
 * Offbeat bass: hits on the "and" of each beat — common in morning/full-on psy.
 */
function generateOffbeatBass(trackLength, ticksPerBeat, bassPool, rng, options = {}) {
  const track = emptyTrack(trackLength);
  const { rootNote, fifthNote } = bassPool;
  const halfBeat = Math.max(1, Math.floor(ticksPerBeat / 2));
  const sixteenth = Math.max(1, Math.floor(ticksPerBeat / 4));
  const { fifthEveryBars = 2, variationP = 20, dense = true } = options;
  const barLen = ticksPerBeat * 4;
  let barCount = 0;

  const { rootP, fifthP, passingP } = options;
  const useWeights = rootP != null;

  for (let i = halfBeat; i < trackLength; i += ticksPerBeat) {
    const barPool = options.chordTimeline
      ? poolAtLine(options.chordTimeline, options.globalBar, i, ticksPerBeat, options.rootChangeEveryBars ?? 4, bassPool)
      : bassPool;
    let note;
    if (useWeights) {
      note = pickWeightedBassNote(barPool, { rootP, fifthP, passingP }, rng);
    } else if (barCount > 0 && barCount % fifthEveryBars === 0 && randomPercent(40, rng)) {
      note = barPool.fifthNote;
    } else if (randomPercent(variationP, rng)) {
      note = barPool.fifthNote;
    } else {
      note = barPool.rootNote;
    }
    track[i] = note;

    if (dense) {
      const push = i - sixteenth;
      if (push >= 0 && !track[push]) track[push] = barPool.rootNote;
      const tail = i + sixteenth;
      if (tail < trackLength && !track[tail]) track[tail] = barPool.fifthNote;
    }

    if ((i + halfBeat) % barLen < ticksPerBeat) barCount++;
  }
  return track;
}

/**
 * Staccato bass: root on beat 1, fifth on beat 3 — minimal / prog psy style.
 */
function generateStaccatoBass(trackLength, ticksPerBeat, bassPool, rng, options = {}) {
  const track = emptyTrack(trackLength);
  const beatStep = ticksPerBeat;

  for (let bar = 0; bar * beatStep * 4 < trackLength; bar++) {
    const barStart = bar * beatStep * 4;
    const barPool = options.chordTimeline
      ? resolveBarBassPool(
        options.chordTimeline,
        (options.globalBar ?? 0) + bar,
        options.rootChangeEveryBars ?? 4
      )
      : bassPool;
    if (barStart < trackLength) track[barStart] = barPool.rootNote;
    const beat3 = barStart + beatStep * 2;
    if (beat3 < trackLength) track[beat3] = barPool.fifthNote;
  }
  return track;
}

/**
 * Render bass from B* archetype — rhythm first, notes second.
 */
function generateBassFromArchetype(rhythmPlan, trackLength, ticksPerBeat, bassPool, rng, options = {}) {
  const archetypeId = getBassArchetypeId(rhythmPlan);
  const archetype = getArchetype(archetypeId);
  if (!archetype) {
    return generateBass(rhythmPlan.bassStyle || 'rolling', trackLength, ticksPerBeat, bassPool, rng, options);
  }

  const track = emptyTrack(trackLength);
  const barLines = barLineCount(ticksPerBeat);
  const barCount = Math.ceil(trackLength / barLines);
  const weights = {
    rootP: options.rootP,
    fifthP: options.fifthP,
    passingP: options.passingP
  };
  const globalBar = options.globalBar ?? rhythmPlan?.globalBar ?? 0;
  const bassOpts = {
    chordTimeline: options.chordTimeline,
    globalBar,
    rootChangeEveryBars: options.rootChangeEveryBars ?? defaultRootChangeEveryBars(rhythmPlan?.bassStyle)
  };
  const rollingSpace = isRollingKickSpace(options, rhythmPlan);

  for (let bar = 0; bar < barCount; bar++) {
    const barPool = bassOpts.chordTimeline
      ? resolveBarBassPool(
        bassOpts.chordTimeline,
        globalBar + bar,
        bassOpts.rootChangeEveryBars
      )
      : bassPool;
    for (const event of archetype.events) {
      if (event.type === 'kickRef') continue;
      if (event.type !== 'bass') continue;
      const line = sixteenthToLine(event.pos, bar, ticksPerBeat);
      if (line >= trackLength) continue;
      if (rollingSpace && isDownbeatLine(line, ticksPerBeat)) continue;
      track[line] = pickWeightedBassNote(barPool, weights, rng);
    }
  }

  if (options.evolve !== false && rhythmPlan) {
    const evolvePool = bassOpts.chordTimeline
      ? resolveBarBassPool(bassOpts.chordTimeline, globalBar, bassOpts.rootChangeEveryBars)
      : bassPool;
    applyPatternEvolution(track, rhythmPlan, ticksPerBeat, trackLength, rng, null, {
      allowFill: false,
      mutateOpts: { closedToken: evolvePool.rootNote, openToken: evolvePool.fifthNote }
    });
  }

  if (rollingSpace) clearRollingDownbeats(track, ticksPerBeat);
  return track;
}

function generateBass(style, trackLength, ticksPerBeat, bassPool, rng, options = {}) {
  if (options.muted) return emptyTrack(trackLength);
  if (options.rhythmPlan) {
    return generateBassFromArchetype(options.rhythmPlan, trackLength, ticksPerBeat, bassPool, rng, options);
  }
  switch (style) {
    case 'offbeat': return generateOffbeatBass(trackLength, ticksPerBeat, bassPool, rng, options);
    case 'staccato': return generateStaccatoBass(trackLength, ticksPerBeat, bassPool, rng, options);
    case 'rolling':
    default: return generateRollingBass(trackLength, ticksPerBeat, bassPool, rng, options);
  }
}

module.exports = {
  generateBass,
  generateBassFromArchetype,
  generateRollingBass,
  generateOffbeatBass,
  generateStaccatoBass,
  pickWeightedBassNote,
  chordToBassPool,
  resolveBarBassPool,
  defaultRootChangeEveryBars,
  isDownbeatLine,
  clearRollingDownbeats
};
