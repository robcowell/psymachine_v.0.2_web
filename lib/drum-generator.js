/**
 * Psytrance drum pattern generators — archetype-driven rhythms.
 */

const { randomPercent } = require('./rng');
const { DRUM_TRIGGERS } = require('./music-theory');
const { applyBreakdownSnareRoll } = require('./composition/breakdown');
const { renderArchetypeStack } = require('./pattern-archetypes/render');
const { applyPatternEvolution } = require('./pattern-archetypes/evolver');
const {
  generateArchetypeHats,
  getClapArchetypeIds,
  getPercArchetypeIds
} = require('./pattern-archetypes/compositor');

function emptyTrack(len) {
  return Array(len).fill('');
}

/**
 * Four-on-the-floor kick — every quarter note, 4/4.
 */
function generateKick(trackLength, ticksPerBeat, rng, options = {}) {
  if (options.muted) return emptyTrack(trackLength);
  const track = emptyTrack(trackLength);
  const beatStep = Math.max(1, ticksPerBeat);

  for (let i = 0; i < trackLength; i += beatStep) {
    track[i] = DRUM_TRIGGERS.kick;
  }
  return track;
}

/**
 * Snare/clap from C* archetypes with optional ghosts and rolls.
 */
function generateSnareClap(trackLength, ticksPerBeat, rng, options = {}) {
  const { useClap = true, ghostSnareP = 20, rollFillP = 0, rhythmPlan } = options;

  let track;
  if (rhythmPlan) {
    const ids = getClapArchetypeIds(rhythmPlan);
    track = ids.length
      ? renderArchetypeStack(ids, 'clap', trackLength, ticksPerBeat, rng, { useClap })
      : emptyTrack(trackLength);
    if (rhythmPlan) {
      applyPatternEvolution(track, rhythmPlan, ticksPerBeat, trackLength, rng, null, {
        allowFill: false,
        mutateOpts: { closedToken: DRUM_TRIGGERS.clap, openToken: DRUM_TRIGGERS.snare }
      });
    }
  } else {
    track = emptyTrack(trackLength);
    const beatStep = Math.max(1, ticksPerBeat);
    const snareInterval = beatStep * 2;
    for (let i = beatStep; i < trackLength; i += snareInterval) {
      track[i] = useClap ? DRUM_TRIGGERS.clap : DRUM_TRIGGERS.snare;
      if (useClap && randomPercent(60, rng)) {
        track[i] = DRUM_TRIGGERS.snare;
      }
    }
  }

  const beatStep = Math.max(1, ticksPerBeat);
  const sixteenth = Math.max(1, Math.floor(beatStep / 4));

  if (ghostSnareP > 0) {
    for (let i = sixteenth; i < trackLength; i += sixteenth * 2) {
      if (track[i] === '' && randomPercent(ghostSnareP, rng)) {
        track[i] = DRUM_TRIGGERS.snare;
      }
    }
  }

  if (options.breakdownRoll) {
    applyBreakdownSnareRoll(
      track,
      trackLength,
      ticksPerBeat,
      options.barInSection ?? 0,
      options.sectionBars ?? 16,
      options.bpp ?? 4,
      DRUM_TRIGGERS.snare
    );
  } else if (rollFillP > 0) {
    const phraseLen = beatStep * 4 * 4;
    for (let phraseEnd = phraseLen - 1; phraseEnd < trackLength; phraseEnd += phraseLen) {
      if (randomPercent(rollFillP, rng)) {
        for (let r = phraseEnd - sixteenth * 3; r <= phraseEnd; r += sixteenth) {
          if (r >= 0 && r < trackLength) track[r] = DRUM_TRIGGERS.snare;
        }
      }
    }
  }
  return track;
}

/**
 * Hi-hats from H* archetypes (replaces layered hat system).
 */
function generateHiHats(trackLength, ticksPerBeat, rng, options = {}) {
  const { rhythmPlan, fingerprintCache } = options;
  if (rhythmPlan) {
    return generateArchetypeHats(trackLength, ticksPerBeat, rng, rhythmPlan, fingerprintCache);
  }

  const track = emptyTrack(trackLength);
  const { offbeatP = 90 } = options;
  const sixteenth = Math.max(1, Math.floor(ticksPerBeat / 4));
  for (let i = 0; i < trackLength; i += sixteenth) {
    const posInBeat = i % ticksPerBeat;
    if (posInBeat === Math.floor(ticksPerBeat / 2) && randomPercent(offbeatP, rng)) {
      track[i] = DRUM_TRIGGERS.hihatClosed;
    }
  }
  return track;
}

/**
 * Percussion from P* archetypes plus optional phrase crash.
 */
function generatePercussion(trackLength, ticksPerBeat, rng, options = {}) {
  const { crashOnPhrase = true, rideP = 15, rhythmPlan } = options;
  const phraseLen = ticksPerBeat * 16;

  let track;
  if (rhythmPlan) {
    const ids = getPercArchetypeIds(rhythmPlan);
    track = ids.length
      ? renderArchetypeStack(ids, 'perc', trackLength, ticksPerBeat, rng, {})
      : emptyTrack(trackLength);
    applyPatternEvolution(track, rhythmPlan, ticksPerBeat, trackLength, rng, null, {
      allowFill: false,
      mutateOpts: { closedToken: DRUM_TRIGGERS.ride, openToken: DRUM_TRIGGERS.ride }
    });
  } else {
    track = emptyTrack(trackLength);
    for (let i = ticksPerBeat * 2; i < trackLength; i += ticksPerBeat * 4) {
      if (randomPercent(rideP, rng)) track[i] = DRUM_TRIGGERS.ride;
    }
  }

  if (crashOnPhrase) {
    for (let i = 0; i < trackLength; i += phraseLen) {
      if (i < trackLength && !track[i]) track[i] = DRUM_TRIGGERS.crash;
    }
  }

  return track;
}

module.exports = {
  generateKick,
  generateSnareClap,
  generateHiHats,
  generatePercussion,
  DRUM_TRIGGERS
};
