/**
 * Build PatternTrack <Lines> XML from note cell arrays.
 */

const { normalizeRenoiseNoteToken, instrumentToHex2 } = require('../music-theory');

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildPatternLinesXml(cells, instrument) {
  const instHex = instrumentToHex2(instrument);
  const lines = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell || cell === '') continue;
    const noteXml = normalizeRenoiseNoteToken(cell);
    if (!noteXml) continue;
    let noteInner = `                    <Note>${escapeXml(noteXml)}</Note>\n`;
    if (noteXml !== 'OFF') {
      noteInner += `                    <Instrument>${instHex}</Instrument>\n`;
    }
    lines.push(
      `              <Line index="${i}">\n` +
      `                <NoteColumns>\n` +
      `                  <NoteColumn>\n${noteInner}                  </NoteColumn>\n` +
      `                </NoteColumns>\n` +
      `                <EffectColumns>\n` +
      `                  <EffectColumn/>\n` +
      `                </EffectColumns>\n` +
      `              </Line>`
    );
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

module.exports = { buildPatternLinesXml, buildPatternTrackXml };
