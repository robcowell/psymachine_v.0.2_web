/**
 * Melodic contour shapes — tension behaviour before pitch selection.
 * Contours are 0–4 scale indices, mapped to scale degrees when building motifs.
 */

const CONTOURS = {
  climb: [0, 1, 2, 3, 4],
  fall: [4, 3, 2, 1, 0],
  arch: [0, 1, 2, 1, 0],
  valley: [2, 1, 0, 1, 2],
  orbit: [0, 2, 0, 4, 0]
};

const TENSION_MAP = {
  climb: 'climb',
  fall: 'fall',
  arch: 'climb',
  valley: 'fall',
  orbit: 'orbit'
};

function pickContour(rng, prefer) {
  const names = prefer ? [prefer] : Object.keys(CONTOURS);
  const name = names[(rng() * names.length) | 0];
  return { name, values: CONTOURS[name].slice(), tension: TENSION_MAP[name] };
}

/** Stretch or trim contour to target note count. */
function contourToDegrees(contourValues, noteCount, maxDegree) {
  const out = [];
  const max = Math.max(0, maxDegree);
  for (let i = 0; i < noteCount; i++) {
    const t = noteCount <= 1 ? 0 : i / (noteCount - 1);
    const idx = Math.min(contourValues.length - 1, Math.round(t * (contourValues.length - 1)));
    const norm = contourValues[idx] / 4;
    out.push(Math.round(norm * max));
  }
  return out;
}

module.exports = {
  CONTOURS,
  pickContour,
  contourToDegrees
};
