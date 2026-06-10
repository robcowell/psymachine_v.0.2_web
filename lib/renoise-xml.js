/**
 * Build Renoise pattern clipboard XML for one or more note columns (tracks).
 */

const { normalizeRenoiseNoteToken, instrumentToHex2 } = require('./music-theory');
const { buildLineXml } = require('./xrns/pattern-lines');

/**
 * @typedef {{ name: string, cells: string[], instrument: string|number }} TrackColumn
 */

function buildNoteColumnXml(trackLength, cells, instHex) {
  let xml = '<Column>\n<Lines>\n';
  for (let a = 0; a < trackLength; a++) {
    const lineXml = buildLineXml(a, cells[a], instHex);
    if (lineXml) {
      xml += lineXml.replace(/^              /gm, '') + '\n';
    } else {
      xml += '<Line/>\n';
    }
  }
  xml += '</Lines>\n';
  xml += '<ColumnType>NoteColumn</ColumnType>\n';
  xml += '<SubColumnMask>true true true false false false false false</SubColumnMask>\n';
  xml += '</Column>\n';
  return xml;
}

function buildEffectColumnXml(trackLength) {
  let xml = '<Column>\n<Lines>\n';
  for (let a = 0; a < trackLength; a++) xml += '<Line/>\n';
  xml += '</Lines>\n';
  xml += '<ColumnType>EffectColumn</ColumnType>\n';
  xml += '<SubColumnMask>false false false false false true true false</SubColumnMask>\n';
  xml += '</Column>\n';
  return xml;
}

/**
 * Build XML for a single track (legacy format).
 */
function buildSingleTrackXml(trackLength, cells, instrument) {
  const instHex = instrumentToHex2(instrument);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<PatternClipboard.BlockBuffer doc_version="0">\n';
  xml += '<Columns>\n<Column>\n';
  xml += buildNoteColumnXml(trackLength, cells, instHex);
  xml += buildEffectColumnXml(trackLength);
  xml += '</Column>\n</Columns>\n</PatternClipboard.BlockBuffer>\n';
  return xml;
}

/**
 * Build XML for multiple tracks. Each track becomes a Column group in Renoise clipboard.
 * Paste into consecutive tracks in Renoise.
 *
 * @param {TrackColumn[]} tracks
 * @param {number} trackLength
 */
function buildMultiTrackXml(tracks, trackLength) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<PatternClipboard.BlockBuffer doc_version="0">\n';
  xml += '<Columns>\n';
  for (const track of tracks) {
    const instHex = instrumentToHex2(track.instrument);
    xml += '<Column>\n';
    xml += buildNoteColumnXml(trackLength, track.cells, instHex);
    xml += buildEffectColumnXml(trackLength);
    xml += '</Column>\n';
  }
  xml += '</Columns>\n</PatternClipboard.BlockBuffer>\n';
  return xml;
}

module.exports = { buildSingleTrackXml, buildMultiTrackXml, buildNoteColumnXml };
