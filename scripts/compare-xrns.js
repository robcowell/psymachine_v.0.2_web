const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { generateSongXrns } = require('../lib/song-generator');

async function extractSongXml(xrnsPath) {
  const buf = fs.readFileSync(xrnsPath);
  const zip = await JSZip.loadAsync(buf);
  return zip.file('Song.xml').async('string');
}

function analyze(xml, label) {
  const docVer = (xml.match(/doc_version="(\d+)"/) || [])[1];
  const seqTracks = (xml.match(/<SequencerTrack type="SequencerTrack">/g) || []).length;
  const patterns = (xml.match(/<Pattern>/g) || []).length;
  const instrumentsSection = xml.match(/<Instruments>[\s\S]*?<\/Instruments>/);
  const instruments = instrumentsSection
    ? (instrumentsSection[0].match(/<Instrument>/g) || []).length
    : 0;
  const hasInstrumentsWrapper = Boolean(instrumentsSection);
  const firstPattern = xml.split('<Pattern>')[1]?.split('</Pattern>')[0] || '';
  const pt = (firstPattern.match(/<PatternTrack type="PatternTrack">/g) || []).length;
  const pm = (firstPattern.match(/<PatternMasterTrack/g) || []).length;
  const ps = (firstPattern.match(/<PatternSendTrack/g) || []).length;
  const seqEntries = (xml.match(/<SequenceEntry>/g) || []).length;
  const linesBlocks = (xml.match(/<Lines>/g) || []).length;
  console.log(`\n=== ${label} ===`);
  console.log('doc_version:', docVer);
  console.log('sequencer tracks:', seqTracks);
  console.log('instruments wrapper:', hasInstrumentsWrapper, 'count:', instruments);
  console.log('patterns:', patterns);
  console.log('pattern tracks (first pattern):', pt, '+ master', pm, '+ send', ps);
  console.log('sequence entries:', seqEntries);
  console.log('Lines blocks:', linesBlocks);
  console.log('xml bytes:', Buffer.byteLength(xml));
}

async function main() {
  const out = path.join(__dirname, '../templates/debug-output.xrns');
  if (!fs.existsSync(out)) {
    const r = await generateSongXrns({ patternCount: 4, linesPerPattern: 64, bpm: 145, lpb: 8, seed: 1 });
    fs.writeFileSync(out, Buffer.from(r.xrnsBase64, 'base64'));
  }
  const genXml = await extractSongXml(out);
  const refXml = await extractSongXml(path.join(__dirname, '../templates/TestWrite.xrns'));
  analyze(refXml, 'TestWrite.xrns');
  analyze(genXml, 'Generated');
}

main().catch(e => { console.error(e); process.exit(1); });
