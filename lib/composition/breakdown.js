/**
 * Ch. 26 breakdown behaviour — strip layers, tease motif, build to drop.
 */

function isBreakdown(flags = {}) {
  return Boolean(flags?.breakdown);
}

/** Progress through section using end of current pattern (0–1). */
function sectionProgress(barInSection, sectionBars, bpp = 4) {
  if (!sectionBars || sectionBars <= 0) return 0;
  const barEnd = Math.min(barInSection + Math.max(1, bpp), sectionBars);
  return Math.max(0, Math.min(1, barEnd / sectionBars));
}

/** Build phase within breakdown: 0 first half, ramps 0→1 in last half toward drop. */
function breakdownBuildPhase(progress) {
  if (progress <= 0.5) return 0;
  return (progress - 0.5) * 2;
}

/**
 * Per-track densities during breakdown (kick/bass out, hats thin, pad/lead tease, snare/fx build).
 */
function breakdownTrackDensities(energy, barInSection, sectionBars, bpp) {
  const build = breakdownBuildPhase(sectionProgress(barInSection, sectionBars, bpp));
  return {
    kick: 0,
    bass: 0,
    lead: 0.18 + build * 0.22,
    lead2: 0,
    pad: 0.5 + build * 0.25,
    hihat: 0.06 + build * 0.14,
    snare: 0.3 + build * 0.55,
    fx: 0.45 + build * 0.5,
    perc: 0
  };
}

/** Last N bars of section — snare roll accelerates into the drop (Ch. 26). */
const DEFAULT_ROLL_BARS = 4;

function isInBreakdownRollZone(barInSection, sectionBars, bpp, rollBars = DEFAULT_ROLL_BARS) {
  if (!sectionBars || sectionBars <= 0) return false;
  const rollStart = Math.max(0, sectionBars - rollBars);
  const patternEnd = barInSection + Math.max(1, bpp);
  return patternEnd > rollStart;
}

/**
 * Deterministic accelerating snare roll in the breakdown roll zone.
 * Beat → 8th → 16th → 32nd density toward section end.
 */
function applyBreakdownSnareRoll(track, trackLength, ticksPerBeat, barInSection, sectionBars, bpp, snareToken, rollBars = DEFAULT_ROLL_BARS) {
  if (!isInBreakdownRollZone(barInSection, sectionBars, bpp, rollBars)) return track;

  const beatStep = Math.max(1, ticksPerBeat);
  const sixteenth = Math.max(1, Math.floor(beatStep / 4));
  const eighth = Math.max(1, Math.floor(beatStep / 2));
  const thirtysecond = Math.max(1, Math.floor(sixteenth / 2));
  const barLen = beatStep * 4;
  const rollStartBar = Math.max(0, sectionBars - rollBars);

  for (let line = 0; line < trackLength; line++) {
    const barInSong = barInSection + Math.floor(line / barLen);
    if (barInSong < rollStartBar) continue;

    const barsIntoRoll = barInSong - rollStartBar;
    const posInBar = line % barLen;
    const posInBeat = posInBar % beatStep;

    let hit = false;
    if (barsIntoRoll <= 1) {
      hit = posInBeat === 0;
    } else if (barsIntoRoll === 2) {
      hit = posInBeat === 0 || posInBeat === eighth;
    } else if (barsIntoRoll === 3) {
      hit = posInBeat % sixteenth === 0;
    } else {
      hit = posInBeat % thirtysecond === 0;
    }

    if (hit) track[line] = snareToken;
  }

  return track;
}

/** Ch. 26: keep rhythm, collapse to one pitch. */
function collapseToSinglePitch(cells) {
  const tonic = cells.find(c => c && c !== 'OFF');
  if (!tonic) return cells;
  return cells.map(c => (c && c !== 'OFF' ? tonic : c));
}

module.exports = {
  isBreakdown,
  sectionProgress,
  breakdownBuildPhase,
  breakdownTrackDensities,
  isInBreakdownRollZone,
  applyBreakdownSnareRoll,
  collapseToSinglePitch,
  DEFAULT_ROLL_BARS
};
