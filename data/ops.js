/* BEES Home v0.9 · data/ops.js — 운영 데이터 (알람·민원·작업·안전·에너지) */
import {COMMON,DEVICES,MODULE_AREA,MODULE_TYPES,NOW,SPACES,UNIT_REF,billOf,devicesOf,marginalWon,rnd,spaceOf,typeNmOf,typeOfLoc} from './module.js';
import {HOUSE_EQUIP,MODULE,equipKwhOf} from './moduleUnit.js';

/* ══════════ 4. 전기 사용량 (센서필드 §4) ══════════ */
/* ══════════ 기기 일일 가동시간 (h) — 단계 8 수정 2 ══════════════════
   kwhToday = meas.w × 가동시간 / 1000.  순시 전력과 일일 사용량을 연동한다.
   냉장고는 압축기 가동률(약 33%)을 등가 가동시간 8.0h 로 환산했다.
   ※ 현재 꺼진 기기는 meas.w=0 이라 산식상 0 이 된다 (product.ratedW 미확보).
     실제로는 그날 켜져 있던 시간만큼 사용량이 있으므로, 자재 마스터 확보 후
     ratedW × 가동시간으로 바꿔야 한다.                                    */
/* ※ SED 규격상 전력(TEL 0·1)은 콘센트(SEO)·전등(SEL)만 보고한다.
     스위치(SES)·커튼(SEC)은 여기 없다 — 후드·환기팬 전력은 미제공이다.
   ※ 덕트 공조라 실내 에어컨이 없다 (v0.4 2매). 가전은 냉장고·TV·공기청정기
     3종뿐이고 나머지는 전등이다. 냉방·환기 전력은 HOUSE_EQUIP 로 분리했다. */
export const RUNTIME_H={
  SEO_35:5.0, SEO_37:14.0, SEL_6:5.0,             // 거실·식당 (TV · 공기청정기 · 조명)
  SEO_42:8.0, SEL_12:4.0,                         // 주방 (냉장고 · 조명)
  SEL_3:4.0,                                      // 침실 (조명)
  SEL_15:1.5,                                     // 욕실 (조명)
};
/* 기기별 일일 사용량 · 공간별 합계 · 세대 합계를 순시 전력에서 파생시킨다.
   규칙 §9 : 공간별 kwh 합계 = 세대 todayKwh (이 코드로 항등이 보장된다)
   ※ 연동 시 이 산식은 폐기하고 TEL 1(소비 전력 kWh) 실측으로 대체한다.  */
DEVICES.forEach(d=>{
  if(d.meas.kwhToday===undefined)return;          // 전력 미보고 타입은 건너뛴다
  d.meas.kwhToday=+((d.meas.w*(RUNTIME_H[d.id]||0))/1000).toFixed(3);
});
SPACES.forEach(sp=>{
  sp.kwh=+devicesOf(sp.id).reduce((a,d)=>a+(d.meas.kwhToday||0),0).toFixed(3);
});
/* SED 계측 합계 — 콘센트·전등만. 스위치·커튼은 규격상 전력을 보고하지 않는다 */
const SED_KWH=+SPACES.reduce((a,sp)=>a+sp.kwh,0).toFixed(3);

/* 세대 설비(덕트 공조·환기 유닛) — SED 계측 밖. 정격 × 가동시간 가정 산출.
   덕트 공조라 실내기가 없어 냉방 전력이 콘센트에 잡히지 않는다 (v0.4 2매).
   이 항목을 빼면 세대 사용량이 비현실적으로 낮아지므로 총량에 합산한다.     */
export const EQUIP_DETAIL=HOUSE_EQUIP.map(e=>({...e,
  kwhToday:equipKwhOf(e),
  /* 화면 표기용 산식 문구 — 열량 기반은 COP 를 드러낸다 */
  formula:e.fanW!=null ? `${e.fanW}W × ${e.runtimeH}h`
                       : `${e.loadKw}kW ÷ COP ${e.cop} × ${e.runtimeH}h`}));
export const EQUIP_KWH=+EQUIP_DETAIL.reduce((a,e)=>a+e.kwhToday,0).toFixed(3);

/* 세대 총 사용량 = SED 계측(콘센트·전등) + 세대 설비(가정) */
const TODAY_KWH=+(SED_KWH+EQUIP_KWH).toFixed(3);

/* 시간대 프로파일 — 합계가 todayKwh 와 정확히 일치하도록 정규화한다 */
const HOUR_SHAPE=Array.from({length:24},(_,i)=>
  0.30 + (i>=7&&i<=9?0.55:0) + (i>=12&&i<=14?0.35:0)
       + (i>=17&&i<=22?1.35:0) + rnd(i+40)*0.20);
const HOUR_SUM=HOUR_SHAPE.reduce((a,v)=>a+v,0);

/* 일별 — 8월 1~7일 경과. 오늘(7일)은 todayKwh, 나머지는 ±12% 변동 */
const DAYS_PASSED=7;
const DAILY=Array.from({length:31},(_,i)=>{
  if(i>=DAYS_PASSED)return 0;
  if(i===DAYS_PASSED-1)return TODAY_KWH;
  return +(TODAY_KWH*(0.88+rnd(i+70)*0.24)).toFixed(2);
});
const MONTH_KWH=+DAILY.reduce((a,v)=>a+v,0).toFixed(1);
const FORECAST_KWH=+(MONTH_KWH/DAYS_PASSED*31).toFixed(1);
const BILL=billOf(FORECAST_KWH,NOW.m);

/* 콘센트 순위 — 기기 실사용량에서 파생. 기간 총량을 넘지 않는다 (수정 3) */
const rankOf=(mult)=>DEVICES
  .filter(d=>d.meas.kwhToday>0)
  .sort((a,b)=>b.meas.kwhToday-a.meas.kwhToday).slice(0,3)
  .map(d=>({nm:d.nm.replace(/ ?콘센트| ?스위치/,''), rm:spaceOf(d.space).nm,
            kwh:+(d.meas.kwhToday*mult).toFixed(2)}));

export const ENERGY={
  todayKwh:TODAY_KWH,
  /* 계보 분리 — 화면에서 「계측분 / 설비분」을 구분해 표기한다 */
  sedKwh:SED_KWH, equipKwh:EQUIP_KWH, equip:EQUIP_DETAIL,
  hourly:HOUR_SHAPE.map(v=>+(v/HOUR_SUM*TODAY_KWH).toFixed(3)),
  monthKwh:MONTH_KWH, monthPrev:MONTH_KWH, forecastKwh:FORECAST_KWH,
  tier:BILL.tier, forecastWon:BILL.total, bill:BILL, daysPassed:DAYS_PASSED,
  daily:DAILY,
  outlets:{
    일간:rankOf(1),
    주간:rankOf(DAYS_PASSED),                 // 최근 7일
    월간:rankOf(31),                          // 예상 월간 (forecast 대비 검산)
  },
};

export let ALARMS=[
 {id:'AL-2608-041',type:'누수 감지',sev:1,loc:COMMON.mech,eq:'급수 배관 P-B1-03',at:'08-07 16:52',st:'occurred',rep:1,grp:null,
  src:'누수 센서 WS-B1-03 감지', act:'급수 밸브 차단 후 배관 점검 필요'},
 {id:'AL-2608-040',type:'CO₂ 농도 초과',sev:2,loc:`${MODULE.id} ${spaceOf('living').nm}`,eq:'환기 유닛 ERV-A-01',at:'08-07 16:30',st:'ack',rep:3,grp:'G-01',
  src:'CO₂ 903ppm · 기준 800ppm 30분 초과', act:'환기 유닛 급기량 상향'},
 {id:'AL-2608-039',type:'냉방 설비 비정상 운전',sev:2,loc:COMMON.util,eq:'EHP-2-03',at:'08-07 15:12',st:'acting',rep:1,grp:null,
  src:'소비전력 정격 대비 138% · 20분 지속', act:'실외기 팬·필터 점검'},
 {id:'AL-2608-038',type:'통신 장애',sev:2,loc:UNIT_REF.c04,eq:'IoT GW-C-04',at:'08-07 14:48',st:'occurred',rep:1,grp:null,
  src:'마지막 수신 14:18 · 기준 30분 초과', act:'게이트웨이 전원·네트워크 확인'},
 {id:'AL-2608-037',type:'실내 온도 상한 초과',sev:3,loc:`${MODULE.id} ${spaceOf('living').nm}`,eq:'SEL_6',at:'08-07 14:20',st:'ack',rep:5,grp:'G-02',
  src:'29.1℃ · 재실 냉방 상한 26℃ 3시간 초과', act:'서향 일사 · 전동커튼 SEC_1 자동 제어 검토'},
 {id:'AL-2608-036',type:'실내 온도 상한 초과',sev:3,loc:`${UNIT_REF.a03} ${spaceOf('living').nm}`,eq:'SEL_6',at:'08-07 14:05',st:'occurred',rep:4,grp:'G-02',
  src:'31.8℃ · 재실 냉방 상한 26℃ 30분 초과', act:'서향 일사 · 전동커튼 자동 제어 검토'},
 {id:'AL-2608-035',type:'CO₂ 농도 초과',sev:3,loc:`${UNIT_REF.a04} ${spaceOf('living').nm}`,eq:'ERV-A-04',at:'08-07 13:40',st:'done',rep:2,grp:'G-01',
  src:'CO₂ 861ppm · 기준 800ppm', act:'환기 유닛 급기량 상향 완료'},
 {id:'AL-2608-034',type:'승강기 이상 진동',sev:2,loc:COMMON.ev,eq:'EV-2',at:'08-07 11:22',st:'acting',rep:1,grp:null,
  src:'진동 센서 RMS 기준 대비 172%', act:'협력사 점검 요청 (작업 WO-2608-014)'},
 {id:'AL-2608-033',type:'에너지 사용 이상',sev:3,loc:UNIT_REF.c02,eq:'개체 계량기',at:'08-07 09:15',st:'ack',rep:1,grp:null,
  src:'동일 평형 그룹 평균 +2.4σ 이탈', act:'세대 확인 요청'},
 {id:'AL-2608-032',type:'필터 교체 주기 도래',sev:4,loc:COMMON.vent,eq:'AHU-1-01',at:'08-07 08:00',st:'occurred',rep:1,grp:null,
  src:'누적 운전 2,160시간 · 기준 2,000시간', act:'프리필터 교체'},
 {id:'AL-2608-031',type:'결로 위험',sev:3,loc:`${UNIT_REF.c01} 창측`,eq:'SEL_31',at:'08-07 07:30',st:'hold',rep:2,grp:null,
  src:'표면온도 추정 19.2℃ · 노점 18.6℃', act:'제습·환기 안내 발송 (동절기 재검토)'},
 {id:'AL-2608-030',type:'미세먼지 농도 초과',sev:4,loc:COMMON.lobby,eq:'SES_L2',at:'08-06 19:40',st:'done',rep:1,grp:null,
  src:'PM2.5 42㎍/㎥ · 기준 35㎍/㎥', act:'공기청정 유닛 자동 가동 완료'},
 {id:'AL-2608-029',type:'냉방 설비 비정상 운전',sev:2,loc:COMMON.util,eq:'EHP-2-03',at:'08-06 15:05',st:'done',rep:1,grp:null,
  src:'소비전력 정격 대비 131%', act:'필터 청소 완료'},
 {id:'AL-2608-028',type:'출입 이상',sev:4,loc:COMMON.park1,eq:'ACS-B1-02',at:'08-06 02:14',st:'done',rep:1,grp:null,
  src:'비인가 카드 3회 연속 시도', act:'보안 확인 완료'},
];


export let REQUESTS=[
 {id:'REQ-26080712',sp:MODULE.id,mine:true, cat:'설비',sub:'냉난방 불량',urg:'보통',
  at:'08-07 10:24',desc:`${spaceOf('living').nm}이 오후만 되면 29도를 넘습니다. 에어컨을 켜도 잘 안 떨어집니다.`,
  st:'acting',assignee:'시설관리 김성호',slaDue:'08-09 10:24',slaPct:38,visit:'08-08 14:00',
  auto:{cat:'설비 > 냉난방 불량',conf:0.92},rep:2,sat:null,photos:2,
  log:[{t:'08-07 10:24',m:'입주민 접수 · 접수번호 발급'},{t:'08-07 10:26',m:'자동 분류 「설비 > 냉난방 불량」 (신뢰도 92%)'},
       {t:'08-07 11:05',m:'시설관리 김성호 배정 · SLA 48시간'},{t:'08-07 15:40',m:'현장 확인 예정 08-08 14:00 확정'}]},
 {id:'REQ-26080508',sp:MODULE.id,mine:true, cat:'환경',sub:'실내 공기질',urg:'낮음',
  at:'08-05 09:10',desc:'주방에서 요리할 때 냄새가 오래 남습니다. 후드 성능 확인 부탁드립니다.',
  st:'done',assignee:'시설관리 박지훈',slaDue:'08-08 09:10',slaPct:100,visit:'08-06 10:00',
  auto:{cat:'환경 > 실내 공기질',conf:0.78},rep:1,sat:null,photos:0,
  log:[{t:'08-05 09:10',m:'입주민 접수'},{t:'08-05 09:40',m:'시설관리 박지훈 배정'},
       {t:'08-06 10:20',m:'후드 필터 교체 · 풍량 2단계 조정'},{t:'08-06 10:35',m:'처리 완료 · 만족도 평가 요청 발송'}]},
 {id:'REQ-26072903',sp:MODULE.id,mine:true, cat:'설비',sub:'전기·조명',urg:'낮음',
  at:'07-29 19:32',desc:`${spaceOf('bath').nm} 조명이 가끔 안 켜집니다.`,
  st:'done',assignee:'시설관리 김성호',slaDue:'08-01 19:32',slaPct:100,visit:'07-30 16:00',
  auto:{cat:'설비 > 전기·조명',conf:0.88},rep:1,sat:5,photos:1,
  log:[{t:'07-29 19:32',m:'입주민 접수'},{t:'07-30 16:20',m:'센서 모듈 교체 완료'},{t:'07-31 09:00',m:'만족도 5점 등록'}]},
 {id:'REQ-26080711',sp:UNIT_REF.b03,mine:false,cat:'설비',sub:'급수·배수',urg:'긴급',
  at:'08-07 16:55',desc:'싱크대 하부에서 물이 새고 있습니다.',
  st:'assigned',assignee:'시설관리 이재훈',slaDue:'08-07 20:55',slaPct:12,visit:'08-07 18:00',
  auto:{cat:'설비 > 급수·배수',conf:0.96},rep:1,sat:null,photos:3,log:[]},
 {id:'REQ-26080710',sp:UNIT_REF.c01,mine:false,cat:'환경',sub:'소음',urg:'보통',
  at:'08-07 14:02',desc:'인접 개체 생활 소음이 심합니다.',
  st:'received',assignee:null,slaDue:'08-09 14:02',slaPct:22,visit:null,
  auto:{cat:'환경 > 소음',conf:0.71},rep:3,sat:null,photos:0,log:[]},
 {id:'REQ-26080709',sp:UNIT_REF.b04,mine:false,cat:'설비',sub:'냉난방 불량',urg:'보통',
  at:'08-07 11:38',desc:'거실 에어컨 냉방이 약합니다.',
  st:'acting',assignee:'시설관리 김성호',slaDue:'08-09 11:38',slaPct:34,visit:'08-08 10:00',
  auto:{cat:'설비 > 냉난방 불량',conf:0.90},rep:2,sat:null,photos:1,log:[]},
 {id:'REQ-26080706',sp:UNIT_REF.a05,mine:false,cat:'시설',sub:'공용부 파손',urg:'낮음',
  at:'08-07 09:12',desc:`${COMMON.corr} 조명 커버가 깨져 있습니다.`,
  st:'assigned',assignee:'시설관리 박지훈',slaDue:'08-10 09:12',slaPct:18,visit:null,
  auto:{cat:'시설 > 공용부 파손',conf:0.85},rep:1,sat:null,photos:1,log:[]},
 {id:'REQ-26080605',sp:UNIT_REF.c02,mine:false,cat:'설비',sub:'전기·조명',urg:'보통',
  at:'08-06 20:41',desc:'전기 요금이 갑자기 늘었습니다. 확인 부탁드립니다.',
  st:'acting',assignee:'운영관리 최은영',slaDue:'08-08 20:41',slaPct:76,visit:null,
  auto:{cat:'설비 > 전기·조명',conf:0.54},rep:1,sat:null,photos:0,log:[]},
 {id:'REQ-26080604',sp:UNIT_REF.b03,mine:false,cat:'설비',sub:'급수·배수',urg:'보통',
  at:'08-06 13:20',desc:`${spaceOf('bath').nm} 배수가 느립니다.`,
  st:'done',assignee:'시설관리 이재훈',slaDue:'08-08 13:20',slaPct:100,visit:'08-06 17:00',
  auto:{cat:'설비 > 급수·배수',conf:0.93},rep:2,sat:4,photos:0,log:[]},
 {id:'REQ-26080502',sp:MODULE.id,mine:false,cat:'환경',sub:'결로·곰팡이',urg:'낮음',
  at:'08-05 08:05',desc:'창틀에 물기가 맺힙니다.',
  st:'done',assignee:'시설관리 박지훈',slaDue:'08-08 08:05',slaPct:100,visit:'08-05 15:00',
  auto:{cat:'환경 > 결로·곰팡이',conf:0.81},rep:1,sat:5,photos:2,log:[]},
 {id:'REQ-26080401',sp:UNIT_REF.c01,mine:false,cat:'환경',sub:'소음',urg:'보통',
  at:'08-04 22:14',desc:'심야 소음 반복 발생',
  st:'done',assignee:'운영관리 최은영',slaDue:'08-06 22:14',slaPct:100,visit:null,
  auto:{cat:'환경 > 소음',conf:0.74},rep:3,sat:3,photos:0,log:[]},
 {id:'REQ-26080312',sp:UNIT_REF.c01,mine:false,cat:'환경',sub:'소음',urg:'낮음',
  at:'08-03 21:02',desc:'인접 개체 소음 재발',
  st:'done',assignee:'운영관리 최은영',slaDue:'08-06 21:02',slaPct:100,visit:null,
  auto:{cat:'환경 > 소음',conf:0.72},rep:3,sat:null,photos:0,log:[]},
];


export let WORKORDERS=[
 {id:'WO-2608-018',trg:'알람',src:'AL-2608-041',nm:'급수 배관 누수 긴급 점검',sp:COMMON.mech,eq:'P-B1-03',
  pri:'긴급',assignee:'이재훈',due:'08-07 20:00',st:'progress',ver:'CL-PIPE-v3',dur:null,
  chk:[{n:'급수 밸브 차단 확인',r:'ok'},{n:'누수 지점 육안 확인',r:'bad'},{n:'배관 이음부 토크 점검',r:null},{n:'주변 절연 상태 확인',r:null}]},
 {id:'WO-2608-017',trg:'알람',src:'AL-2608-039',nm:'EHP 실외기 필터·팬 점검',sp:COMMON.util,eq:'EHP-2-03',
  pri:'높음',assignee:'김성호',due:'08-08 12:00',st:'progress',ver:'CL-EHP-v5',dur:null,
  chk:[{n:'프리필터 오염도 확인',r:'bad'},{n:'실외기 팬 회전 이상음',r:'ok'},{n:'냉매 압력 측정',r:'ok'},{n:'소비전력 재측정',r:null}]},
 {id:'WO-2608-016',trg:'민원',src:'REQ-26080712',nm:`${MODULE.id} ${spaceOf('living').nm} 냉방 성능 점검`,sp:MODULE.id,eq:'AC-LV-01',
  pri:'보통',assignee:'김성호',due:'08-08 14:00',st:'planned',ver:'CL-AC-v4',dur:null,
  chk:[{n:'실내기 필터 상태',r:null},{n:'설정온도·풍량 확인',r:null},{n:'서향 일사 차단 상태',r:null},{n:'냉매 누설 점검',r:null}]},
 {id:'WO-2608-015',trg:'점검',src:'정기 점검',nm:'AHU-1-01 프리필터 교체',sp:COMMON.vent,eq:'AHU-1-01',
  pri:'낮음',assignee:'박지훈',due:'08-09 18:00',st:'planned',ver:'CL-AHU-v2',dur:null,
  chk:[{n:'전원 차단 확인',r:null},{n:'프리필터 교체',r:null},{n:'차압계 리셋',r:null}]},
 {id:'WO-2608-014',trg:'알람',src:'AL-2608-034',nm:'승강기 진동 정밀 점검',sp:COMMON.ev,eq:'EV-2',
  pri:'높음',assignee:'협력사 성진엘리베이터',due:'08-08 17:00',st:'reported',ver:'CL-EV-v6',dur:95,
  chk:[{n:'가이드레일 정렬',r:'bad'},{n:'로프 장력',r:'ok'},{n:'권상기 베어링 소음',r:'ok'},{n:'제동 시험',r:'ok'}]},
 {id:'WO-2608-013',trg:'민원',src:'REQ-26080711',nm:`${UNIT_REF.b03} 싱크대 하부 누수 조치`,sp:UNIT_REF.b03,eq:'급수 배관',
  pri:'긴급',assignee:'이재훈',due:'08-07 20:55',st:'planned',ver:'CL-PIPE-v3',dur:null,
  chk:[{n:'급수 차단',r:null},{n:'누수 지점 특정',r:null},{n:'패킹·이음부 교체',r:null}]},
 {id:'WO-2608-012',trg:'알람',src:'AL-2608-029',nm:'EHP-2-03 필터 청소',sp:COMMON.util,eq:'EHP-2-03',
  pri:'보통',assignee:'김성호',due:'08-06 18:00',st:'approved',ver:'CL-EHP-v5',dur:48,
  chk:[{n:'프리필터 청소',r:'ok'},{n:'소비전력 재측정',r:'ok'}]},
 {id:'WO-2608-011',trg:'민원',src:'REQ-26080508',nm:`${MODULE.id} ${spaceOf('kitchen').nm} 후드 필터 교체`,sp:MODULE.id,eq:'HD-KT-01',
  pri:'낮음',assignee:'박지훈',due:'08-06 12:00',st:'approved',ver:'CL-HOOD-v1',dur:36,
  chk:[{n:'필터 교체',r:'ok'},{n:'풍량 2단계 조정',r:'ok'},{n:'PM2.5 재측정',r:'ok'}]},
 {id:'WO-2608-010',trg:'수동',src:'관리자 등록',nm:'주차장 조명 LED 교체(3구역)',sp:COMMON.park1,eq:'LED-B1-3',
  pri:'낮음',assignee:'협력사 한빛전기',due:'08-05 18:00',st:'hold',ver:'CL-LED-v1',dur:120,
  chk:[{n:'안정기 교체',r:'ok'},{n:'점등 시험',r:'bad'},{n:'배선 절연 확인',r:'ok'}]},
];


/* ══════════ 예방 정비 권고 · 최적화 권고 (FR-MNT-06 / FR-SIM-06,07) ══════════
   type — 운전 / 정비 / 공지 / 설계
   '설계' 는 운영으로 못 고치고 모듈 설계를 바꿔야 하는 권고다. 모듈러는 공장
   생산이므로 이미 설치된 유닛에 즉시 반영할 수 없다. 그래서 아래 3필드를 갖는다.
     target     '즉시 반영' | '차기 생산분' — 반영 시점
     cfdCase    근거가 된 CFD 케이스 추적 번호 (문자열 · 화면 표기용)
     moduleType 대상 모듈 타입 (MODULE_TYPES 의 id)
   ※ cfdCase 는 data/cfdCases.json 의 키가 아니라 근거 추적용 표기 번호다.
     실제 케이스와의 대응은 basis 문구에 남긴다.                              */
export let RECS=[
 {id:'RC-020',type:'설계',fr:'FR-SIM-08',nm:`${typeNmOf('MODULAR-A')} 서측 창호 차양 표준 적용`,
  target:'차기 생산분', cfdCase:'CFD-07', moduleType:'MODULAR-A',
  body:`${typeNmOf('MODULAR-A')} 서측 창호에 외부 차양(고정 루버)을 표준 사양으로 추가할 것을 권고합니다. 전동커튼 자동 제어는 실내측 대응이라 유리 표면 취득열 자체를 줄이지 못합니다.`,
  basis:['CFD 케이스 「거실만 냉방 · 외기 34℃」 — 주방 존 41.4℃ 로 설정온도 도달 실패',
         '반복 알람 그룹 G-02 · 동일 타입 2기에서 동일 현상',
         '차양은 생산 단계 설치 항목 — 기설치 유닛 후속 적용은 별도 검토'],
  eff:[{l:'대상',v:'차기 생산분'},{l:'적용 타입',v:typeNmOf('MODULAR-A')},{l:'신뢰도',v:'중'}],
  side:'동절기 일사 취득이 함께 줄어 난방 부하가 늘 수 있습니다. 계절별 재산출이 필요합니다.', st:'pending'},
 {id:'RC-019',type:'설계',fr:'FR-SIM-08',nm:`${typeNmOf('MODULAR-A')} 주방 급기 경로 분리`,
  target:'차기 생산분', cfdCase:'CFD-04', moduleType:'MODULAR-A',
  body:`${typeNmOf('MODULAR-A')}은 주방이 거실 냉방 경로 끝단에 있어 냉기가 도달하지 않습니다. 환기 유닛 급기 덕트를 주방으로 분기하는 사양 변경을 권고합니다.`,
  basis:['CFD 전 케이스에서 주방 존이 항상 최고온 — 거실 대비 +9℃ 이상',
         '현재 급기 경로는 거실·침실 2계통 (data/cfdConstants.js servedSpaces)',
         '덕트 경로 변경은 모듈 골조 단계 작업 — 현장 개조 불가'],
  eff:[{l:'대상',v:'차기 생산분'},{l:'적용 타입',v:typeNmOf('MODULAR-A')},{l:'신뢰도',v:'중'}],
  side:'급기 분기 시 거실 토출 풍량이 줄어듭니다. 유닛 용량 재검토가 선행되어야 합니다.', st:'pending'},
 {id:'RC-018',type:'정비',fr:'FR-MNT-06',nm:'EHP-2-03 점검 주기 단축',
  body:'최근 30일 내 동일 설비 고장성 작업이 3회 발생했습니다. 점검 주기를 분기 → 월 1회로 단축하고 프리필터를 조기 교체할 것을 권고합니다.',
  basis:['AL-2608-039 · AL-2608-029 · AL-2608-021 (30일 내 3회)','소비전력 정격 대비 평균 128% (기준 110%)'],
  eff:[{l:'예상 고장률',v:'−42%'},{l:'추가 비용',v:'+18만원/년'},{l:'신뢰도',v:'중'}],
  side:'점검 인력 투입 시간이 월 2시간 증가합니다.', st:'pending'},
 {id:'RC-017',type:'운전',fr:'FR-SIM-06',nm:'공용부 냉방 선제 운전 (피크 분산)',
  body:'내일 14~17시 전력 피크가 예상됩니다. 공용부 EHP를 12시부터 선제 가동해 피크 시간대 부하를 분산하면 최대 수요를 낮출 수 있습니다.',
  basis:['수요 예측 피크 14:40 · 예상 최대 428kW','기상 예보 최고 35.2℃'],
  eff:[{l:'피크 절감',v:'−7.4%'},{l:'예상 절감액',v:'34만원/월'},{l:'쾌적 영향',v:'없음'}],
  side:'12~14시 사이 공용부 소비전력이 소폭 증가합니다. 실내 온도 범위(22~26℃)는 유지됩니다.', st:'pending'},
 {id:'RC-016',type:'공지',fr:'FR-SIM-07',nm:'서향 유닛 일사 차단 사전 안내',
  body:`${COMMON.westLine} 5기에서 오후 실내온도가 재실 냉방 상한 26℃를 반복 초과합니다. 전동커튼 자동 제어 설정 안내를 사전 발송할 것을 권고합니다.`,
  basis:['AL-2608-037 · AL-2608-036 반복 알람 그룹 G-02','대상 유닛 5기 · 평균 초과 시간 2.4시간/일'],
  eff:[{l:'예상 민원 감소',v:'−3건/월'},{l:'대상 유닛',v:'5기'},{l:'소요',v:'즉시'}],
  side:'입주민 알림 피로도 증가 가능 — 월 1회로 제한합니다.', st:'pending'},
 {id:'RC-015',type:'정비',fr:'FR-SIM-07',nm:'C타입 구역 순찰 동선 조정',
  body:`동일 모듈 타입 ${typeNmOf('MODULAR-C')} 1기(${UNIT_REF.c01})에서 소음 민원이 90일 내 3건 반복되었습니다. 심야 순찰 동선에 해당 타입 구역을 추가하는 것을 권고합니다.`,
  basis:['REQ-26080710 · REQ-26080401 · REQ-26080312 (반복 민원)','발생 시간대 21~23시 집중'],
  eff:[{l:'예상 민원 감소',v:'−2건/월'},{l:'추가 인력',v:'0.3h/일'},{l:'신뢰도',v:'중'}],
  side:'기존 순찰 시간이 20분 늘어납니다.', st:'approved'},
 {id:'RC-014',type:'운전',fr:'FR-SIM-06',nm:'급탕 순환펌프 야간 정지',
  body:'01~05시 급탕 사용량이 전체의 1.8%에 불과합니다. 순환펌프를 간헐 운전으로 전환하면 대기 손실을 줄일 수 있습니다.',
  basis:['야간 급탕 사용량 1.8% (30일 평균)','순환펌프 상시 운전 2.4kW'],
  eff:[{l:'예상 절감',v:'−288kWh/월'},{l:'예상 절감액',v:'41만원/월'},{l:'쾌적 영향',v:'경미'}],
  side:'야간 온수 사용 시 초기 도달 시간이 20~40초 늘어날 수 있습니다.', st:'rejected'},
];


/* ══════════ 환경 리스크 예측 (FR-SIM-03) ══════════ */
export const RISKS=[
 {nm:'고온 리스크',grade:'경고',sp:spaceOf('living').nm,score:78,c:'#d64545',
  why:'서향 · 오후 일사 집중. 향후 6시간 내 31℃ 초과 확률 72%',rec:'전동커튼 자동 폐쇄 + 취침 2시간 전 선제 냉방'},
 {nm:'공기질 리스크',grade:'주의',sp:spaceOf('living').nm,score:54,c:'#e08a12',
  why:`CO₂ 903ppm 상승 추세 · 재실 ${MODULE.household}인 · 창문 닫힘 3시간`,rec:'환기 30분 또는 환기 유닛 급기량 2단계'},
 {nm:'결로 리스크',grade:'양호',sp:'전체',score:12,c:'#1a9c6a',
  why:'현재 외기 34℃ · 실내 노점 17.8℃ — 하절기 위험 낮음',rec:'동절기 재평가 (11월 이후)'},
];


/* 타입별 진행 중 작업 수 — 작업 지시의 대상에서 타입을 역산 (단지 공용부는 제외) */
export const WORKORDERS_COUNT_BY_TYPE=WORKORDERS.reduce((m,w)=>{
  const t=typeOfLoc(w.sp);
  if(t&&(w.st==='planned'||w.st==='progress'))m[t]=(m[t]||0)+1;
  return m;},{});


/* 동일 타입 반복 현상 — 알람을 [타입 × 알람종류] 로 묶는다 */
export function typeGroups(list){
  const m={};
  list.forEach(a=>{const t=typeOfLoc(a.loc); if(!t)return;
    const k=t+'|'+a.type; (m[k]=m[k]||{type:t,kind:a.type,units:new Set(),rep:0,items:[]});
    m[k].units.add((String(a.loc).match(/MOD-[A-Z]-\d+/)||[])[0]); m[k].rep+=a.rep; m[k].items.push(a);});
  return Object.values(m).filter(g=>g.units.size>=2);
}


/* ══════════ 에너지 · KPI 추이 (FR-ENG-01 / FR-RPT-03) ══════════ */
export const ENG_TREND=Array.from({length:30},(_,i)=>({
  d:i+1, elec:+(2600+rnd(i+200)*900+(i>20?420:0)).toFixed(0),
  heat:+(380+rnd(i+230)*160).toFixed(0), water:+(148+rnd(i+260)*46).toFixed(0)}));

export const KPIS=[
 {nm:'민원 1차 확인 시간',unit:'시간',dir:'down',cur:2.4,prev:3.1,
  series:[4.2,3.9,3.6,3.4,3.1,2.7,2.4],target:'2.0 이하'},
 {nm:'SLA 준수율',unit:'%',dir:'up',cur:92.4,prev:88.1,
  series:[81,83,85,86,88,90,92.4],target:'95 이상'},
 {nm:'반복 민원 비율',unit:'%',dir:'down',cur:18.2,prev:21.5,
  series:[26,25,24,23,22,21.5,18.2],target:'15 이하'},
 {nm:'예방 정비 비율',unit:'%',dir:'up',cur:61.0,prev:54.2,
  series:[42,46,49,51,53,54,61],target:'70 이상'},
 {nm:'개체 평균 전력',unit:'kWh',dir:'down',cur:104.4,prev:98.2,
  series:[88,91,94,96,97,98,104.4],target:'95 이하'},
 {nm:'설비 가동률',unit:'%',dir:'up',cur:97.8,prev:98.4,
  series:[99,98.8,98.6,98.5,98.4,98.4,97.8],target:'99 이상'},
];

export const IFACES=[
 {id:'IF-BMS',nm:'BMS (건물 관리)',proto:'OPC-UA',last:'17:42:58',cnt:'1,284/h',err:0.0,st:'ok'},
 {id:'IF-EMS',nm:'EMS (에너지)',proto:'REST/배치',last:'17:30:00',cnt:'240/h',err:0.0,st:'ok'},
 {id:'IF-IOT',nm:'IoT 게이트웨이',proto:'MQTT/TLS',last:'17:43:11',cnt:'18,420/h',err:0.4,st:'warn'},
 {id:'IF-ACS',nm:'출입 통제',proto:'REST/훅',last:'17:41:26',cnt:'86/h',err:0.0,st:'ok'},
 {id:'IF-APP',nm:'민원 앱',proto:'REST API',last:'17:38:04',cnt:'12/h',err:0.0,st:'ok'},
 {id:'IF-WMS',nm:'작업 관리',proto:'REST API',last:'17:20:15',cnt:'8/h',err:0.0,st:'ok'},
 {id:'IF-ERP',nm:'회계·정산',proto:'파일 배치',last:'—',cnt:'—',err:null,st:'off'},
];

/* 24시간 이벤트 타임라인 */
export const TIMELINE=[
 {t:'16:55',k:'r',m:`<b>${UNIT_REF.b03}</b> 급수 누수 민원 접수 — 긴급 SLA 4시간`},
 {t:'16:52',k:'r',m:`<b>${COMMON.mech}</b> 누수 감지 알람 (AL-2608-041)`},
 {t:'16:30',k:'w',m:`<b>${MODULE.id}</b> CO₂ 903ppm 기준 초과 — 반복 3회`},
 {t:'15:12',k:'w',m:`<b>${COMMON.util}</b> EHP-2-03 비정상 운전 · 작업 WO-2608-017 진행`},
 {t:'14:48',k:'w',m:`<b>${UNIT_REF.c04}</b> IoT 게이트웨이 통신 장애`},
 {t:'14:20',k:'i',m:`<b>${COMMON.westLine}</b> 실내온도 초과 반복 알람 그룹 G-02 생성`},
 {t:'13:40',k:'g',m:`<b>${UNIT_REF.a04}</b> CO₂ 초과 알람 조치 완료`},
 {t:'11:22',k:'w',m:`<b>${COMMON.ev}</b> 승강기 진동 이상 · 협력사 점검 요청`},
 {t:'10:24',k:'i',m:`<b>${MODULE.id}</b> 냉난방 민원 접수 · 자동 분류 92%`},
 {t:'09:15',k:'i',m:`<b>${UNIT_REF.c02}</b> 에너지 사용 이상치 탐지 (+2.4σ)`},
 {t:'08:00',k:'i',m:`<b>${COMMON.vent}</b> AHU-1-01 필터 교체 주기 도래`},
];

/* 알림 센터 */
export const NOTI={
 resident:[
  {k:'w',t:`${spaceOf('living').nm} 고온 주의`,b:'현재 29.1℃ · 적정 범위(18~26℃)를 초과했습니다. 전동커튼 자동 폐쇄를 권장합니다.',m:'10분 전'},
  {k:'i',t:'민원 방문 일정 확정',b:'REQ-26080712 냉난방 불량 · 08-08(토) 14:00 방문 예정입니다.',m:'2시간 전'},
  {k:'g',t:'민원 처리 완료',b:'REQ-26080508 주방 후드 조치가 완료되었습니다. 만족도를 평가해 주세요.',m:'어제'},
  {k:'i',t:'이달 전기 사용 안내',b:'현재 21.8kWh · 예상 97.0kWh로 누진 1단계 이내입니다.',m:'어제'},
 ],
 admin:[
  {k:'r',t:'긴급 · 누수 감지',b:`${COMMON.mech} 급수 배관 P-B1-03 · 즉시 조치 필요`,m:'51분 전'},
  {k:'r',t:'긴급 민원 접수',b:`${UNIT_REF.b03} 싱크대 하부 누수 · SLA 4시간 (20:55 까지)`,m:'48분 전'},
  {k:'w',t:'반복 알람 그룹 G-02',b:`${COMMON.westLine} 실내온도 초과 5회 — 예방 정비 권고 후보 등록`,m:'3시간 전'},
  {k:'w',t:'연계 오류율 상승',b:'IF-IOT 오류율 0.4% — 임계 0.5% 접근',m:'4시간 전'},
  {k:'i',t:'권고안 승인 대기',b:'3건의 운영 권고안이 검토를 기다리고 있습니다.',m:'5시간 전'},
 ]};


/* ── 우리 집 이력서 (modular F-18 · PRD 범위 밖) ── */
export const HOMEHIST=[
 {d:'2026.08.05',k:'i',t:'민원 처리 완료',m:'주방 후드 필터 교체 · 풍량 2단계 조정 (REQ-26080508)'},
 {d:'2026.07.31',k:'g',t:'민원 처리 완료',m:`${spaceOf('bath').nm} 조명 모듈 교체 (REQ-26072903) · 만족도 5점`},
 {d:'2026.06.15',k:'i',t:'정기 점검',m:'거실 스마트 TV·에어컨 정기 점검 · 이상 없음'},
 {d:'2026.05.02',k:'i',t:'정기 점검',m:'세대 냉방 설비 점검 · 필터 사용률 62%'},
 {d:'2026.03.01',k:'i',t:'정기 점검',m:'주방 설비 · 냉장고 정기 점검'},
 {d:'2025.09.14',k:'w',t:'부품 교체',m:'욕실 환기팬 베어링 교체 (WO-2509-021)'},
 {d:'2025.03.18',k:'g',t:'입주',m:'입주 전 최종 점검 완료 · 하자 0건'},
 {d:'2025.02.20',k:'g',t:'준공 검사',m:'세대 준공 검사 합격 · 방수 담수 시험 합격'},
 {d:'2025.01.28',k:'i',t:'마감 시공',m:'바닥·벽·천장 마감 시공 완료'},
 {d:'2024.11.05',k:'i',t:'모듈 설치',m:'모듈러 유닛 현장 설치 · 접합부 기밀 시험 합격'},
 {d:'2024.10.12',k:'i',t:'공장 출하',m:'모듈 제작 완료 · 공장 품질 검사 합격 (검사번호 MQ-2410-0338)'},
];

/* ── 이사·양도 패키지 (modular F-19 · PRD 범위 밖) ── */
export const TRANSFER_ITEMS=[
 {nm:'세대 기본 정보',d:'평형 · 향 · 준공일 · 입주 이력',on:true},
 {nm:'설비 이력',d:'점검 · 정비 · 부품 교체 전체 이력 11건',on:true},
 {nm:'자재·마감 스펙',d:'공간별 마감재 · 제조사 · 시공일',on:true},
 {nm:'에너지 성능 실적',d:'최근 12개월 사용량 · 동일 평형 대비 효율 등급',on:true},
 {nm:'실내 환경 품질 이력',d:'온습도 · 공기질 12개월 통계',on:true},
 {nm:'하자·민원 이력',d:'접수 3건 · 처리 완료 3건 · 미해결 0건',on:true},
 {nm:'배관·전선 경로도',d:'리모델링 참고용 도면',on:false},
 {nm:'개인 생활 패턴 데이터',d:'재실 시간대 · 기기 사용 패턴',on:false},
];

/* ── 이웃 세대 비교 (modular F-10 · PRD F-402) ── */
export const NEIGHBOR={
  grade:'B+', pct:23, n:214, unitType:`${MODULE.typeNm} ${MODULE_AREA}㎡`,
  items:[
    {nm:'전기 사용량',me:96.4,avg:104.8,unit:'kWh',lower:true},
    {nm:'냉방 사용량',me:41.2,avg:36.4,unit:'kWh',lower:true},
    {nm:'급탕 사용량',me:2.8,avg:3.4,unit:'㎥',lower:true},
    {nm:'수도 사용량',me:8.1,avg:9.2,unit:'㎥',lower:true},
    {nm:'대기전력',me:4.6,avg:2.0,unit:'kWh',lower:true},
    {nm:'실내 쾌적 시간',me:78,avg:71,unit:'%',lower:false},
  ],
  tip:`${spaceOf('bedroom').nm} 에어컨 대기전력이 동일 타입 평균 대비 <b>2.3배</b> 높습니다. 미사용 시 자동 차단을 설정하면 월 약 <b>3,200원</b> 절감이 예상됩니다.`,
};

/* ── 에너지 절감 시나리오 (modular F-14 · PRD F-706) ── */
/* ══════════ 절감 시나리오 (단계 8 수정 6) ══════════════════════════
   금액은 임의 단가(구 720원/kWh)가 아니라 해당 세대의 누진 한계 단가로 계산한다.
   한계 단가 = (단계 전력량요금 + 기후환경 + 연료비조정) × (1 + 부가세 + 기금)
   회수기간(개월) = 투자비 / 월 절감액.
   회수기간이 설비 수명(life, 개월)을 넘으면 금액을 표시하지 않고
   「경제성 낮음 · 쾌적 개선 목적」으로 표기한다 (규칙 §9).            */
const MARGINAL=marginalWon(FORECAST_KWH,NOW.m);          // 원/kWh
const SCN_SEED=[
 {id:'S1',nm:'대기전력 자동 차단',d:'미사용 30분 후 콘센트 전원을 자동 차단합니다. 설정만으로 적용되며 비용이 들지 않습니다.',
  save:4.6,cost:0,life:null,diff:'쉬움',eff:'즉시'},
 {id:'S2',nm:'냉방 설정온도 +1℃',d:'12~16시 부하 집중 시간대에만 설정온도를 1℃ 올립니다. 쾌적 범위는 유지됩니다.',
  save:8.2,cost:0,life:null,diff:'쉬움',eff:'즉시'},
 /* 구현 메모 (화면 표시 없음) —
    커튼 제어는 별도 서버(192.168.0.51) 경유, Lambda 구현 시 별도 엔드포인트 필요 */
 {id:'S3',nm:'서향 전동커튼 자동화',d:`일사량 연동으로 14~18시 전동커튼을 자동 폐쇄합니다. ${spaceOf('living').nm} 고온 문제도 함께 완화됩니다.`,
  save:12.4,cost:0,life:null,diff:'보통',eff:'설정 후'},
 {id:'S4',nm:'고효율 에어컨 교체',d:'1등급 인버터 모델로 교체합니다. 설비 투자가 필요합니다.',
  save:26.8,cost:1200000,life:180,diff:'어려움',eff:'교체 후'},   // 에어컨 수명 15년
 {id:'S5',nm:'창호 단열 필름 시공',d:'서향 창에 로이 필름을 시공해 일사 유입을 줄입니다.',
  save:9.6,cost:480000,life:120,diff:'보통',eff:'시공 후'},        // 필름 수명 10년
 {id:'S6',nm:'전체 적용 (S1+S2+S3)',d:'비용이 들지 않는 3개 시나리오를 모두 적용합니다.',
  save:25.2,cost:0,life:null,diff:'보통',eff:'즉시'},              // S1+S2+S3 합계
];
export const SCENARIOS=SCN_SEED.map(s=>{
  const won=Math.round(s.save*MARGINAL/10)*10;
  const pay=s.cost>0?Math.ceil(s.cost/won):0;
  const overLife=s.life!=null&&pay>s.life;
  return {...s, won, pay, marginal:+MARGINAL.toFixed(1), overLife,
    note:overLife?'경제성 낮음 · 쾌적 개선 목적':null};
});

/* ── 리모델링 옵션 (modular F-17 · PRD 범위 밖) ── */
export const REMODEL=[
 {id:'R1',nm:`${spaceOf('living').nm} 일부 → 재택근무 공간 분리`,d:'경량 벽체 신설 · 조명 재배치',cost:420,days:5,
  eff:{struct:'영향 없음',elec:'회로 1개 증설 필요',hvac:'디퓨저 1개 이설',energy:'−2.1 kWh/월'}},
 {id:'R2',nm:'거실–주방 간벽 제거',d:'비내력벽 철거 · 개방형 LDK',cost:680,days:8,
  eff:{struct:'비내력벽 · 구조 영향 없음',elec:'콘센트 2개소 이설',hvac:'냉방 부하 +8% · 실내기 용량 재검토',energy:'+4.6 kWh/월'}},
 {id:'R3',nm:'욕실 전면 리모델링',d:'방수 재시공 · 위생기구 교체',cost:850,days:12,
  eff:{struct:'영향 없음',elec:'환기팬 회로 교체',hvac:'환기 풍량 100→150㎥/h',energy:'+0.8 kWh/월'}},
 {id:'R4',nm:'전체 창호 교체',d:'3중 유리 시스템창 · 로이 코팅',cost:1450,days:6,
  eff:{struct:'개구부 변경 없음',elec:'영향 없음',hvac:'냉난방 부하 −18%',energy:'−14.2 kWh/월'}},
];

/* ── 실내환경 예측 (modular F-15 · PRD F-703) ── */
export const ENVPRED={
  temp:{cur:29.1,series:[29.1,29.8,30.4,30.9,31.2,31.4,31.3],limit:26,label:`${spaceOf('living').nm} 온도`},
  co2:{cur:903,series:[903,948,996,1042,1088,1121,1146],limit:1000,label:`${spaceOf('living').nm} CO₂`},
  hitAt:'약 2.4시간 후', hitVal:'1,000ppm',
  note:`현재 재실 ${MODULE.household}인 · 창문 닫힘 3시간 · 환기 유닛 1단계 기준입니다. 환기 30분 실행 시 CO₂가 640ppm 수준으로 회복됩니다.`,
};


/* ══════════ 안전·보안 이벤트 (PRD 2.2 KPI「안전」 · 3.1 보안담당 · 4.1 모듈2) ══════════
   ※ FRD v1.0에 대응 기능이 없어 v0.7에서 신설 — FRD 개정 제안 대상               */
export const SAFE_SEV={1:{nm:'긴급',c:'r'},2:{nm:'높음',c:'w'},3:{nm:'보통',c:'i'},4:{nm:'정보',c:'g'}};

export let SAFETY=[
 {id:'SF-2608-014',type:'비인가 출입 시도',sev:2,loc:COMMON.park1,src:'IF-ACS · ACS-B1-02',
  at:'08-08 02:14',st:'open',due:'08-08 06:14',owner:'보안 이재석',cctv:'CAM-B1-02',
  d:'등록되지 않은 카드로 3회 연속 인증 실패했습니다.',act:'CCTV 영상 확인 후 관리사무소 보고'},
 {id:'SF-2608-013',type:'화재 감지기 통신 두절',sev:1,loc:COMMON.corr,src:'IF-BMS · FD-C-04',
  at:'08-08 01:38',st:'acting',due:'08-08 02:38',owner:'시설 김성호',cctv:'CAM-2F4-01',
  d:'화재 감지기 신호가 40분간 수신되지 않았습니다. 감지 공백 구간이 발생했습니다.',act:'현장 확인 · 예비 감지기 가동'},
 {id:'SF-2608-012',type:'비상구 개방 지속',sev:2,loc:COMMON.stair,src:'IF-ACS · DR-C-01',
  at:'08-07 21:05',st:'open',due:'08-08 01:05',owner:'보안 이재석',cctv:'CAM-3F1-02',
  d:'비상구 문이 32분간 열린 상태로 유지되었습니다.',act:'즉시 폐쇄 · 반복 시 도어클로저 점검'},
 {id:'SF-2608-011',type:'주차장 차량 충돌 감지',sev:3,loc:COMMON.park2,src:'IF-CCTV · CAM-B2-05',
  at:'08-07 18:42',st:'done',due:'08-08 18:42',owner:'보안 이재석',cctv:'CAM-B2-05',
  d:'CCTV 영상 분석에서 접촉 사고로 추정되는 이벤트가 감지되었습니다.',act:'차주 확인 완료 · 경미 접촉'},
 {id:'SF-2608-010',type:'승강기 갇힘 신고',sev:1,loc:COMMON.ev,src:'IF-BMS · EV-2',
  at:'08-07 11:20',st:'done',due:'08-07 11:35',owner:'시설 김성호',cctv:'CAM-EV2',
  d:'승강기 비상 호출 버튼이 작동했습니다.',act:'구조 완료 (소요 9분) · 진동 점검 작업 WO-2608-014 연계'},
 {id:'SF-2608-009',type:'소화전 압력 저하',sev:2,loc:COMMON.mech,src:'IF-BMS · FH-B1-01',
  at:'08-06 09:12',st:'done',due:'08-06 13:12',owner:'시설 이재훈',cctv:'—',
  d:'소화 배관 압력이 기준(7.0bar) 미만인 6.4bar로 측정되었습니다.',act:'가압 펌프 재기동 완료'},
];

export const CCTVS=[
 {id:'CAM-B1-02',nm:'주차장 B1 출입구',st:'rec'},
 {id:'CAM-2F4-01',nm:COMMON.corr,st:'rec'},
 {id:'CAM-3F1-02',nm:COMMON.stair,st:'rec'},
 {id:'CAM-EV2',nm:COMMON.ev,st:'off'},
];

/* ── 감사 로그 (PRD NF-012 · FR-ADM-02) ── */
export const AUDIT=[
 {at:'08-08 17:42:11',u:'최은영',r:'운영 관리자',act:'민원 상세 조회',tgt:`REQ-26080712 (${MODULE.id})`,ip:'10.20.3.14',rs:'허용'},
 {at:'08-08 17:38:02',u:'김성호',r:'시설 관리자',act:'알람 상태 변경',tgt:'AL-2608-039 → 조치 중',ip:'10.20.3.51',rs:'허용'},
 {at:'08-08 17:20:47',u:'정우성',r:'협력사',act:'작업 체크리스트 저장',tgt:'WO-2608-014',ip:'10.20.9.88',rs:'허용'},
 {at:'08-08 16:55:30',u:'최은영',r:'운영 관리자',act:'개체 에너지 상세 조회',tgt:`${UNIT_REF.c02} 개체`,ip:'10.20.3.14',rs:'허용'},
 {at:'08-08 16:12:09',u:'정우성',r:'협력사',act:'개체 민원 목록 조회',tgt:'REQ-* (전체)',ip:'10.20.9.88',rs:'차단 · E-AUTH-001'},
 {at:'08-08 15:04:22',u:'김성호',r:'시설 관리자',act:'작업 지시 생성',tgt:`WO-2608-017 (${COMMON.util})`,ip:'10.20.3.51',rs:'허용'},
 {at:'08-08 14:31:55',u:'이재석',r:'보안 담당',act:'CCTV 영상 조회',tgt:'CAM-B1-02 · 02:10~02:20',ip:'10.20.7.22',rs:'허용'},
 {at:'08-08 11:08:40',u:'최은영',r:'운영 관리자',act:'권고안 승인',tgt:`RC-015 (${typeNmOf('MODULAR-C')} 순찰 동선)`,ip:'10.20.3.14',rs:'허용'},
 {at:'08-08 09:45:13',u:'김민준',r:'입주민',act:'타 개체 민원 조회 시도',tgt:`REQ-26080711 (${UNIT_REF.b03})`,ip:'203.***.***.41',rs:'차단 · E-AUTH-001'},
 {at:'08-08 08:02:31',u:'system',r:'시스템',act:'월간 리포트 초안 생성',tgt:'RPT-2607 v1.0',ip:'—',rs:'허용'},
];

/* ── 협력사 작업 성과 (PRD 9. 정비 작업 화면) ── */
export const PARTNERS=[
 {nm:'성진엘리베이터',cat:'승강기',cnt:14,onTime:92.9,avgH:1.6,rework:1,score:'A'},
 {nm:'한빛전기',cat:'전기·조명',cnt:23,onTime:87.0,avgH:2.1,rework:3,score:'B+'},
 {nm:'대영설비',cat:'배관·급수',cnt:19,onTime:94.7,avgH:1.9,rework:0,score:'A'},
 {nm:'우성공조',cat:'냉난방·환기',cnt:31,onTime:80.6,avgH:2.8,rework:5,score:'B'},
 {nm:'세정클린',cat:'청소·방역',cnt:42,onTime:97.6,avgH:1.2,rework:0,score:'A+'},
];

/* ── 비용·작업시간 분석 (PRD 9. 리포트 화면 · IF-ERP) ── */
export const COSTS=[
 {k:'유지보수 자재',v:8420000,c:'#0877ed'},
 {k:'협력사 용역',v:12600000,c:'#6b57d6'},
 {k:'에너지 (공용부)',v:9840000,c:'#e08a12'},
 {k:'청소·방역',v:4200000,c:'#0f9b9b'},
 {k:'보안·안전',v:3100000,c:'#1a9c6a'},
];

export const WORKTIME=[
 {k:'냉난방·환기',h:86.8,n:31},{k:'전기·조명',h:48.3,n:23},{k:'배관·급수',h:36.1,n:19},
 {k:'승강기',h:22.4,n:14},{k:'청소·방역',h:50.4,n:42},
];

/* IF-CCTV 추가 (PRD 8.3 · FRD 12 누락분) */
IFACES.splice(4,0,{id:'IF-CCTV',nm:'CCTV 영상 이벤트',proto:'RTSP / 이벤트 훅',last:'17:43:02',cnt:'34/h',err:0.0,st:'ok'});


/* 타입별 진행 중 작업 수 — 공간 계층 집계의 나머지 한 항목.
   data/module.js 의 MODULE_TYPES 집계에서 이 줄만 옮겨왔다 (순환 import 방지) */
MODULE_TYPES.forEach(t=>{ t.wo=WORKORDERS_COUNT_BY_TYPE[t.id]||0; });

/* 인라인 핸들러가 참조하는 심볼을 window 에 등록 (동작 유지) */
Object.assign(window,{ENERGY,EQUIP_KWH,EQUIP_DETAIL,ALARMS,REQUESTS,WORKORDERS,RECS,RISKS,WORKORDERS_COUNT_BY_TYPE,typeGroups,ENG_TREND,KPIS,IFACES,TIMELINE,NOTI,HOMEHIST,TRANSFER_ITEMS,NEIGHBOR,SCENARIOS,REMODEL,ENVPRED,SAFE_SEV,SAFETY,CCTVS,AUDIT,PARTNERS,COSTS,WORKTIME});
