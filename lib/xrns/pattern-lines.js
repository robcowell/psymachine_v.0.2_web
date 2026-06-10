/**
 * Build PatternTrack <Lines> XML from note cell arrays.
 * Cells may be a single note token or an array of tokens (chord columns).
 */

const { normalizeRenoiseNoteToken, instrumentToHex2 } = require('../music-theory');
const { notesInCell } = require('./note-cells');

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildNoteColumnInner(noteXml, instHex) {
  let inner = `                    <Note>${escapeXml(noteXml)}</Note>\n`;
  if (noteXml !== 'OFF') {
    inner += `                    <Instrument>${instHex}</Instrument>\n`;
  }
  return inner;
}

function buildLineXml(lineIndex, cell, instHex) {
  const notes = notesInCell(cell)
    .map((n) => normalizeRenoiseNoteToken(n))
    .filter(Boolean);
  if (!notes.length) return '';

  const columns = notes.map(
    (noteXml) =>
      `                  <NoteColumn>\n${buildNoteColumnInner(noteXml, instHex)}                  </NoteColumn>`
  ).join('\n');

  return (
    `              <Line index="${lineIndex}">\n` +
    `                <NoteColumns>\n${columns}\n` +
    `                </NoteColumns>\n` +
    `                <EffectColumns>\n` +
    `                  <EffectColumn/>\n` +
    `                </EffectColumns>\n` +
    `              </Line>`
  );
}

function buildPatternLinesXml(cells, instrument) {
  const instHex = instrumentToHex2(instrument);
  const lines = [];
  for (let i = 0; i < cells.length; i++) {
    const lineXml = buildLineXml(i, cells[i], instHex);
    if (lineXml) lines.push(lineXml);
  }
  if (!lines.length) return '';
  return `            <Lines>\n${lines.join('\n')}\n            </Lines>\n`;
}

function buildPatternTrackXml(cells, instrument, emptyPatternTrackTemplate) {
  const linesXml = buildPatternLinesXml(cells, instrument);
  if (!linesXml) return emptyPatternTrackTemplate;
  return emptyPatternTrackTemplate
    .replace(
      '<SelectedPresetIsModified>false</SelectedPresetIsModified>',
      '<SelectedPresetIsModified>true</SelectedPresetIsModified>'
    )
    .replace(/\s*<AliasPatternIndex>/, `\n${linesXml}            <AliasPatternIndex>`);
}

module.exports = {
  buildPatternLinesXml,
  buildPatternTrackXml,
  buildLineXml,
  buildNoteColumnInner
};
