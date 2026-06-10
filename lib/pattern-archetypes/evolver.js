/**
 * 4-bar pattern evolution, 8-bar fills, anti-repeat fingerprinting.
 */

const { randomPercent, seededRandom, deriveSeed } = require('../rng');
const { sixteenthStep, barLineCount } = require('./encode');
const { HAT_TOKENS } = require('./render');

const CLOSED = HAT_TOKENS.closed;
const OPEN = HAT_TOKENS.open;

const FILL_TEMPLATES = [
  [6, 8, 10, 12, 13, 14],
  [10, 11, 12, 13, 14, 15]
];

function fingerprintCells(cells, startLine, endLine) {
  let h = 0;
  for (let i = startLine; i < endLine && i < cells.length; i++) {
    const c = cells[i];
    h = Math.imul(31, h) + (c ? c.charCodeAt(0) : 0) | 0;
    h = Math.imul(31, h) + (c ? c.length : 0) | 0;
  }
  return h >>> 0;
}

function mutateBlock(cells, blockStart, blockEnd, lpb, rng, options = {}) {
  const step = sixteenthStep(lpb);
  const closed = options.closedToken || CLOSED;
  const open = options.openToken || OPEN;
  const hits = [];
  for (let i = blockStart; i < blockEnd && i < cells.length; i++) {
    if (cells[i]) hits.push(i);
  }

  const action = Math.floor(rng() * 5);
  if (action === 0 && hits.length > 0) {
    const idx = hits[Math.floor(rng() * hits.length)];
    cells[idx] = '';
  } else if (action === 1) {
    const line = blockStart + Math.floor(rng() * (blockEnd - blockStart));
    const aligned = line - (line % step);
    if (aligned >= blockStart && aligned < blockEnd) {
      cells[aligned] = randomPercent(30, rng) ? open : closed;
    }
  } else if (action === 2 && hits.length > 0) {
    const from = hits[Math.floor(rng() * hits.length)];
    const dir = randomPercent(50, rng) ? step : -step;
    const to = from + dir;
    if (to >= blockStart && to < blockEnd && to < cells.length) {
      cells[to] = cells[from];
      cells[from] = '';
    }
  } else if (action === 3 && hits.length > 0) {
    const idx = hits[Math.floor(rng() * hits.length)];
    if (cells[idx] === open || cells[idx] === closed) {
      cells[idx] = cells[idx] === open ? closed : open;
    }
  } else if (hits.length > 0) {
    const idx = hits[Math.floor(rng() * hits.length)];
    cells[idx] = cells[idx] || closed;
  }
}

function apply8BarFill(cells, fillStart, lpb, rng) {
  const barLines = barLineCount(lpb);
  const halfBarStart = fillStart + barLines - Math.floor(barLines / 2);
  const template = FILL_TEMPLATES[Math.floor(rng() * FILL_TEMPLATES.length)];
  const step = sixteenthStep(lpb);

  for (const offset of template) {
    const line = halfBarStart + offset * step;
    if (line >= 0 && line < cells.length) {
      cells[line] = offset % 3 === 0 ? OPEN : CLOSED;
    }
  }
}

/**
 * Apply evolution to rendered cells (hats, drums, bass note tokens).
 */
function applyPatternEvolution(cells, rhythmPlan, lpb, linesPerPattern, rng, fingerprintCache, options = {}) {
  const barLines = barLineCount(lpb);
  const block4 = barLines;
  const block8 = barLines * 2;
  const variationRate = rhythmPlan.evolution?.variationRate ?? options.variationRate ?? 0.3;
  const fillP = options.fillP ?? 30;
  const { globalBar = 0, seedVal = 0, energy = 50 } = rhythmPlan;
  const mutateOpts = options.mutateOpts || {};

  for (let blockStart = 0; blockStart < linesPerPattern; blockStart += block4) {
    const blockEnd = Math.min(blockStart + block4, linesPerPattern);
    const blockRng = seededRandom(deriveSeed(seedVal, 'pat-var', globalBar, blockStart));

    const ratePct = 20 + (variationRate * 20);
    if (randomPercent(ratePct, blockRng)) {
      mutateBlock(cells, blockStart, blockEnd, lpb, blockRng, mutateOpts);
    }
  }

  if (!fingerprintCache) return cells;

  for (let blockStart = 0; blockStart < linesPerPattern; blockStart += block8) {
    const blockEnd = Math.min(blockStart + block8, linesPerPattern);
    const absWindow = Math.floor((globalBar + blockStart / barLines) / 8);
    const fp = fingerprintCells(cells, blockStart, blockEnd);
    const cacheKey = `${seedVal}:${absWindow}`;
    const prevKey = `${seedVal}:${absWindow - 1}`;
    const prevFp = fingerprintCache.get(prevKey);

    if (prevFp != null && prevFp === fp) {
      const forceRng = seededRandom(deriveSeed(seedVal, 'pat-force', absWindow));
      mutateBlock(cells, blockStart, blockEnd, lpb, forceRng, mutateOpts);
    }
    fingerprintCache.set(cacheKey, fingerprintCells(cells, blockStart, blockEnd));

    const fillRng = seededRandom(deriveSeed(seedVal, 'pat-fill', globalBar, blockStart));
    if (randomPercent(fillP, fillRng) && energy >= 50 && options.allowFill !== false) {
      apply8BarFill(cells, blockStart, lpb, fillRng);
    }
  }

  return cells;
}

module.exports = {
  fingerprintCells,
  mutateBlock,
  apply8BarFill,
  applyPatternEvolution,
  FILL_TEMPLATES
};
