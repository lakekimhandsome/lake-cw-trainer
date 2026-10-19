import type { Level } from '../types'

type Template = { text: string; translation: string }

export const TEMPLATES: Record<Level, Template[]> = {
  1: [
    { text: 'CQ', translation: '전체 호출' }, { text: 'DE', translation: '~에서' }, { text: 'K', translation: '송신 끝, 응답 바람' }, { text: '<AR>', translation: '송신 끝' }, { text: '<SK>', translation: '교신 종료' }, { text: '<BT>', translation: '잠시 구분' }, { text: '73', translation: '안녕히 계세요' }, { text: '88', translation: '사랑과 안부를 전합니다' }, { text: 'QSL', translation: '수신 확인' }, { text: 'QRP', translation: '저출력 운용' }, { text: 'TNX', translation: '감사합니다' }, { text: 'PSE AGN', translation: '다시 보내 주세요' },
  ],
  2: [
    { text: 'CQ CQ DE {CALL} K', translation: '전체 호출, {CALL}입니다. 응답 바랍니다.' }, { text: 'CQ CQ CQ DE {CALL} K', translation: '전체 호출, 전체 호출, 전체 호출. {CALL}입니다. 응답 바랍니다.' }, { text: '{CALL} DE {CALL} K', translation: '{CALL}에서 {CALL} 호출합니다. 응답 바랍니다.' },
  ],
  3: [
    { text: 'UR RST {RST}', translation: '당신의 신호 리포트는 {RST}입니다.' }, { text: 'RST {RST}', translation: '신호 리포트 {RST}' }, { text: 'MY QTH IS {QTH}', translation: '제 위치는 {QTH}입니다.' }, { text: 'QTH {QTH}', translation: '위치: {QTH}' }, { text: 'MY NAME IS {NAME}', translation: '제 이름은 {NAME}입니다.' }, { text: 'NAME {NAME}', translation: '이름: {NAME}' }, { text: 'TNX FER RPT', translation: '리포트 감사합니다.' },
  ],
  4: [
    { text: 'TNX FER CALL {CALL}', translation: '{CALL} 호출 감사합니다.' }, { text: 'HW CPY?', translation: '수신 상태가 어떠신가요?' }, { text: 'PSE AGN OM', translation: '다시 보내 주세요, 선생님.' }, { text: 'FB OM 73 ES GL', translation: '좋습니다, 선생님. 안녕히 계세요. 행운을 빕니다.' }, { text: 'WX IS FINE {QTH}', translation: '{QTH}의 날씨는 좋습니다.' }, { text: 'TNX FER NICE QSO', translation: '좋은 교신 감사합니다.' },
  ],
  5: [
    { text: '{CALL} DE {CALL} UR RST {RST} {NAME} QTH {QTH} <BT> TNX FER NICE QSO 73 <SK>', translation: '{CALL}에서 {CALL} 호출합니다. 당신의 신호 리포트는 {RST}, 이름은 {NAME}, 위치는 {QTH}입니다. 좋은 교신 감사합니다. 안녕히 계세요. 교신을 종료합니다.' }, { text: 'CQ CQ DE {MYCALL} {MYCALL} K', translation: '전체 호출, 전체 호출. {MYCALL} {MYCALL}입니다. 응답 바랍니다.' }, { text: '{CALL} DE {CALL} GM OM UR RST {RST} QTH {QTH} <BT> 73 ES GL <SK>', translation: '{CALL}에서 {CALL} 호출합니다. 좋은 아침입니다, 선생님. 당신의 신호 리포트는 {RST}, 위치는 {QTH}입니다. 안녕히 계세요. 행운을 빕니다. 교신을 종료합니다.' },
  ],
}

export const LEVEL_GUIDES: Record<Level, { title: string; description: string }> = {
  1: { title: '기본 약어·부호', description: 'CQ, DE, K, QSL, QRP 같은 짧은 약어와 AR·SK·BT 절차 부호, 73·88, PSE AGN 등을 듣습니다.' },
  2: { title: '호출·콜사인', description: 'CQ 호출과 콜사인(호출 부호)을 듣습니다. 예: CQ CQ DE HL1ABC K, HL1ABC DE JA1XYZ K.' },
  3: { title: '신호 리포트·위치·이름', description: 'RST(신호 리포트), QTH(위치), 이름과 리포트 감사 표현을 듣습니다. 예: UR RST 599, MY QTH IS SEOUL, MY NAME IS KIM, TNX FER RPT.' },
  4: { title: '짧은 교신 표현', description: '호출 감사, 수신 상태 확인, 재송신 요청, 날씨, 인사 등 짧은 교신 문장을 듣습니다. 예: HW CPY?, PSE AGN OM, TNX FER NICE QSO.' },
  5: { title: '종합 교신', description: '콜사인·RST·이름·위치·인사·절차 부호를 조합한 긴 교신과, 콜사인을 반복하는 CQ 호출을 듣습니다.' },
}
