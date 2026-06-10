/**
 * Chord progression engine — progressive psy i VI III VII.
 */

const { keyToRoot, getScaleDegreeIndices, getNname, findScaleByIndex } = require('../scale-data');
const { formatRenoiseNote, NON_MELODIC_OCTAVE } = require('../music-theory');

/** Scale degrees for i VI III VII (0-based index into 7-note scale). */
const PROGRESSIVE_PROGRESSION = [0, 5, 2, 6];

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
  return { changes, changeEveryBars, progression: 'i-VI-III-VII' };
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
  chordRootAtProgressionIndex
};
