/**
 * Phrase assembly — A A' B A'' structures from motif family variants.
 */

const { barLengthLines } = require('./motif-generator');

function emptyCells(len) {
  return Array(len).fill('');
}

function resolveSlotVariant(slot, motifFamily, parentCells) {
  const key = slot === 'A' ? 'A'
    : slot === "A'" ? "A'"
      : slot === 'B' ? 'B'
        : slot === "A''" ? "A''"
          : slot === 'C' ? 'B'
            : 'A';
  return motifFamily[key] || motifFamily.A || parentCells;
}

/**
 * Lay phrase slots (1 bar each) across track length.
 */
function slotWidthForMotif(motifCells, barLines) {
  if (!motifCells?.length) return barLines;
  if (motifCells.length >= barLines * 2) return barLines * 2;
  return barLines;
}

function renderPhraseStructure(phraseSlots, motifFamily, parentCells, trackLength, lpb) {
  const barLines = barLengthLines(lpb);
  const out = emptyCells(trackLength);

  let pos = 0;
  while (pos < trackLength) {
    for (let s = 0; s < phraseSlots.length && pos < trackLength; s++) {
      const slotCells = resolveSlotVariant(phraseSlots[s], motifFamily, parentCells);
      const slotLen = slotWidthForMotif(slotCells, barLines);
      for (let i = 0; i < slotLen && pos + i < trackLength; i++) {
        if (slotCells[i]) out[pos + i] = slotCells[i];
      }
      pos += slotLen;
    }
  }
  return out;
}

module.exports = {
  renderPhraseStructure,
  resolveSlotVariant
};
