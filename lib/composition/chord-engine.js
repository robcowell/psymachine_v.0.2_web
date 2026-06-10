/**
 * Chord progression engine — progressive psy i VI III VII with full picker voicings.
 */

const { buildChordVoicing, buildTonicCadenceChord, buildDominantCadenceChord, chordAtProgressionIndex, validatePickerChord } = require('../chord-voicing');
const { formatRenoiseNote, NON_MELODIC_OCTAVE } = require('../music-theory');

/** Scale degrees for i VI III VII (0-based index into 7-note scale). */
const PROGRESSIVE_PROGRESSION = [0, 5, 2, 6];

function defaultFallbackChord() {
  return buildChordVoicing(4, 0, NON_MELODIC_OCTAVE);
}

function chordFromPickerSelection(keyName, scaleIdx, selection, meta = {}) {
  const { chordRootNote, chordIdx } = selection;
  if (!validatePickerChord(keyName, scaleIdx, chordRootNote, chordIdx)) {
    return null;
  }
  return buildChordVoicing(chordRootNote, chordIdx, NON_MELODIC_OCTAVE, meta);
}

/**
 * Overlay V→i cadences on the last 8 bars of each section (4 bars V, 4 bars i).
 */
function applySectionCadences(changes, barTimeline, keyName, scaleIdx, changeEveryBars) {
  if (!barTimeline?.sections?.length || !changes?.length) return changes;

  const byBar = new Map(changes.map((c) => [c.bar, { ...c }]));

  for (const section of barTimeline.sections) {
    const sectionLen = section.endBar - section.startBar;
    if (sectionLen < changeEveryBars) continue;

    const tonicBar = section.endBar - changeEveryBars;
    const dominantBar = tonicBar - changeEveryBars;

    byBar.set(tonicBar, {
      bar: tonicBar,
      progressionIndex: null,
      ...buildTonicCadenceChord(keyName, scaleIdx)
    });

    if (dominantBar >= section.startBar) {
      byBar.set(dominantBar, {
        bar: dominantBar,
        progressionIndex: null,
        ...buildDominantCadenceChord(keyName, scaleIdx)
      });
    }
  }

  return [...byBar.values()].sort((a, b) => a.bar - b.bar);
}

function progressionLabel(selectedChords, keyName, scaleIdx) {
  if (selectedChords?.length) {
    return selectedChords
      .map((s) => buildChordVoicing(s.chordRootNote, s.chordIdx, NON_MELODIC_OCTAVE).label)
      .join(' → ');
  }
  return 'i-VI-III-VII';
}

/**
 * Build chord change map: one chord every changeEveryBars across the timeline.
 * @param {object} [options]
 * @param {Array<{chordRootNote:number,chordIdx:number}>} [options.selectedChords] — chord picker order
 */
function buildChordTimeline(barTimeline, keyName, scaleIdx, changeEveryBars = 4, options = {}) {
  if (!barTimeline) return null;

  const selectedChords = (options.selectedChords || [])
    .map((s) => ({
      chordRootNote: parseInt(s.chordRootNote, 10),
      chordIdx: parseInt(s.chordIdx, 10)
    }))
    .filter((s) => s.chordRootNote >= 1 && s.chordRootNote <= 12 && s.chordIdx >= 0);

  const validatedPicker = selectedChords
    .map((s, i) => chordFromPickerSelection(keyName, scaleIdx, s, { pickerIndex: i }))
    .filter(Boolean);

  const changes = [];
  for (let bar = 0; bar < barTimeline.totalBars; bar += changeEveryBars) {
    let chord;
    if (validatedPicker.length) {
      const pick = validatedPicker[Math.floor(bar / changeEveryBars) % validatedPicker.length];
      chord = { ...pick, bar, progressionIndex: Math.floor(bar / changeEveryBars) % validatedPicker.length };
    } else {
      const progIdx = Math.floor(bar / changeEveryBars) % PROGRESSIVE_PROGRESSION.length;
      chord = {
        bar,
        ...chordAtProgressionIndex(keyName, scaleIdx, progIdx, PROGRESSIVE_PROGRESSION)
      };
    }
    changes.push(chord);
  }

  const cadenced = applySectionCadences(changes, barTimeline, keyName, scaleIdx, changeEveryBars);
  return {
    changes: cadenced,
    changeEveryBars,
    progression: progressionLabel(validatedPicker, keyName, scaleIdx)
  };
}

function getChordAtBar(chordTimeline, bar) {
  if (!chordTimeline?.changes?.length) return defaultFallbackChord();
  let current = chordTimeline.changes[0];
  for (const c of chordTimeline.changes) {
    if (c.bar <= bar) current = c;
    else break;
  }
  return current;
}

/** @deprecated use buildTonicCadenceChord */
function buildTonicChord(keyName, scaleIdx) {
  return buildTonicCadenceChord(keyName, scaleIdx);
}

/** @deprecated use buildDominantCadenceChord */
function buildDominantChord(keyName, scaleIdx) {
  return buildDominantCadenceChord(keyName, scaleIdx);
}

/** @deprecated */
function chordRootAtProgressionIndex(keyName, scaleIdx, progressionIndex) {
  return chordAtProgressionIndex(keyName, scaleIdx, progressionIndex, PROGRESSIVE_PROGRESSION);
}

module.exports = {
  PROGRESSIVE_PROGRESSION,
  buildChordTimeline,
  getChordAtBar,
  chordRootAtProgressionIndex,
  buildTonicChord,
  buildDominantChord,
  applySectionCadences,
  defaultFallbackChord
};
