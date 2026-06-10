/**
 * Section musical objectives and motif lifecycle phases.
 */

const SECTION_RULES = [
  { match: /intro|dj intro|groove introduction/i, objective: 'establish_groove', motifPhase: 'sparse', phraseTemplate: 'orbit' },
  { match: /development|groove(?! introduction)/i, objective: 'build_groove', motifPhase: 'sparse', phraseTemplate: 'aaab' },
  { match: /theme a/i, objective: 'introduce_motif', motifPhase: 'original', phraseTemplate: 'aaba' },
  { match: /theme b/i, objective: 'develop_motif', motifPhase: 'rhythmic', phraseTemplate: 'aabaprime' },
  { match: /breakdown|break|main break|major break/i, objective: 'emotional_variation', motifPhase: 'halftime', phraseTemplate: 'abaa' },
  { match: /climax|peak/i, objective: 'peak_motif', motifPhase: 'octave_layer', phraseTemplate: 'aaba' },
  { match: /outro/i, objective: 'simplify', motifPhase: 'simplified', phraseTemplate: 'aaaa' }
];

const PHRASE_TEMPLATES = {
  aaba: ['A', 'A', 'B', 'A'],
  aabaprime: ['A', 'A', 'B', "A'"],
  aaaprime: ['A', "A'", "A''", 'A'],
  abac: ['A', 'B', 'A', 'C'],
  aaab: ['A', 'A', 'A', 'B'],
  abaa: ['A', 'B', 'A', 'A'],
  aaaa: ['A', 'A', 'A', 'A'],
  orbit: ['A', "A'", 'A', 'A']
};

function resolveSectionObjective(sectionName) {
  for (const rule of SECTION_RULES) {
    if (rule.match.test(sectionName)) {
      return {
        objective: rule.objective,
        motifPhase: rule.motifPhase,
        phraseTemplate: rule.phraseTemplate
      };
    }
  }
  return { objective: 'develop_motif', motifPhase: 'original', phraseTemplate: 'aaba' };
}

function enrichBarTimeline(timeline) {
  if (!timeline) return timeline;
  return {
    ...timeline,
    sections: timeline.sections.map(s => ({
      ...s,
      ...resolveSectionObjective(s.name)
    }))
  };
}

function getSectionPlan(section) {
  if (!section) {
    return { objective: 'develop_motif', motifPhase: 'original', phraseSlots: PHRASE_TEMPLATES.aaba };
  }
  const slots = PHRASE_TEMPLATES[section.phraseTemplate] || PHRASE_TEMPLATES.aaba;
  return {
    objective: section.objective,
    motifPhase: section.motifPhase,
    phraseSlots: slots
  };
}

module.exports = {
  SECTION_RULES,
  PHRASE_TEMPLATES,
  resolveSectionObjective,
  enrichBarTimeline,
  getSectionPlan
};
