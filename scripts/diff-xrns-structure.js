const fs = require('fs');
const path = require('path');

function collectTags(xml, prefix) {
  const re = /<([A-Za-z][A-Za-z0-9]*)(?:\s[^>/]*)?\/?>/g;
  const counts = new Map();
  let m;
  while ((m = re.exec(xml))) {
    const tag = m[1];
    if (prefix && !xml.slice(Math.max(0, m.index - 200), m.index + 200).includes(prefix)) continue;
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return counts;
}

function compare(aPath, bPath, labelA, labelB) {
  const a = fs.readFileSync(aPath, 'utf8');
  const b = fs.readFileSync(bPath, 'utf8');
  const aTags = collectTags(a);
  const bTags = collectTags(b);
  const all = new Set([...aTags.keys(), ...bTags.keys()]);
  const diffs = [];
  for (const t of [...all].sort()) {
    const av = aTags.get(t) || 0;
    const bv = bTags.get(t) || 0;
    if (av !== bv) diffs.push({ tag: t, a: av, b: bv });
  }
  console.log(`\nTag count diffs: ${labelA} vs ${labelB}`);
  diffs.slice(0, 40).forEach(d => console.log(`  ${d.tag}: ${d.a} -> ${d.b}`));
  console.log('... total diffs:', diffs.length);
}

const base = path.join(__dirname, '../templates/extracted');
compare(path.join(base, 'Empty-Song.xml'), path.join(base, 'fixed-test-Song.xml'), 'Empty', 'Generated');
