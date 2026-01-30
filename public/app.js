(function () {
  const ids = {
    baseNote: 'baseNote',
    otherNotes: 'otherNotes',
    baseNoteP: 'baseNoteP',
    otherNotesP: 'otherNotesP',
    removeNoteP: 'removeNoteP',
    addNoteP: 'addNoteP',
    changeNoteP: 'changeNoteP',
    noteOffP: 'noteOffP',
    noteOffVariationP: 'noteOffVariationP',
    noteFlutterP: 'noteFlutterP',
    trackLen: 'trackLen',
    arpeggioLen: 'arpeggioLen',
    instrumentNumber: 'instrumentNumber',
    ticksPerBeat: 'ticksPerBeat',
    seed: 'seed',
    noteOffOnBeat: 'noteOffOnBeat',
    noteOnFirstTick: 'noteOnFirstTick'
  };

  function getParams() {
    return {
      baseNote: document.getElementById(ids.baseNote).value.trim(),
      otherNotes: document.getElementById(ids.otherNotes).value.trim(),
      baseNoteP: document.getElementById(ids.baseNoteP).value,
      otherNotesP: document.getElementById(ids.otherNotesP).value,
      removeNoteP: document.getElementById(ids.removeNoteP).value,
      addNoteP: document.getElementById(ids.addNoteP).value,
      changeNoteP: document.getElementById(ids.changeNoteP).value,
      noteOffP: document.getElementById(ids.noteOffP).value,
      noteOffVariationP: document.getElementById(ids.noteOffVariationP).value,
      noteFlutterP: document.getElementById(ids.noteFlutterP).value,
      trackLen: document.getElementById(ids.trackLen).value,
      arpeggioLen: document.getElementById(ids.arpeggioLen).value,
      instrumentNumber: document.getElementById(ids.instrumentNumber).value.trim(),
      ticksPerBeat: document.getElementById(ids.ticksPerBeat).value,
      seed: document.getElementById(ids.seed).value,
      noteOffOnBeat: document.getElementById(ids.noteOffOnBeat).checked,
      noteOnFirstTick: document.getElementById(ids.noteOnFirstTick).checked
    };
  }

  function setParams(p) {
    if (!p) return;
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = Boolean(value);
      else el.value = value == null ? '' : value;
    };
    set(ids.baseNote, p.baseNote);
    set(ids.otherNotes, p.otherNotes);
    set(ids.baseNoteP, p.baseNoteP);
    set(ids.otherNotesP, p.otherNotesP);
    set(ids.removeNoteP, p.removeNoteP);
    set(ids.addNoteP, p.addNoteP);
    set(ids.changeNoteP, p.changeNoteP);
    set(ids.noteOffP, p.noteOffP);
    set(ids.noteOffVariationP, p.noteOffVariationP);
    set(ids.noteFlutterP, p.noteFlutterP);
    set(ids.trackLen, p.trackLen);
    set(ids.arpeggioLen, p.arpeggioLen);
    set(ids.instrumentNumber, p.instrumentNumber);
    set(ids.ticksPerBeat, p.ticksPerBeat);
    set(ids.seed, p.seed);
    set(ids.noteOffOnBeat, p.noteOffOnBeat);
    set(ids.noteOnFirstTick, p.noteOnFirstTick);
  }

  function showMessage(text, type) {
    const el = document.getElementById('message');
    el.textContent = text;
    el.className = 'message ' + (type || '');
    el.hidden = false;
    if (text) setTimeout(() => { el.hidden = true; el.textContent = ''; }, 3000);
  }

  async function generate() {
    const output = document.getElementById('output');
    const btn = document.getElementById('btnGenerate');
    btn.disabled = true;
    output.textContent = '';
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getParams())
      });
      const text = await res.text();
      if (!res.ok) {
        let err = text;
        try { err = JSON.parse(text).error || err; } catch (_) {}
        showMessage(err || 'Invalid parameters', 'error');
        return;
      }
      output.textContent = text;
      showMessage('Generated. Copy and paste into Renoise.', 'success');
    } catch (e) {
      showMessage('Network error: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  function copyOutput() {
    const pre = document.getElementById('output');
    if (!pre.textContent) {
      showMessage('Nothing to copy. Generate first.', 'error');
      return;
    }
    navigator.clipboard.writeText(pre.textContent).then(() => {
      showMessage('Copied to clipboard.', 'success');
    }).catch(() => {
      showMessage('Could not copy.', 'error');
    });
  }

  function randomizePercents() {
    const percentIds = ['baseNoteP', 'otherNotesP', 'removeNoteP', 'addNoteP', 'changeNoteP', 'noteOffP', 'noteOffVariationP', 'noteFlutterP'];
    percentIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = Math.floor(Math.random() * 101);
    });
    document.getElementById(ids.seed).value = Math.floor(Math.random() * 2147483647);
  }

  function savePreset() {
    const preset = getParams();
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'psymachine-preset.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showMessage('Preset saved.', 'success');
  }

  function loadPresetFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        let data;
        if (file.name.endsWith('.pmp')) {
          const lines = text.split(/\r?\n/).filter(Boolean);
          if (lines.length < 2) throw new Error('Invalid .pmp file');
          data = {
            baseNote: lines[0] || '',
            otherNotes: lines[1] || '',
            baseNoteP: lines[2] || '40',
            otherNotesP: lines[3] || '50',
            removeNoteP: lines[4] || '5',
            addNoteP: lines[5] || '20',
            changeNoteP: lines[6] || '20',
            noteOffP: lines[7] || '40',
            noteOffVariationP: lines[8] || '20',
            noteFlutterP: lines[9] || '20',
            trackLen: lines[10] || '256',
            arpeggioLen: lines[11] || '64',
            instrumentNumber: lines[12] || '0',
            ticksPerBeat: lines[13] || '8',
            seed: lines[14] || '0',
            noteOffOnBeat: lines[15] === '1',
            noteOnFirstTick: lines[16] === '1'
          };
        } else {
          data = JSON.parse(text);
        }
        setParams(data);
        showMessage('Preset loaded.', 'success');
      } catch (e) {
        showMessage('Invalid preset file: ' + e.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  document.getElementById('btnGenerate').addEventListener('click', generate);
  document.getElementById('btnCopy').addEventListener('click', copyOutput);
  document.getElementById('btnRandomize').addEventListener('click', randomizePercents);
  document.getElementById('btnSavePreset').addEventListener('click', savePreset);
  document.getElementById('btnLoadPreset').addEventListener('click', () => document.getElementById('presetFile').click());
  document.getElementById('presetFile').addEventListener('change', function () {
    const file = this.files[0];
    if (file) loadPresetFile(file);
    this.value = '';
  });

  /* Scale finder: Key sets base note; multi-select chords → unique notes in other notes */
  const OCTAVE = '4';
  const selectedChords = new Set();

  function chordKey(chordRootNote, chordIdx) {
    return chordRootNote + ',' + chordIdx;
  }

  function applySelectedChordsToOtherNotes() {
    const keyName = document.getElementById('scaleKey') && document.getElementById('scaleKey').value;
    if (!keyName || typeof ScaleData === 'undefined') return;
    const seen = new Set();
    const noteNames = [];
    selectedChords.forEach(key => {
      const [root, idx] = key.split(',').map(Number);
      ScaleData.getChordNoteNames(root, idx).forEach(n => {
        if (!seen.has(n)) { seen.add(n); noteNames.push(n); }
      });
    });
    const otherNotesEl = document.getElementById(ids.otherNotes);
    if (otherNotesEl) otherNotesEl.value = noteNames.map(n => n + '-' + OCTAVE).join(' ');
    const infoEl = document.getElementById('chordInfo');
    if (infoEl) {
      if (selectedChords.size === 0) infoEl.textContent = '';
      else infoEl.textContent = selectedChords.size + ' chord(s) selected – ' + noteNames.join(', ');
    }
  }

  function initScaleFinder() {
    if (typeof ScaleData === 'undefined') return;
    const keySelect = document.getElementById('scaleKey');
    const scaleSelect = document.getElementById('scaleMode');
    if (!keySelect || !scaleSelect) return;
    ScaleData.notes.forEach(n => {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      keySelect.appendChild(o);
    });
    ScaleData.scales.forEach((s, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = s.name;
      scaleSelect.appendChild(o);
    });
    keySelect.value = 'C';
    scaleSelect.value = '2';
    document.getElementById(ids.baseNote).value = 'C-' + OCTAVE;

    function updateScaleDisplay() {
      const keyName = keySelect.value;
      const scaleIdx = parseInt(scaleSelect.value, 10) || 0;
      const root = ScaleData.keyToRoot[keyName];
      const scale = ScaleData.scales[scaleIdx];
      if (root == null || !scale) return;

      document.getElementById(ids.baseNote).value = keyName + '-' + OCTAVE;

      selectedChords.clear();
      const scaleNotes = ScaleData.getScaleNotes(root, scale);
      const displayEl = document.getElementById('scaleNotesDisplay');
      if (displayEl) displayEl.value = scaleNotes.join(', ');
      const valid = ScaleData.getValidChordsForScale(root, scale);
      const gridEl = document.getElementById('chordGrid');
      if (!gridEl) return;
      gridEl.innerHTML = '';
      valid.forEach(col => {
        const colEl = document.createElement('div');
        colEl.className = 'chord-column';
        const romanEl = document.createElement('div');
        romanEl.className = 'roman';
        romanEl.textContent = col.roman;
        colEl.appendChild(romanEl);
        col.chords.forEach(c => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'chord-btn';
          btn.textContent = c.label;
          btn.dataset.chordRootNote = String(c.chordRootNote);
          btn.dataset.chordIdx = String(c.chordIdx);
          const key = chordKey(c.chordRootNote, c.chordIdx);
          if (selectedChords.has(key)) btn.classList.add('selected');
          btn.addEventListener('click', () => {
            const chordRootNote = c.chordRootNote;
            const chordIdx = c.chordIdx;
            const key = chordKey(chordRootNote, chordIdx);
            if (selectedChords.has(key)) {
              selectedChords.delete(key);
              btn.classList.remove('selected');
            } else {
              selectedChords.add(key);
              btn.classList.add('selected');
            }
            applySelectedChordsToOtherNotes();
          });
          colEl.appendChild(btn);
        });
        gridEl.appendChild(colEl);
      });
      applySelectedChordsToOtherNotes();
    }

    keySelect.addEventListener('change', () => {
      document.getElementById(ids.baseNote).value = keySelect.value + '-' + OCTAVE;
      selectedChords.clear();
      updateScaleDisplay();
    });
    scaleSelect.addEventListener('change', () => {
      selectedChords.clear();
      updateScaleDisplay();
    });
    updateScaleDisplay();
  }

  fetch('/api/preset/default').then(r => r.json()).then(setParams).catch(() => {});
  initScaleFinder();
})();
