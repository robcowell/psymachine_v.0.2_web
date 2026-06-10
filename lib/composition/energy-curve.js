/**
 * Energy curve (0–100) → track densities and generator parameters.
 */

const {
  isBreakdown,
  breakdownTrackDensities,
  sectionProgress,
  isInBreakdownRollZone
} = require('./breakdown');

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Map section energy to per-track activity (0–1).
 * @param {object} [position] — { barInSection, sectionBars, bpp } for bar-accurate breakdown
 */
function energyToTrackDensities(energy, flags = {}, position = {}) {
  const { barInSection = 0, sectionBars = 16, bpp = 4 } = position;

  if (isBreakdown(flags)) {
    return breakdownTrackDensities(energy, barInSection, sectionBars, bpp);
  }

  const e = clamp01((energy ?? 0) / 100);
  const climax = energy >= 95;
  const padBreakdown = energy >= 30 && energy <= 55;

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
    fx: clamp01(0.1 + e * 0.45 + (climax ? 0.15 : 0)),
    perc: clamp01(Math.max(0, e - 0.25) * 1.15)
  };
}

/**
 * Interpolate energy between two section energies at a position 0–1 within a pattern.
 */
function interpolateEnergy(energyA, energyB, t) {
  return energyA + (energyB - energyA) * clamp01(t);
}

/** Bars to blend at section entry/exit (Ch. 26 structural downbeats). */
const DEFAULT_ENERGY_RAMP_BARS = 4;

/**
 * Energy at a global bar index — ramps first/last N bars between section targets.
 */
function resolveEnergyAtBar(barTimeline, globalBar, rampBars = DEFAULT_ENERGY_RAMP_BARS) {
  const sections = barTimeline?.sections;
  if (!sections?.length) return 50;

  let sectionIdx = sections.length - 1;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (globalBar >= s.startBar && globalBar < s.endBar) {
      sectionIdx = i;
      break;
    }
  }

  const section = sections[sectionIdx];
  const barInSection = globalBar - section.startBar;
  const sectionBars = section.endBar - section.startBar;
  if (sectionBars <= 0) return section.energy ?? 50;

  const ramp = Math.max(1, Math.min(rampBars, Math.floor(sectionBars / 2)));
  const prevEnergy = sectionIdx > 0 ? sections[sectionIdx - 1].energy : section.energy;
  const nextEnergy = sectionIdx < sections.length - 1
    ? sections[sectionIdx + 1].energy
    : section.energy;

  if (sectionIdx > 0 && barInSection < ramp) {
    return interpolateEnergy(prevEnergy, section.energy, barInSection / ramp);
  }
  if (sectionIdx < sections.length - 1 && barInSection >= sectionBars - ramp) {
    const t = (barInSection - (sectionBars - ramp)) / ramp;
    return interpolateEnergy(section.energy, nextEnergy, t);
  }
  return section.energy ?? 50;
}

/**
 * Lead generator percents from energy and style lead-density target.
 */
function energyToLeadPercents(energy, style, flags = {}, position = {}) {
  const e = clamp01((energy ?? 50) / 100);
  const [minNotes, maxNotes] = style?.leadNotesPerBar || [4, 12];
  const targetNotes = minNotes + (maxNotes - minNotes) * e;
  const fillRatio = clamp01(targetNotes / 16);

  if (isBreakdown(flags)) {
    const build = sectionProgress(position.barInSection ?? 0, position.sectionBars ?? 16, position.bpp ?? 4);
    const thin = 0.35 + build * 0.25;
    return {
      baseNoteP: Math.round(55 * thin),
      otherNotesP: Math.round(25 * thin),
      removeNoteP: Math.round(20 + build * 10),
      addNoteP: Math.round(5 + fillRatio * 12 * thin),
      changeNoteP: Math.round(6 + fillRatio * 10 * thin),
      noteOffP: Math.round(40 + build * 15),
      noteOffVariationP: Math.round(10),
      noteFlutterP: Math.round(5 + build * 8)
    };
  }

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
 * @param {object} [context] — { flags, barInSection, sectionBars, bpp }
 */
function energyToGeneratorOptions(energy, style, trackKey, context = {}) {
  const e = clamp01((energy ?? 50) / 100);
  const { flags = {}, barInSection = 0, sectionBars = 16, bpp = 4 } = context;
  const breakdown = isBreakdown(flags);
  const progress = breakdown ? sectionProgress(barInSection, sectionBars, bpp) : 0;
  const inRollZone = breakdown && isInBreakdownRollZone(barInSection, sectionBars, bpp);
  const bassWeights = style?.bassNoteWeights || { root: 80, fifth: 15, passing: 5 };
  const rolling = (context.bassStyle || style?.bassStyle) === 'rolling';
  const weights = rolling
    ? { root: 62, fifth: 10, passing: 28 }
    : bassWeights;

  if (trackKey === 'bass') {
    return {
      rootP: weights.root,
      fifthP: weights.fifth,
      passingP: weights.passing,
      variationP: Math.round(15 + (1 - e) * 15),
      dense: !breakdown && e >= 0.25,
      muted: breakdown
    };
  }

  if (trackKey === 'kick') {
    return { muted: breakdown };
  }

  if (trackKey === 'snare') {
    return {
      useClap: !inRollZone,
      ghostSnareP: breakdown ? Math.round(4 + progress * 12) : Math.round(10 + e * 25),
      rollFillP: inRollZone ? 100 : Math.round((style?.snareRollP || 25) * (0.4 + e * 0.6)),
      breakdownRoll: inRollZone,
      barInSection,
      sectionBars,
      bpp
    };
  }

  if (trackKey === 'hihat') {
    const variationRange = style?.hatVariationRate;
    const hatE = breakdown ? 0.15 + progress * 0.25 : e;
    const variationRate = Array.isArray(variationRange)
      ? variationRange[0] + (variationRange[1] - variationRange[0]) * hatE
      : 0.2 + hatE * 0.2;

    return {
      variationRate,
      fillP: breakdown
        ? Math.round((style?.hatFillP ?? 30) * (0.1 + progress * 0.25))
        : Math.round((style?.hatFillP ?? 30) * (0.3 + e * 0.7))
    };
  }

  if (trackKey === 'fx') {
    const sparse = breakdown ? progress < 0.55 : e < 0.25;
    return {
      sparse,
      phraseBars: breakdown ? 2 : (e > 0.7 ? 4 : 8),
      impactP: breakdown ? Math.round(25 + progress * 35) : Math.round(50 + e * 40),
      riserP: breakdown ? Math.round(55 + progress * 40) : Math.round(40 + e * 50),
      sweepP: breakdown ? Math.round(45 + progress * 45) : Math.round(30 + e * 45),
      breakdownBuild: breakdown ? progress : 0
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
  resolveEnergyAtBar,
  DEFAULT_ENERGY_RAMP_BARS,
  clamp01
};
