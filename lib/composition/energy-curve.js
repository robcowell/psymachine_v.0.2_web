/**
 * Energy curve (0–100) → track densities and generator parameters.
 */

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Map section energy to per-track activity (0–1).
 * Breakdown sections get boosted FX via flags.
 */
function energyToTrackDensities(energy, flags = {}) {
  const e = clamp01((energy ?? 0) / 100);
  const breakdown = Boolean(flags.breakdown);
  const climax = energy >= 95;

  const padBreakdown = breakdown || (energy >= 30 && energy <= 55);
  return {
    kick: e < 0.05 ? clamp01(e * 6) : 1,
    bass: e < 0.08 ? 0 : clamp01(0.55 + e * 0.45),
    lead: clamp01(0.08 + e * 0.92),
    lead2: e < 0.35 ? 0 : clamp01(0.45 + (e - 0.35) * 0.8),
    pad: padBreakdown
      ? clamp01(0.45 + e * 0.4)
      : clamp01(Math.max(0, 0.5 - Math.abs(e - 0.42) * 1.4)),
    hihat: clamp01(0.12 + e * 0.88),
    snare: e < 0.18 ? clamp01(e * 3) : clamp01(0.2 + e * 0.8),
    fx: breakdown
      ? clamp01(0.55 + e * 0.35)
      : clamp01(0.1 + e * 0.45 + (climax ? 0.15 : 0)),
    perc: clamp01(Math.max(0, e - 0.25) * 1.15)
  };
}

/**
 * Interpolate energy between two section energies at a position 0–1 within a pattern.
 */
function interpolateEnergy(energyA, energyB, t) {
  return energyA + (energyB - energyA) * clamp01(t);
}

/**
 * Lead generator percents from energy and style lead-density target.
 */
function energyToLeadPercents(energy, style) {
  const e = clamp01((energy ?? 50) / 100);
  const [minNotes, maxNotes] = style?.leadNotesPerBar || [4, 12];
  const targetNotes = minNotes + (maxNotes - minNotes) * e;
  const fillRatio = clamp01(targetNotes / 16);

  return {
    baseNoteP: Math.round(35 + e * 15),
    otherNotesP: Math.round(40 + e * 20),
    removeNoteP: Math.round(8 - e * 5),
    addNoteP: Math.round(10 + fillRatio * 35),
    changeNoteP: Math.round(12 + fillRatio * 28),
    noteOffP: Math.round(30 + e * 15),
    noteOffVariationP: Math.round(15 + e * 12),
    noteFlutterP: Math.round(10 + e * 25)
  };
}

/**
 * Drum / bass options scaled by energy and style.
 */
function energyToGeneratorOptions(energy, style, trackKey) {
  const e = clamp01((energy ?? 50) / 100);
  const bassWeights = style?.bassNoteWeights || { root: 80, fifth: 15, passing: 5 };

  if (trackKey === 'bass') {
    return {
      rootP: bassWeights.root,
      fifthP: bassWeights.fifth,
      passingP: bassWeights.passing,
      variationP: Math.round(15 + (1 - e) * 15),
      dense: e >= 0.25
    };
  }

  if (trackKey === 'kick') {
    return {};
  }

  if (trackKey === 'snare') {
    return {
      useClap: true,
      ghostSnareP: Math.round(10 + e * 25),
      rollFillP: Math.round((style?.snareRollP || 25) * (0.4 + e * 0.6))
    };
  }

  if (trackKey === 'hihat') {
    return {
      openHatP: Math.round((style?.openHatP || 25) * (0.5 + e * 0.5)),
      skipP: Math.round((style?.hatSkipP || 12) * (1.2 - e * 0.5)),
      shuffleP: Math.round(20 + e * 25)
    };
  }

  if (trackKey === 'fx') {
    const sparse = e < 0.25;
    return {
      sparse,
      phraseBars: e > 0.7 ? 4 : 8,
      impactP: Math.round(50 + e * 40),
      riserP: Math.round(40 + e * 50),
      sweepP: Math.round(30 + e * 45)
    };
  }

  if (trackKey === 'perc') {
    return { crashOnPhrase: e > 0.35, rideP: Math.round(10 + e * 30) };
  }

  return {};
}

/**
 * Percussion layer count target from energy (design: 2–3 low, 6–10 peak).
 */
function energyToPercussionLayers(energy) {
  const e = clamp01((energy ?? 0) / 100);
  return Math.round(2 + e * 8);
}

module.exports = {
  energyToTrackDensities,
  energyToLeadPercents,
  energyToGeneratorOptions,
  energyToPercussionLayers,
  interpolateEnergy,
  clamp01
};
