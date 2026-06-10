const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const xrnsPath = process.argv[2] || path.join(__dirname, '../templates/Empty.xrns');
const outDir = path.join(__dirname, '../lib/xrns/parts');

async function main() {
  const buf = fs.readFileSync(xrnsPath);
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('Song.xml').async('string');

  function extractBlock(tag, fromIndex) {
    const openTag = tag.split(' ')[0];
    let i = -1;
    if (openTag === 'Instrument') {
      const re = /<Instrument>/g;
      re.lastIndex = fromIndex || 0;
      const m = re.exec(xml);
      if (m) i = m.index;
    } else {
      const openPatterns = [
        `<${openTag} type="${openTag}">`,
        `<${openTag} type="PatternTrack">`,
        `<${openTag} type="SequencerTrack">`,
        `<${openTag} type="SequencerMasterTrack">`,
        `<${openTag} type="SequencerSendTrack">`,
        `<${openTag} type="PatternMasterTrack">`,
        `<${openTag} type="PatternSendTrack">`
      ];
      for (const p of openPatterns) {
        const at = xml.indexOf(p, fromIndex || 0);
        if (at >= 0 && (i < 0 || at < i)) i = at;
      }
    }
    if (i < 0) return null;
    const close = `</${openTag}>`;
    let depth = 0;
    let j = i;
    while (j < xml.length) {
      let nextOpen = -1;
      if (openTag === 'Instrument') {
        const re = /<Instrument>/g;
        re.lastIndex = j + 1;
        const m = re.exec(xml);
        if (m) nextOpen = m.index;
      } else {
        nextOpen = xml.indexOf(`<${openTag}`, j + 1);
      }
      const nextClose = xml.indexOf(close, j);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose) {
        depth++;
        j = nextOpen + 1;
        continue;
      }
      if (depth === 0) return xml.slice(i, nextClose + close.length);
      depth--;
      j = nextClose + close.length;
    }
    return null;
  }

  const instrumentsStart = xml.indexOf('<Instruments>');
  const instrument = extractBlock('Instrument', instrumentsStart);
  const sequencerTrack = extractBlock('SequencerTrack');
  const sequencerMaster = extractBlock('SequencerMasterTrack');
  const sequencerSend = extractBlock('SequencerSendTrack');
  const patternMaster = extractBlock('PatternMasterTrack');
  const patternSend = extractBlock('PatternSendTrack');
  const patternTrackEmpty = extractBlock('PatternTrack', xml.indexOf('<PatternPool>'));

  const headEnd = xml.indexOf('<Instruments>');
  const head = xml.slice(0, headEnd);
  const tailAfterTracks = xml.slice(xml.indexOf('</Tracks>'), xml.indexOf('<PatternPool>'));

  fs.mkdirSync(outDir, { recursive: true });
  const files = {
    head,
    instrument,
    sequencerTrack,
    sequencerMaster,
    sequencerSend,
    patternTrackEmpty,
    patternMaster,
    patternSend,
    tailAfterTracks
  };
  for (const [name, content] of Object.entries(files)) {
    if (!content) {
      console.error('Missing:', name);
      process.exit(1);
    }
    fs.writeFileSync(path.join(outDir, name + '.xml'), content);
    console.log(name, content.length, 'doc_version', (xml.match(/doc_version="(\d+)"/) || [])[1]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
