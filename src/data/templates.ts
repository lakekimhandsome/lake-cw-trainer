import type { Level } from '../types'

export const TEMPLATES: Record<Level, string[]> = {
  1: ['CQ', 'DE', 'K', '<AR>', '<SK>', '<BT>', '73', '88', 'QSL', 'QRP', 'TNX', 'PSE AGN'],
  2: ['CQ CQ DE {CALL} K', 'CQ CQ CQ DE {CALL} K', '{CALL} DE {CALL} K'],
  3: ['UR RST {RST}', 'RST {RST}', 'MY QTH IS {QTH}', 'QTH {QTH}', 'MY NAME IS {NAME}', 'NAME {NAME}', 'TNX FER RPT'],
  4: ['TNX FER CALL {CALL}', 'HW CPY?', 'PSE AGN OM', 'FB OM 73 ES GL', 'WX IS FINE {QTH}', 'TNX FER NICE QSO'],
  5: ['{CALL} DE {CALL} UR RST {RST} {NAME} QTH {QTH} <BT> TNX FER NICE QSO 73 <SK>', 'CQ CQ DE {CALL} {CALL} K', '{CALL} DE {CALL} GM OM UR RST {RST} QTH {QTH} <BT> 73 ES GL <SK>']
}
