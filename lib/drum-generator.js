/**
 * Psytrance drum pattern generators: kick, snare/clap, hi-hats.
 */

const { randomPercent } = require('./rng');
const { DRUM_TRIGGERS } = require('./music-theory');

function emptyTrack(len) {
  return Array(len).fill('');
}

/**
 * Four-on-the-floor kick — every quarter note, 4/4.
 */
function generateKick(trackLength, ticksPerBeat, rng, options = {}) {
  const track = emptyTrack(trackLength);
  const beatStep = Math.max(1, ticksPerBeat);

  for (let i = 0; i < trackLength; i += beatStep) {
    track[i] = DRUM_TRIGGERS.kick;
  }
  return track;
}

/**
 * Snare/clap every 2 beats from the 4th line — LPB 4 → lines 4, 12, 20, 28…
 * (beats 2 & 4, layered on every other kick hit).
 */
function generateSnareClap(trackLength, ticksPerBeat, rng, options = {}) {
  const track = emptyTrack(trackLength);
  const { useClap = true, ghostSnareP = 20, rollFillP = 0 } = options;
  const beatStep = Math.max(1, ticksPerBeat);
  const snareInterval = beatStep * 2;
  const sixteenth = Math.max(1, Math.floor(beatStep / 4));

  for (let i = beatStep; i < trackLength; i += snareInterval) {
    track[i] = useClap ? DRUM_TRIGGERS.clap : DRUM_TRIGGERS.snare;
    if (useClap && randomPercent(60, rng)) {
      track[i] = DRUM_TRIGGERS.snare;
    }
  }

  if (ghostSnareP > 0) {
    for (let i = sixteenth; i < trackLength; i += sixteenth * 2) {
      if (track[i] === '' && randomPercent(ghostSnareP, rng)) {
        track[i] = DRUM_TRIGGERS.snare;
      }
    }
  }

  if (rollFillP > 0) {
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
 * 16th-note closed hi-hats with open hat accents on offbeats.
 */
function generateHiHats(trackLength, ticksPerBeat, rng, options = {}) {
  const track = emptyTrack(trackLength);
  const { openHatP = 25, skipP = 12, shuffleP = 30 } = options;
  const sixteenth = Math.max(1, Math.floor(ticksPerBeat / 4));
  const eighth = Math.max(1, Math.floor(ticksPerBeat / 2));

  for (let i = 0; i < trackLength; i += sixteenth) {
    if (randomPercent(skipP, rng)) continue;
    const isOffbeat = (Math.floor(i / sixteenth) % 2) === 1;
    if (isOffbeat && randomPercent(openHatP, rng)) {
      track[i] = DRUM_TRIGGERS.hihatOpen;
    } else {
      track[i] = DRUM_TRIGGERS.hihatClosed;
    }
  }

  if (shuffleP > 0) {
    for (let i = eighth; i < trackLength; i += ticksPerBeat) {
      const ahead = i + sixteenth;
      if (ahead < trackLength && track[ahead] === DRUM_TRIGGERS.hihatClosed && randomPercent(shuffleP, rng)) {
        track[i] = DRUM_TRIGGERS.hihatClosed;
        track[ahead] = '';
      }
    }
  }
  return track;
}

/**
 * Optional ride/crash layer for transitions.
 */
function generatePercussion(trackLength, ticksPerBeat, rng, options = {}) {
  const track = emptyTrack(trackLength);
  const { crashOnPhrase = true, rideP = 15 } = options;
  const phraseLen = ticksPerBeat * 16;

  if (crashOnPhrase) {
    for (let i = 0; i < trackLength; i += phraseLen) {
      if (i < trackLength) track[i] = DRUM_TRIGGERS.crash;
    }
  }

  for (let i = ticksPerBeat * 2; i < trackLength; i += ticksPerBeat * 4) {
    if (randomPercent(rideP, rng)) track[i] = DRUM_TRIGGERS.ride;
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
