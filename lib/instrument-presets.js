/**
 * Fixed Renoise instrument slot hints — names shown in the .xrns instrument list.
 */

const INSTRUMENT_PRESETS = {
  lead: {
    slot: 0,
    name: 'Lead Synth - sq/wavetable hook',
    trackLabel: 'Lead / Melody',
    hint: 'Main motif — Vital, Serum, Phase Plant'
  },
  lead2: {
    slot: 7,
    name: 'Counter Lead - pluck / call-response',
    trackLabel: 'Counter Lead',
    hint: 'Answers main lead — short pluck or acid'
  },
  pad: {
    slot: 8,
    name: 'Pad - atmosphere / breakdown',
    trackLabel: 'Pad',
    hint: 'Long chords — diva, pads, strings'
  },
  bass: {
    slot: 1,
    name: 'Bass - offbeat/rolling psy',
    trackLabel: 'Bass',
    hint: 'Short root-led psy bass — prog offbeat or full-on rolling 16ths'
  },
  kick: {
    slot: 2,
    name: 'Kick - four-on-floor (C-4)',
    trackLabel: 'Kick',
    hint: 'Sample: psy kick, trance kick'
  },
  snare: {
    slot: 3,
    name: 'Snare/Clap - backbeat (D-4/E-4)',
    trackLabel: 'Snare / Clap',
    hint: 'Clap layered with snare on 2 & 4'
  },
  hihat: {
    slot: 4,
    name: 'Hi-Hats - closed/open (F#4/A#4)',
    trackLabel: 'Hi-Hats',
    hint: '16ths closed, offbeat open hats'
  },
  fx: {
    slot: 5,
    name: 'FX - risers, impacts, sweeps',
    trackLabel: 'FX',
    hint: 'Samples: uplifter, downlifter, psy FX'
  },
  perc: {
    slot: 6,
    name: 'Perc - crash, ride, shakers',
    trackLabel: 'Perc / Crash',
    hint: 'Phrase crashes, rides, percussion layers'
  }
};

const MAX_INSTRUMENT_SLOT = 8;

function getPresetForTrack(trackKey) {
  return INSTRUMENT_PRESETS[trackKey] || null;
}

/** Slot-indexed names for all standard instrument positions. */
function buildInstrumentNameMap() {
  const names = {};
  for (const preset of Object.values(INSTRUMENT_PRESETS)) {
    names[preset.slot] = preset.name;
  }
  return names;
}

function applyInstrumentSlotsToTracks(tracksConfig) {
  const out = { ...tracksConfig };
  for (const [key, preset] of Object.entries(INSTRUMENT_PRESETS)) {
    if (!out[key]) continue;
    out[key] = {
      ...out[key],
      instrument: String(preset.slot),
      label: out[key].label || preset.trackLabel,
      instrumentName: preset.name,
      instrumentHint: preset.hint
    };
  }
  return out;
}

function listInstrumentPresets() {
  return Object.entries(INSTRUMENT_PRESETS).map(([key, p]) => ({
    trackKey: key,
    slot: p.slot,
    name: p.name,
    trackLabel: p.trackLabel,
    hint: p.hint
  }));
}

module.exports = {
  INSTRUMENT_PRESETS,
  MAX_INSTRUMENT_SLOT,
  getPresetForTrack,
  buildInstrumentNameMap,
  applyInstrumentSlotsToTracks,
  listInstrumentPresets
};
