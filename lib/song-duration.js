/**
 * Song length helpers: patterns, minutes, BPM, LPB.
 */

function patternDurationSeconds(linesPerPattern, lpb, bpm) {
  const beats = linesPerPattern / Math.max(1, lpb);
  return beats * (60 / Math.max(1, bpm));
}

function patternCountFromMinutes(songMinutes, linesPerPattern, lpb, bpm) {
  const perPattern = patternDurationSeconds(linesPerPattern, lpb, bpm);
  if (perPattern <= 0) return 1;
  return Math.max(1, Math.ceil((songMinutes * 60) / perPattern));
}

function songDurationSeconds(patternCount, linesPerPattern, lpb, bpm) {
  return patternCount * patternDurationSeconds(linesPerPattern, lpb, bpm);
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

module.exports = {
  patternDurationSeconds,
  patternCountFromMinutes,
  songDurationSeconds,
  formatDuration
};
