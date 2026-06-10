/**
 * Chord progression engine — progressive psy i VI III VII.
 */

const { keyToRoot, getScaleDegreeIndices, getNname, findScaleByIndex } = require('../scale-data');
const { formatRenoiseNote, NON_MELODIC_OCTAVE } = require('../music-theory');

/** Scale degrees for i VI III VII (0-based index into 7-note scale). */
const PROGRESSIVE_PROGRESSION = [0, 5, 2, 6];

function addSemitones(noteIdx, semitones) {
  return ((noteIdx - 1 + semitones) % 12) + 1;
}

function formatTriad(rootIdx, thirdIdx, fifthIdx, degree = 0) {
  return {
    degree,
    rootNote: formatRenoiseNote(getNname(rootIdx), NON_MELODIC_OCTAVE),
    thirdNote: formatRenoiseNote(getNname(thirdIdx), NON_MELODIC_OCTAVE),
    fifthNote: formatRenoiseNote(getNname(fifthIdx), NON_MELODIC_OCTAVE)
  };
}

/** i — tonic triad from scale degree 0. */
function buildTonicChord(keyName, scaleIdx) {
  return chordRootAtProgressionIndex(keyName, scaleIdx, 0);
}

/** V — major dominant triad on scale degree 4 (raised 3rd in minor keys, Ch. 20). */
function buildDominantChord(keyName, scaleIdx) {
  const root = keyToRoot[keyName];
  const scale = findScaleByIndex(parseInt(scaleIdx, 10) || 0);
  if (root == null || !scale) return buildTonicChord(keyName, scaleIdx);
  const degrees = getScaleDegreeIndices(root, scale);
  const vRoot = degrees[4] || degrees[0];
  return formatTriad(vRoot, addSemitones(vRoot, 4), addSemitones(vRoot, 7), 4);
}

function chordRootAtProgressionIndex(keyName, scaleIdx, progressionIndex) {
  const root = keyToRoot[keyName];
  const scale = findScaleByIndex(parseInt(scaleIdx, 10) || 0);
  if (root == null || !scale) return { degree: 0, rootNote: 'C-4' };

  const degrees = getScaleDegreeIndices(root, scale);
  const degIdx = PROGRESSIVE_PROGRESSION[progressionIndex % PROGRESSIVE_PROGRESSION.length];
  const semitone = degrees[degIdx] || degrees[0];
  const third = degrees[(degIdx + 2) % degrees.length] || semitone;
  const fifth = degrees[(degIdx + 4) % degrees.length] || semitone;
  return {
    degree: degIdx,
    rootNote: formatRenoiseNote(getNname(semitone), NON_MELODIC_OCTAVE),
    thirdNote: formatRenoiseNote(getNname(third), NON_MELODIC_OCTAVE),
    fifthNote: formatRenoiseNote(getNname(fifth), NON_MELODIC_OCTAVE)
  };
}

/**
 * Overlay V→i cadences on the last 8 bars of each section (4 bars V, 4 bars i).
 */
function applySectionCadences(changes, barTimeline, keyName, scaleIdx, changeEveryBars) {
  if (!barTimeline?.sections?.length || !changes?.length) return changes;

  const byBar = new Map(changes.map((c) => [c.bar, { ...c }]));
  const tonic = buildTonicChord(keyName, scaleIdx);
  const dominant = buildDominantChord(keyName, scaleIdx);

  for (const section of barTimeline.sections) {
    const sectionLen = section.endBar - section.startBar;
    if (sectionLen < changeEveryBars) continue;

    const tonicBar = section.endBar - changeEveryBars;
    const dominantBar = tonicBar - changeEveryBars;

    byBar.set(tonicBar, {
      bar: tonicBar,
      cadence: 'i',
      progressionIndex: null,
      ...tonic
    });

    if (dominantBar >= section.startBar) {
      byBar.set(dominantBar, {
        bar: dominantBar,
        cadence: 'V',
        progressionIndex: null,
        ...dominant
      });
    }
  }

  return [...byBar.values()].sort((a, b) => a.bar - b.bar);
}

/**
 * Build chord change map: one chord every 4 bars across the timeline.
 */
function buildChordTimeline(barTimeline, keyName, scaleIdx, changeEveryBars = 4) {
  if (!barTimeline) return null;

  const changes = [];
  for (let bar = 0; bar < barTimeline.totalBars; bar += changeEveryBars) {
    const progIdx = Math.floor(bar / changeEveryBars) % PROGRESSIVE_PROGRESSION.length;
    changes.push({
      bar,
      progressionIndex: progIdx,
      ...chordRootAtProgressionIndex(keyName, scaleIdx, progIdx)
    });
  }

  const cadenced = applySectionCadences(changes, barTimeline, keyName, scaleIdx, changeEveryBars);
  return { changes: cadenced, changeEveryBars, progression: 'i-VI-III-VII' };
}

function getChordAtBar(chordTimeline, bar) {
  if (!chordTimeline?.changes?.length) {
    return { rootNote: 'C-4', thirdNote: 'E-4', fifthNote: 'G-4' };
  }
  let current = chordTimeline.changes[0];
  for (const c of chordTimeline.changes) {
    if (c.bar <= bar) current = c;
    else break;
  }
  return current;
}

module.exports = {
  PROGRESSIVE_PROGRESSION,
  buildChordTimeline,
  getChordAtBar,
  chordRootAtProgressionIndex,
  buildTonicChord,
  buildDominantChord,
  applySectionCadences
};
