const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function extract(xrnsPath) {
  const buf = fs.readFileSync(xrnsPath);
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files);
  const song = await zip.file('Song.xml').async('string');
  return { names, song };
}

function topLevelChildren(xml) {
  const re = /^\s*<([A-Za-z][A-Za-z0-9]*)(?:\s[^>]*)?>/gm;
  const children = [];
  let m;
  const rootEnd = xml.indexOf('>', xml.indexOf('<RenoiseSong'));
  let depth = 0;
  for (let i = rootEnd + 1; i < xml.length; i++) {
    if (xml.slice(i, i + 2) === '</') {
      const close = xml.indexOf('>', i);
      const tag = xml.slice(i + 2, close);
      if (tag === 'RenoiseSong') break;
      if (depth === 1) children.push('</' + tag + '>');
      depth--;
      i = close;
      continue;
    }
    if (xml[i] !== '<') continue;
    const close = xml.indexOf('>', i);
    if (close < 0) break;
    const raw = xml.slice(i + 1, close);
    if (raw.startsWith('?') || raw.startsWith('!')) { i = close; continue; }
    const selfClose = raw.endsWith('/');
    const tag = raw.split(/\s/)[0].replace(/\/$/, '');
    if (depth === 1) children.push('<' + tag + '>');
    if (!selfClose) depth++;
    i = close;
  }
  return children;
}

function analyze(song, label) {
  const docVer = (song.match(/doc_version="(\d+)"/) || [])[1];
  const children = topLevelChildren(song);
  const seq = (song.match(/<SequencerTrack type="SequencerTrack">/g) || []).length;
  const instBlock = song.match(/<Instruments>[\s\S]*?<\/Instruments>/);
  const instCount = instBlock ? (instBlock[0].match(/<Instrument>/g) || []).length : -1;
  const patterns = (song.match(/<PatternPool>[\s\S]*?<\/PatternPool>/)?.[0].match(/<Pattern>/g) || []).length;
  const seqEntries = (song.match(/<PatternSequence>[\s\S]*?<\/PatternSequence>/)?.[0].match(/<SequenceEntry>/g) || []).length;
  const firstPattern = song.match(/<PatternPool>[\s\S]*?<Pattern>([\s\S]*?)<\/Pattern>/)?.[1] || '';
  const pt = (firstPattern.match(/<PatternTrack type="PatternTrack">/g) || []).length;
  const bpm = (song.match(/<BeatsPerMin>(\d+)<\/BeatsPerMin>/) || [])[1];
  const lpb = (song.match(/<LinesPerBeat>(\d+)<\/LinesPerBeat>/) || [])[1];
  const tpl = (song.match(/<TicksPerLine>(\d+)<\/TicksPerLine>/) || [])[1];
  const pev = (song.match(/<PlaybackEngineVersion>(\d+)<\/PlaybackEngineVersion>/) || [])[1];
  const zipEntries = label.zipNames || [];

  console.log('\n=== ' + label.name + ' ===');
  console.log('zip entries:', zipEntries.join(', ') || '(n/a)');
  console.log('doc_version:', docVer, '| BPM:', bpm, '| LPB:', lpb, '| TPL:', tpl, '| PlaybackEngine:', pev);
  console.log('top-level children:', children.join(' '));
  console.log('sequencer tracks:', seq, '| instruments:', instCount, '| patterns:', patterns, '| sequence entries:', seqEntries);
  console.log('pattern tracks (1st pattern):', pt, '+ master/send');
  console.log('bytes:', Buffer.byteLength(song));
}

async function main() {
  const files = [
    'templates/Empty.xrns',
    'templates/2026progpsy.xrns',
    'templates/fixed-v2.xrns'
  ];
  for (const f of files) {
    const p = path.join(__dirname, '..', f);
    if (!fs.existsSync(p)) { console.log('missing', f); continue; }
    const { names, song } = await extract(p);
    const out = path.join(__dirname, '../templates/extracted', path.basename(f, '.xrns') + '-Song.xml');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, song);
    analyze(song, { name: f, zipNames: names });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
