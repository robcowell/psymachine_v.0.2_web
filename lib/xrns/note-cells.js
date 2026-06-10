/**
 * Normalise pattern cells — single notes or simultaneous chord columns.
 */

function notesInCell(cell) {
  if (cell == null || cell === '') return [];
  if (Array.isArray(cell)) return cell.filter((n) => n && n !== 'OFF');
  if (cell === 'OFF') return ['OFF'];
  return [cell];
}

function cellHasNotes(cell) {
  return notesInCell(cell).length > 0;
}

function countNotesInCell(cell) {
  return notesInCell(cell).length;
}

function countNotesInTrack(cells) {
  if (!cells?.length) return 0;
  return cells.reduce((sum, c) => sum + countNotesInCell(c), 0);
}

module.exports = {
  notesInCell,
  cellHasNotes,
  countNotesInCell,
  countNotesInTrack
};
