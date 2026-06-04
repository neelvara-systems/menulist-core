/**
 * Compatibility wrapper.
 *
 * Tabletop print surfaces are owned by the Print Menu Surfaces feature. Menu Kit
 * still bundles the table tent, but does not own the physical layout.
 *
 * @see __docs__/print-menu-surfaces/print-menu-surfaces_impl.md
 */

export { generatePrintMenuTableTent as generateTableTent } from '../../print-menu-surfaces/templates/tableTentTemplate';
