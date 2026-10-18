import type { Level } from '../types'

export const TEMPLATES: Record<Level, string[]> = {
  1: ['CQ', 'DE', 'K', '<AR>', '<SK>', '<BT>', '73', '88', 'QSL', 'QRP', 'TNX', 'PSE AGN'],
  2: ['CQ CQ DE {CALL} K', 'CQ CQ CQ DE {CALL} K', '{CALL} DE {CALL} K'],
  3: ['UR RST {RST}', 'RST {RST}', 'MY QTH IS {QTH}', 'QTH {QTH}', 'MY NAME IS {NAME}', 'NAME {NAME}', 'TNX FER RPT'],
  4: ['TNX FER CALL {CALL}', 'HW CPY?', 'PSE AGN OM', 'FB OM 73 ES GL', 'WX IS FINE {QTH}', 'TNX FER NICE QSO'],
  5: ['{CALL} DE {CALL} UR RST {RST} {NAME} QTH {QTH} <BT> TNX FER NICE QSO 73 <SK>', 'CQ CQ DE {CALL} {CALL} K', '{CALL} DE {CALL} GM OM UR RST {RST} QTH {QTH} <BT> 73 ES GL <SK>']
}

export const LEVEL_GUIDES: Record<Level, { title: string; description: string }> = {
  1: { title: '기본 약어·부호', description: 'CQ, DE, K, QSL, QRP 같은 짧은 약어와 AR·SK·BT 절차 부호, 73·88, PSE AGN 등을 듣습니다.' },
  2: { title: '호출·콜사인', description: 'CQ 호출과 콜사인(호출 부호)을 듣습니다. 예: CQ CQ DE HL1ABC K, HL1ABC DE JA1XYZ K.' },
  3: { title: '신호 리포트·위치·이름', description: 'RST(신호 리포트), QTH(위치), 이름과 리포트 감사 표현을 듣습니다. 예: UR RST 599, MY QTH IS SEOUL, MY NAME IS KIM, TNX FER RPT.' },
  4: { title: '짧은 교신 표현', description: '호출 감사, 수신 상태 확인, 재송신 요청, 날씨, 인사 등 짧은 교신 문장을 듣습니다. 예: HW CPY?, PSE AGN OM, TNX FER NICE QSO.' },
  5: { title: '종합 교신', description: '콜사인·RST·이름·위치·인사·절차 부호를 조합한 긴 교신과, 콜사인을 반복하는 CQ 호출을 듣습니다.' },
}
