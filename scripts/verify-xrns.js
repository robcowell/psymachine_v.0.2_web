const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function verify(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const x = await zip.file('Song.xml').async('string');
  const doc = (x.match(/doc_version="(\d+)"/) || [])[1];
  console.log(path.basename(file));
  console.log('  doc_version:', doc);
  console.log('  Instruments wrapper:', x.includes('<Instruments>') && x.includes('</Instruments>'));
  console.log('  EffectColumn count:', (x.match(/<EffectColumn/g) || []).length);
  console.log('  corrupted macro rename:', x.includes('<Name>Instrument 02</Name>'));
  console.log('  bytes:', Buffer.byteLength(x));
}

async function main() {
  const dir = path.join(__dirname, '../templates');
  for (const f of ['Empty.xrns', 'fixed-v2.xrns', 'minimal-test.xrns']) {
    await verify(path.join(dir, f));
  }
}

main();
