/**
 * Composition engine — Phase 1 pipeline exports.
 */

const { createCompositionContext } = require('./composition-context');
const { getStyleProfile, listStyles, isBarBasedStyle } = require('./style-profiles');
const {
  buildBarTimeline,
  listBarArrangements,
  getBarSectionTimeline,
  barsPerPattern
} = require('./arrangement-bars');
const {
  energyToTrackDensities,
  energyToLeadPercents,
  energyToGeneratorOptions
} = require('./energy-curve');
const { generateMotifSet } = require('./motif-generator');
const { buildChordTimeline } = require('./chord-engine');
const { generateLeadTrack } = require('./lead-generator');
const { generatePad } = require('./pad-generator');
const { buildCompositionPlan } = require('./compose');
const { generateParentMotif, deriveMotifFamily } = require('./parent-motif');
const { pickContour } = require('./contour');
const { enrichBarTimeline, getSectionPlan } = require('./section-objectives');

module.exports = {
  createCompositionContext,
  getStyleProfile,
  listStyles,
  isBarBasedStyle,
  buildBarTimeline,
  listBarArrangements,
  getBarSectionTimeline,
  barsPerPattern,
  energyToTrackDensities,
  energyToLeadPercents,
  energyToGeneratorOptions,
  generateMotifSet,
  buildChordTimeline,
  generateLeadTrack,
  generatePad,
  buildCompositionPlan,
  generateParentMotif,
  deriveMotifFamily,
  pickContour,
  enrichBarTimeline,
  getSectionPlan
};
