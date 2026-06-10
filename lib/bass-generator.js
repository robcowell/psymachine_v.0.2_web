/**
 * Psytrance bassline generators — archetype-driven and legacy style fallbacks.
 */

const { randomPercent } = require('./rng');
const { getArchetype } = require('./pattern-archetypes/registry');
const { sixteenthToLine, barLineCount } = require('./pattern-archetypes/encode');
const { applyPatternEvolution } = require('./pattern-archetypes/evolver');
const { getBassArchetypeId } = require('./pattern-archetypes/compositor');

function emptyTrack(len) {
  return Array(len).fill('');
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
    if (rootP != null) {
      currentNote = pickWeightedBassNote(bassPool, weights, rng);
    } else if (randomPercent(variationP, rng) && notes.length > 1) {
      currentNote = notes[(rng() * notes.length | 0)];
    } else {
      currentNote = rootNote;
    }
    if (randomPercent(octaveJumpP, rng) && notes.length > 2) {
      currentNote = notes[notes.length - 1];
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
    let note;
    if (useWeights) {
      note = pickWeightedBassNote(bassPool, { rootP, fifthP, passingP }, rng);
    } else if (barCount > 0 && barCount % fifthEveryBars === 0 && randomPercent(40, rng)) {
      note = fifthNote;
    } else if (randomPercent(variationP, rng)) {
      note = fifthNote;
    } else {
      note = rootNote;
    }
    track[i] = note;

    if (dense) {
      const push = i - sixteenth;
      if (push >= 0 && !track[push]) track[push] = rootNote;
      const tail = i + sixteenth;
      if (tail < trackLength && !track[tail]) track[tail] = fifthNote;
    }

    if ((i + halfBeat) % barLen < ticksPerBeat) barCount++;
  }
  return track;
}

/**
 * Staccato bass: root on beat 1, fifth on beat 3 — minimal / prog psy style.
 */
function generateStaccatoBass(trackLength, ticksPerBeat, bassPool, rng) {
  const track = emptyTrack(trackLength);
  const { rootNote, fifthNote } = bassPool;
  const beatStep = ticksPerBeat;

  for (let bar = 0; bar * beatStep * 4 < trackLength; bar++) {
    const barStart = bar * beatStep * 4;
    if (barStart < trackLength) track[barStart] = rootNote;
    const beat3 = barStart + beatStep * 2;
    if (beat3 < trackLength) track[beat3] = fifthNote;
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

  for (let bar = 0; bar < barCount; bar++) {
    for (const event of archetype.events) {
      if (event.type !== 'bass') continue;
      const line = sixteenthToLine(event.pos, bar, ticksPerBeat);
      if (line >= trackLength) continue;
      track[line] = pickWeightedBassNote(bassPool, weights, rng);
    }
  }

  if (options.evolve !== false && rhythmPlan) {
    applyPatternEvolution(track, rhythmPlan, ticksPerBeat, trackLength, rng, null, {
      allowFill: false,
      mutateOpts: { closedToken: bassPool.rootNote, openToken: bassPool.fifthNote }
    });
  }

  return track;
}

function generateBass(style, trackLength, ticksPerBeat, bassPool, rng, options = {}) {
  if (options.rhythmPlan) {
    return generateBassFromArchetype(options.rhythmPlan, trackLength, ticksPerBeat, bassPool, rng, options);
  }
  switch (style) {
    case 'offbeat': return generateOffbeatBass(trackLength, ticksPerBeat, bassPool, rng, options);
    case 'staccato': return generateStaccatoBass(trackLength, ticksPerBeat, bassPool, rng);
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
  pickWeightedBassNote
};
