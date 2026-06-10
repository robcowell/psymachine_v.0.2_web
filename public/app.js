(function () {
  let currentMode = 'song';
  let arrangements = [];
  let lastSongResult = null;

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
    noteOnFirstTick: 'noteOnFirstTick',
    bassStyle: 'bassStyle',
    bassVariationP: 'bassVariationP',
    openHatP: 'openHatP',
    hatSkipP: 'hatSkipP',
    snareRollP: 'snareRollP',
    useClap: 'useClap',
    arrangement: 'arrangement',
    linesPerPattern: 'linesPerPattern',
    patternCount: 'patternCount',
    songMinutes: 'songMinutes',
    bpm: 'bpm'
  };

  const trackIds = {
    lead: { enabled: 'trackLead', instrument: 'instLead' },
    lead2: { enabled: 'trackLead2', instrument: 'instLead2' },
    pad: { enabled: 'trackPad', instrument: 'instPad' },
    bass: { enabled: 'trackBass', instrument: 'instBass' },
    kick: { enabled: 'trackKick', instrument: 'instKick' },
    snare: { enabled: 'trackSnare', instrument: 'instSnare' },
    hihat: { enabled: 'trackHihat', instrument: 'instHihat' },
    fx: { enabled: 'trackFx', instrument: 'instFx' },
    perc: { enabled: 'trackPerc', instrument: 'instPerc' }
  };

  function getTracksConfig() {
    const tracks = {};
    for (const [key, cfg] of Object.entries(trackIds)) {
      const enabledEl = document.getElementById(cfg.enabled);
      const instEl = document.getElementById(cfg.instrument);
      tracks[key] = {
        enabled: enabledEl ? enabledEl.checked : false,
        instrument: instEl ? instEl.value.trim() : '0'
      };
    }
    return tracks;
  }

  function setTracksConfig(tracks) {
    if (!tracks) return;
    for (const [key, cfg] of Object.entries(trackIds)) {
      const t = tracks[key];
      if (!t) continue;
      const enabledEl = document.getElementById(cfg.enabled);
      const instEl = document.getElementById(cfg.instrument);
      if (enabledEl && t.enabled != null) enabledEl.checked = Boolean(t.enabled);
      if (instEl && t.instrument != null) instEl.value = t.instrument;
    }
  }

  function getParams() {
    const keySelect = document.getElementById('scaleKey');
    const scaleSelect = document.getElementById('scaleMode');
    return {
      mode: currentMode,
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
      linesPerPattern: document.getElementById(ids.linesPerPattern)?.value,
      patternCount: document.getElementById(ids.patternCount)?.value,
      songMinutes: document.getElementById(ids.songMinutes)?.value,
      bpm: document.getElementById(ids.bpm)?.value,
      lpb: document.getElementById(ids.ticksPerBeat).value,
      trackLen: document.getElementById(ids.linesPerPattern)?.value || document.getElementById(ids.trackLen).value,
      arpeggioLen: document.getElementById(ids.arpeggioLen).value,
      instrumentNumber: document.getElementById(ids.instrumentNumber).value.trim(),
      ticksPerBeat: document.getElementById(ids.ticksPerBeat).value,
      seed: document.getElementById(ids.seed).value,
      noteOffOnBeat: document.getElementById(ids.noteOffOnBeat).checked,
      noteOnFirstTick: document.getElementById(ids.noteOnFirstTick).checked,
      scaleKey: keySelect ? keySelect.value : 'E',
      scaleMode: scaleSelect ? scaleSelect.value : '12',
      arrangement: document.getElementById(ids.arrangement)?.value || 'classic',
      bassStyle: document.getElementById(ids.bassStyle)?.value || 'rolling',
      bassVariationP: document.getElementById(ids.bassVariationP)?.value || '25',
      openHatP: document.getElementById(ids.openHatP)?.value || '25',
      hatSkipP: document.getElementById(ids.hatSkipP)?.value || '12',
      snareRollP: document.getElementById(ids.snareRollP)?.value || '30',
      useClap: document.getElementById(ids.useClap)?.checked !== false,
      tracks: getTracksConfig()
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
    set(ids.linesPerPattern, p.linesPerPattern || p.trackLen);
    set(ids.patternCount, p.patternCount);
    set(ids.songMinutes, p.songMinutes);
    set(ids.bpm, p.bpm);
    set(ids.trackLen, p.trackLen || p.linesPerPattern);
    set(ids.arpeggioLen, p.arpeggioLen);
    set(ids.instrumentNumber, p.instrumentNumber);
    set(ids.ticksPerBeat, p.ticksPerBeat);
    set(ids.seed, p.seed);
    set(ids.noteOffOnBeat, p.noteOffOnBeat);
    set(ids.noteOnFirstTick, p.noteOnFirstTick);
    set(ids.bassStyle, p.bassStyle);
    set(ids.bassVariationP, p.bassVariationP);
    set(ids.openHatP, p.openHatP);
    set(ids.hatSkipP, p.hatSkipP);
    set(ids.snareRollP, p.snareRollP);
    set(ids.useClap, p.useClap);
    set('scaleKey', p.scaleKey);
    set('scaleMode', p.scaleMode);
    set(ids.arrangement, p.arrangement);
    setTracksConfig(p.tracks);
    if (p.mode) setMode(p.mode);
  }

  function showMessage(text, type) {
    const el = document.getElementById('message');
    el.textContent = text;
    el.className = 'message ' + (type || '');
    el.hidden = false;
    if (text) setTimeout(() => { el.hidden = true; el.textContent = ''; }, 4000);
  }

  function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(tab => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.body.classList.toggle('mode-lead', mode === 'lead');
    document.body.classList.toggle('mode-song', mode === 'song');

    const btn = document.getElementById('btnGenerate');
    if (btn) btn.textContent = mode === 'song' ? 'Generate & download .xrns' : 'Generate lead';

    const outputTitle = document.getElementById('outputTitle');
    if (outputTitle) outputTitle.textContent = mode === 'song' ? 'Song output' : 'Renoise XML';

    if (mode === 'lead') {
      document.getElementById('trackLen').value = '64';
      document.getElementById('arpeggioLen').value = '16';
    }
    updateDurationEstimate();
    updateTimeline();
  }

  function patternCountFromMinutes(songMinutes, linesPerPattern, lpb, bpm) {
    const beats = linesPerPattern / Math.max(1, lpb);
    const perPattern = beats * (60 / Math.max(1, bpm));
    if (perPattern <= 0) return 1;
    return Math.max(1, Math.ceil((songMinutes * 60) / perPattern));
  }

  function syncPatternCountFromTarget() {
    if (currentMode !== 'song') return;
    const minutesEl = document.getElementById(ids.songMinutes);
    const countEl = document.getElementById(ids.patternCount);
    if (!minutesEl || !countEl) return;
    const minutes = parseFloat(minutesEl.value);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const lines = parseInt(document.getElementById(ids.linesPerPattern)?.value, 10) || 64;
    const lpb = parseInt(document.getElementById(ids.ticksPerBeat)?.value, 10) || 8;
    const bpm = parseInt(document.getElementById(ids.bpm)?.value, 10) || 145;
    countEl.value = String(patternCountFromMinutes(minutes, lines, lpb, bpm));
  }

  function updateDurationEstimate() {
    const el = document.getElementById('durationEstimate');
    if (!el || currentMode !== 'song') return;
    const lines = parseInt(document.getElementById(ids.linesPerPattern)?.value, 10) || 64;
    const patterns = parseInt(document.getElementById(ids.patternCount)?.value, 10) || 32;
    const lpb = parseInt(document.getElementById(ids.ticksPerBeat)?.value, 10) || 8;
    const bpm = parseInt(document.getElementById(ids.bpm)?.value, 10) || 145;
    const beats = (lines / Math.max(1, lpb)) * patterns;
    const seconds = beats * (60 / Math.max(1, bpm));
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    el.textContent = `≈ ${patterns} patterns × ${lines} lines → ${m}:${String(s).padStart(2, '0')} at ${bpm} BPM (LPB ${lpb})`;
  }

  function renderTrackSummary(tracks) {
    const panel = document.getElementById('summaryPanel');
    const container = document.getElementById('trackSummary');
    if (!tracks || !tracks.length) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    container.innerHTML = tracks.map(t =>
      '<div class="track-chip"><span class="track-chip-name">' + escapeHtml(t.name) +
      '</span><span class="track-chip-meta">Inst ' + escapeHtml(String(t.instrument)) +
      ' · ' + t.noteCount + ' notes</span></div>'
    ).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatSongOutput(info) {
    const lines = [
      'Renoise song ready (.xrns)',
      '',
      `Duration: ${info.durationFormatted} (${info.patternCount} patterns × ${info.linesPerPattern} lines)`,
      `Tempo: ${info.bpm} BPM · LPB ${info.lpb}`,
      `Key: ${info.key} · Scale index ${info.scaleIdx}`,
      '',
      'Named tracks:'
    ];
    info.tracks.forEach((t, i) => {
      lines.push(`  ${i + 1}. ${t.name} (instrument ${t.instrument}) — ${t.noteCount} notes total`);
    });
    if (info.sectionNames?.length) {
      lines.push('', 'Sections: ' + [...new Set(info.sectionNames)].join(' → '));
    }
    if (info.composition?.barBased) {
      lines.push(
        `Composition: ${info.composition.style || 'bar-based'}, ${info.composition.totalBars} bars, ${info.patternCount} patterns`
      );
      if (info.composition.parentMotif?.pitchSequence) {
        lines.push(`Parent motif: ${info.composition.parentMotif.pitchSequence} (${info.composition.parentMotif.contour})`);
      }
      if (info.composition.motifVariants?.length) {
        lines.push(`Motif family: ${info.composition.motifVariants.join(', ')}`);
      }
      if (info.composition.chordProgression) {
        lines.push(`Chords: ${info.composition.chordProgression}`);
      }
    }
    lines.push('', 'Open the downloaded .xrns in Renoise 3.x. Assign your instruments to slots 0–6.');
    return lines.join('\n');
  }

  async function downloadXrns(params) {
    const res = await fetch('/api/generate/xrns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const text = await res.text();
      let err = text;
      try { err = JSON.parse(text).error || err; } catch (_) {}
      throw new Error(err || 'XRNS generation failed');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'psymachine-song.xrns';
    a.click();
    URL.revokeObjectURL(a.href);
    return {
      duration: res.headers.get('X-Psymachine-Duration'),
      patternCount: res.headers.get('X-Psymachine-Pattern-Count')
    };
  }

  async function generate() {
    const output = document.getElementById('output');
    const btn = document.getElementById('btnGenerate');
    btn.disabled = true;
    output.textContent = '';
    lastSongResult = null;
    renderTrackSummary(null);

    try {
      const params = getParams();

      if (currentMode === 'song') {
        const infoRes = await fetch('/api/generate/xrns/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        const infoText = await infoRes.text();
        if (!infoRes.ok) {
          let err = infoText;
          try { err = JSON.parse(infoText).error || err; } catch (_) {}
          showMessage(err || 'Invalid parameters', 'error');
          return;
        }
        const info = JSON.parse(infoText);
        lastSongResult = info;
        renderTrackSummary(info.tracks);
        if (info.timeline) renderTimeline(info.timeline, info.patternCount);
        await downloadXrns(params);
        output.textContent = formatSongOutput(info);
        showMessage('Downloaded psymachine-song.xrns', 'success');
        return;
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
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
      showMessage('Error: ' + e.message, 'error');
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
    ['bassVariationP', 'openHatP', 'hatSkipP', 'snareRollP'].forEach(id => {
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
            mode: 'lead',
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
            trackLen: lines[10] || '64',
            arpeggioLen: lines[11] || '16',
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
        if (typeof ScaleData !== 'undefined') updateScaleDisplay(false);
        showMessage('Preset loaded.', 'success');
      } catch (e) {
        showMessage('Invalid preset file: ' + e.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  /* Scale finder */
  const OCTAVE = '4';
  const selectedChords = new Set();

  function formatRenoiseNote(noteName, octave) {
    const n = String(noteName).trim()
      .replace(/\u266f/gi, '#')
      .replace(/\uff03/g, '#');
    let oct = String(octave != null ? octave : '4').trim();
    if (!/^\d+$/.test(oct)) oct = '4';
    if (n.length === 1) return n + '-' + oct;
    return n + oct;
  }

  function chordKey(chordRootNote, chordIdx) {
    return chordRootNote + ',' + chordIdx;
  }

  function syncOtherNotesFromFinder(root, scale, scaleNotes) {
    if (typeof ScaleData === 'undefined') return;
    const otherNotesEl = document.getElementById(ids.otherNotes);
    if (!otherNotesEl) return;
    let noteNames;
    if (selectedChords.size > 0) {
      const seen = new Set();
      noteNames = [];
      selectedChords.forEach(key => {
        const [r, idx] = key.split(',').map(Number);
        ScaleData.getChordNoteNames(r, idx).forEach(n => {
          if (!seen.has(n)) { seen.add(n); noteNames.push(n); }
        });
      });
    } else {
      noteNames = scaleNotes.slice();
      for (let o = 5; o <= 6; o++) {
        scaleNotes.forEach(n => noteNames.push(n));
      }
    }
    const unique = [...new Set(noteNames)];
    otherNotesEl.value = unique.map(n => formatRenoiseNote(n, OCTAVE)).join(' ');
    const infoEl = document.getElementById('chordInfo');
    if (infoEl) {
      if (selectedChords.size === 0) infoEl.textContent = 'Using full scale (+ octaves) for lead notes';
      else infoEl.textContent = selectedChords.size + ' chord(s) selected – ' + unique.join(', ');
    }
  }

  function updateScaleDisplay(syncOtherNotes) {
    const keySelect = document.getElementById('scaleKey');
    const scaleSelect = document.getElementById('scaleMode');
    if (!keySelect || !scaleSelect || typeof ScaleData === 'undefined') return;

    const keyName = keySelect.value;
    const scaleIdx = parseInt(scaleSelect.value, 10) || 0;
    const root = ScaleData.keyToRoot[keyName];
    const scale = ScaleData.scales[scaleIdx];
    if (root == null || !scale) return;

    document.getElementById(ids.baseNote).value = formatRenoiseNote(keyName, OCTAVE);

    const scaleNotes = ScaleData.getScaleNotes(root, scale);
    const scaleNotesWithOctaves = scaleNotes.map(n => formatRenoiseNote(n, OCTAVE));
    const displayEl = document.getElementById('scaleNotesDisplay');
    if (displayEl) displayEl.value = scaleNotesWithOctaves.join(', ');

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
        const key = chordKey(c.chordRootNote, c.chordIdx);
        if (selectedChords.has(key)) btn.classList.add('selected');
        btn.addEventListener('click', () => {
          if (selectedChords.has(key)) {
            selectedChords.delete(key);
            btn.classList.remove('selected');
          } else {
            selectedChords.add(key);
            btn.classList.add('selected');
          }
          syncOtherNotesFromFinder(root, scale, scaleNotes);
        });
        colEl.appendChild(btn);
      });
      gridEl.appendChild(colEl);
    });
    if (syncOtherNotes) syncOtherNotesFromFinder(root, scale, scaleNotes);
  }

  let scaleFinderInitialized = false;

  function initScaleFinder() {
    if (typeof ScaleData === 'undefined') return;
    const keySelect = document.getElementById('scaleKey');
    const scaleSelect = document.getElementById('scaleMode');
    if (!keySelect || !scaleSelect) return;
    if (keySelect.options.length === 0) {
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
    }
    if (!keySelect.value) keySelect.value = 'E';
    if (!scaleSelect.value) scaleSelect.value = '12';

    if (scaleFinderInitialized) return;
    scaleFinderInitialized = true;

    keySelect.addEventListener('change', () => {
      selectedChords.clear();
      updateScaleDisplay(true);
    });
    scaleSelect.addEventListener('change', () => {
      selectedChords.clear();
      updateScaleDisplay(true);
    });
  }

  async function initArrangements() {
    try {
      const res = await fetch('/api/arrangements');
      arrangements = await res.json();
      const select = document.getElementById('arrangement');
      if (!select) return;
      select.innerHTML = '';
      arrangements.forEach(a => {
        const o = document.createElement('option');
        o.value = a.id;
        o.textContent = a.name;
        select.appendChild(o);
      });
      select.value = 'progressive';
      updateArrangementDesc();
      select.addEventListener('change', () => {
        updateArrangementDesc();
        updateTimeline();
      });
    } catch (_) {}
  }

  function updateArrangementDesc() {
    const select = document.getElementById('arrangement');
    const descEl = document.getElementById('arrangementDesc');
    if (!select || !descEl) return;
    const arr = arrangements.find(a => a.id === select.value);
    descEl.textContent = arr ? arr.description : '';
  }

  function updateTimeline() {
    const arrangementId = document.getElementById('arrangement')?.value || 'progressive';
    fetchArrangementTimeline(arrangementId);
  }

  async function fetchArrangementTimeline(arrangementId) {
    if (currentMode !== 'song') return;
    try {
      const patternCount = document.getElementById('patternCount')?.value;
      const linesPerPattern = document.getElementById(ids.linesPerPattern)?.value || '64';
      const lpb = document.getElementById(ids.ticksPerBeat)?.value || '8';
      const seed = document.getElementById(ids.seed)?.value || '0';
      const qs = new URLSearchParams({
        linesPerPattern,
        lpb,
        seed
      });
      if (patternCount) qs.set('patternCount', patternCount);
      const res = await fetch('/api/arrangements/' + encodeURIComponent(arrangementId) + '/timeline?' + qs);
      if (!res.ok) return;
      const data = await res.json();
      const timeline = data.timeline || data;
      if (data.patternCount) {
        const pcEl = document.getElementById('patternCount');
        if (pcEl && !patternCount) pcEl.placeholder = String(data.patternCount);
      }
      renderTimeline(timeline, data.patternCount);
    } catch (_) {}
  }

  function renderTimeline(timeline, totalPatterns) {
    const container = document.getElementById('timeline');
    if (!container || !timeline) return;
    const total = totalPatterns
      || parseInt(document.getElementById('patternCount')?.value, 10)
      || timeline.reduce((m, s) => Math.max(m, s.endLine || 0), 32);
    container.innerHTML = timeline.map(s => {
      const left = (s.startLine / total * 100).toFixed(1);
      const width = ((s.endLine - s.startLine) / total * 100).toFixed(1);
      const energy = s.energy != null ? ' · E' + s.energy : '';
      const bars = s.bars != null ? ' · ' + s.bars + ' bars' : '';
      const title = s.name + energy + bars;
      return '<div class="timeline-section" style="left:' + left + '%;width:' + width + '%" title="' + escapeHtml(title) + '">' + escapeHtml(s.name) + '</div>';
    }).join('');
  }

  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

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

  document.getElementById('songMinutes')?.addEventListener('input', () => {
    syncPatternCountFromTarget();
    updateDurationEstimate();
    updateTimeline();
  });
  ['linesPerPattern', 'bpm', 'ticksPerBeat', 'patternCount'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      updateDurationEstimate();
      if (id === 'patternCount') updateTimeline();
    });
  });

  document.getElementById('trackLen')?.addEventListener('change', updateTimeline);

  fetch('/api/preset/default').then(r => r.json()).then(p => {
    initScaleFinder();
    setParams(p);
    updateScaleDisplay(true);
    updateArrangementDesc();
    updateDurationEstimate();
    updateTimeline();
  }).catch(() => {
    initScaleFinder();
    updateScaleDisplay(true);
    updateDurationEstimate();
  });

  initArrangements();
  setMode('song');
})();
