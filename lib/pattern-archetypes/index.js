/**
 * Pattern archetype system — public API.
 */

const registry = require('./registry');
const encode = require('./encode');
const render = require('./render');
const selector = require('./selector');
const sectionRoles = require('./section-roles');
const evolver = require('./evolver');
const compositor = require('./compositor');
const legacy = require('./legacy');

module.exports = {
  ...registry,
  ...encode,
  ...render,
  ...selector,
  ...sectionRoles,
  ...evolver,
  ...compositor,
  ...legacy
};
