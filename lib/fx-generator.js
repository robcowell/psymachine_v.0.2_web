/**
 * FX pattern generator — impacts, risers, sweeps at phrase boundaries.
 * Typical psytrance: risers before drops, impacts on downbeats, sweeps in builds.
 */

const { randomPercent } = require('./rng');
const { DRUM_TRIGGERS } = require('./music-theory');

function emptyTrack(len) {
  return Array(len).fill('');
}

/**
 * Place FX hits at phrase boundaries and build-up risers.
 */
function generateFX(trackLength, ticksPerBeat, rng, options = {}) {
  const track = emptyTrack(trackLength);
  const {
    phraseBars = 4,
    riserLength = 8,
    impactP = 80,
    riserP = 60,
    sweepP = 40
  } = options;

  const barLen = ticksPerBeat * 4;
  const phraseLen = barLen * phraseBars;
  const sixteenth = Math.max(1, Math.floor(ticksPerBeat / 4));

  for (let phraseStart = 0; phraseStart < trackLength; phraseStart += phraseLen) {
    const phraseEnd = Math.min(phraseStart + phraseLen, trackLength);

    if (randomPercent(impactP, rng) && phraseStart < trackLength) {
      track[phraseStart] = DRUM_TRIGGERS.fxImpact;
    }

    const riserStart = Math.max(phraseStart, phraseEnd - riserLength * sixteenth);
    if (randomPercent(riserP, rng)) {
      for (let r = riserStart; r < phraseEnd; r += sixteenth) {
        track[r] = DRUM_TRIGGERS.fxRiser;
      }
    }

    const buildStart = Math.max(phraseStart, phraseEnd - barLen * 2);
    if (randomPercent(sweepP, rng)) {
      for (let s = buildStart; s < phraseEnd; s += ticksPerBeat) {
        if (track[s] === '') track[s] = DRUM_TRIGGERS.fxSweep;
      }
    }
  }

  return track;
}

/**
 * Minimal FX for intro/outro — sparse impacts only.
 */
function generateFXSparse(trackLength, ticksPerBeat, rng) {
  const track = emptyTrack(trackLength);
  const phraseLen = ticksPerBeat * 16;
  for (let i = 0; i < trackLength; i += phraseLen) {
    if (randomPercent(50, rng)) track[i] = DRUM_TRIGGERS.fxImpact;
  }
  return track;
}

module.exports = { generateFX, generateFXSparse };
