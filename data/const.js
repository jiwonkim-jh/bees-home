/* BEES Home v0.9 · data/const.js — 등급·상태 코드·화면 레지스트리 */
import {COMPLEX,spaceOf} from './module.js';
import {MODULE} from './moduleUnit.js';
import {ALARMS,RECS,REQUESTS,SAFETY} from './ops.js';

export const TIERS=[{n:1,to:200,won:120.0},{n:2,to:400,won:214.6},{n:3,to:9999,won:307.3}];


/* 상태 등급 규칙 */
export const GRADE_E=[{k:'절약',c:'#1a9c6a',max:0.35},{k:'보통',c:'#0877ed',max:0.75},
               {k:'높음',c:'#e08a12',max:1.25},{k:'과다',c:'#d64545',max:99}];

export const GRADE_C=[{k:'추움',c:'#4a7fd6',max:18},{k:'서늘',c:'#5ea8d6',max:22},{k:'쾌적',c:'#1a9c6a',max:26},
               {k:'더움',c:'#e08a12',max:30},{k:'매우 더움',c:'#d64545',max:99}];

export const GRADE_A=[{k:'좋음',c:'#1a9c6a',max:49},{k:'보통',c:'#0877ed',max:69},
               {k:'나쁨',c:'#e08a12',max:84},{k:'매우 나쁨',c:'#d64545',max:999}];

export const gradeOf=(list,v)=>list.find(g=>v<=g.max)||list[list.length-1];


/* ══════════ 알람 (FRD Alarm · FR-MON-02) ══════════ */
export const SEV={1:{nm:'긴급',c:'danger'},2:{nm:'높음',c:'warn'},3:{nm:'보통',c:'info'},4:{nm:'낮음',c:'mute'}};

export const ASTATUS={occurred:'발생',ack:'확인',hold:'보류',acting:'조치 중',done:'완료'};

/* ══════════ 민원 (FRD Request · FR-CSM) ══════════ */
export const RSTATUS={received:'접수',assigned:'배정',acting:'처리 중',done:'완료'};

export const RSTEPS=['received','assigned','acting','done'];

export const RCAT={
  '설비':['냉난방 불량','급수·배수','전기·조명','승강기','환기 설비'],
  '환경':['소음','냄새','결로·곰팡이','실내 공기질'],
  '시설':['공용부 파손','주차','조경·청소'],
  '기타':['기타 문의'],
};

/* ══════════ 작업 지시 (FRD WorkOrder · FR-MNT) ══════════ */
export const WSTATUS={planned:'예정',progress:'진행 중',reported:'완료 보고',approved:'승인 완료',hold:'보완 요청'};

/* ══════════════════════════════════════════════════════════════════
   v0.7 추가 데이터
   ══════════════════════════════════════════════════════════════════ */
/* ── 역할 (PRD 3.1 · FR-ADM-02 RBAC) ── */
export const ROLES={
  resident:{nm:'입주민', icon:'🏠', scope:MODULE.id,
    d:'본인 세대 + 공용 서비스 정보만 조회', user:'김민준'},
  facility:{nm:'시설 관리자', icon:'🔧', scope:`${MODULE.typeNm} 담당 구역`,
    d:'담당 구역 설비·알람·작업 조회 및 수정', user:'김성호'},
  partner:{nm:'협력사 · 작업자', icon:'📱', scope:'배정 작업',
    d:'배정된 작업에 필요한 최소 정보만 접근', user:'성진엘리베이터 정우성'},
  admin:{nm:'운영 관리자', icon:'🛠', scope:`${COMPLEX.nm} 전체`,
    d:'단지 전체 조회 및 운영 정책 설정', user:'최은영'},
};

/* 역할별 접근 가능 메뉴 (RBAC 매트릭스) */
export const RBAC={
  resident:['home','envpred','energy','neighbor','request','reqstat','scenario','roadmap','lifespan','remodel','material','pipe','history','transfer'],
  facility:['dash','map','alarm','req','work','energy8','roadmap','safety'],
  admin:['dash','map','alarm','req','work','energy8','report','rec','roadmap','safety','audit'],
  partner:[],
};


/* ══════════════════════════════════════════════════════════════════
   화면 레지스트리
   ══════════════════════════════════════════════════════════════════ */
/* tier — T1 실연산 시연 대상 · T2 열람 전용 · T3 로드맵 구상(수치 미표시) */
export const PAGES={
  /* 입주민 */
  home:    {nm:'우리 집 현황',      i:'🏠', c:'HM-01', fr:'FR-ENG-03',  full:true, tier:'T1'},
  material:{nm:'자재·마감 정보',    i:'🪵', c:'HM-09', fr:'범위 밖',    out:true,  tier:'T3'},
  pipe:    {nm:'배관·전선 경로',    i:'🔧', c:'HM-10', fr:'범위 밖',    out:true,  tier:'T3'},
  envpred: {nm:'실내환경 예측',      i:'🔮', c:'HM-02', fr:'FR-SIM-03', tier:'T2'},
  neighbor:{nm:'이웃 세대 비교',     i:'👥', c:'HM-03', fr:'FR-ENG-02', tier:'T2'},
  energy:  {nm:'에너지 사용 분석',   i:'⚡', c:'HM-06', fr:'FR-ENG-01', tier:'T2'},
  scenario:{nm:'절감 시나리오',      i:'🔬', c:'HM-07', fr:'FR-SIM-06', tier:'T1'},
  request: {nm:'민원·하자 접수',     i:'📝', c:'HM-04', fr:'FR-CSM-01', tier:'T2'},
  reqstat: {nm:'처리 현황',          i:'🔍', c:'HM-05', fr:'FR-CSM-04', tier:'T2'},
  lifespan:{nm:'설비 수명 예측',     i:'📅', c:'HM-08', fr:'FR-SIM-04', tier:'T3'},
  history: {nm:'우리 집 이력서',     i:'📋', c:'HM-11', fr:'범위 밖',   out:true,  tier:'T3'},
  remodel: {nm:'리모델링 영향',      i:'🏗', c:'HM-12', fr:'범위 밖',   out:true,  tier:'T3'},
  transfer:{nm:'이사·양도 패키지',   i:'📦', c:'HM-13', fr:'범위 밖',   out:true,  tier:'T3'},
  /* 관리자 */
  dash:    {nm:'통합 운영 대시보드', i:'⬡', c:'SCR-01', fr:'FR-MON-01', tier:'T1'},
  map:     {nm:'디지털 트윈 맵',     i:'🗺', c:'SCR-02', fr:'FR-DTM-01', tier:'T2'},
  alarm:   {nm:'알람 관리',          i:'🔔', c:'SCR-03', fr:'FR-MON-02', tier:'T1', bdg:()=>ALARMS.filter(a=>a.st!=='done').length},
  req:     {nm:'민원 관리',          i:'📋', c:'SCR-04', fr:'FR-CSM-03', tier:'T2', bdg:()=>REQUESTS.filter(r=>r.st!=='done').length, bw:1},
  work:    {nm:'정비 작업 관리',     i:'🔧', c:'SCR-06', fr:'FR-MNT-02', tier:'T1'},
  energy8: {nm:'에너지·환경',        i:'⚡', c:'SCR-08', fr:'FR-ENG-01', tier:'T2'},
  report:  {nm:'리포트·분석',        i:'📊', c:'SCR-09', fr:'FR-RPT-01', tier:'T2'},
  rec:     {nm:'예측·권고 관리',     i:'✦', c:'SCR-10', fr:'FR-SIM-08', tier:'T1', bdg:()=>RECS.filter(r=>r.st==='pending').length, bw:1},
  safety:  {nm:'안전·보안 이벤트',   i:'🛡', c:'SCR-13', fr:'신설',      tier:'T3', bdg:()=>SAFETY.filter(s=>s.st!=='done').length},
  audit:   {nm:'감사 로그',          i:'🔐', c:'SCR-14', fr:'NF-012',    tier:'T3'},
  /* 확장 로드맵 — T3 8개 화면의 단일 진입점 */
  roadmap: {nm:'확장 로드맵',        i:'🧭', c:'RM-01',  fr:'로드맵',    tier:'T3'},
};

/* 확장 로드맵 카드 — T3 8개. 수치·금액은 표시하지 않는다 (규칙 §7) */
export const ROADMAP=[
  {k:'lifespan',ph:'Phase 2',d:'설비별 누적 운전시간으로 교체 시점을 사전에 알립니다.'},
  {k:'remodel', ph:'Phase 2',d:'구조·전기·냉난방 영향을 사전 검토합니다.'},
  {k:'material',ph:'Phase 3',d:'공간별 마감재와 제조사·시공 이력을 조회합니다.'},
  {k:'pipe',    ph:'Phase 3',d:'벽체 내부 배관·전선 경로를 타공 전에 확인합니다.'},
  {k:'history', ph:'Phase 3',d:'유닛의 점검·조치 이력을 한 장으로 정리합니다.'},
  {k:'safety',  ph:'별도 모듈 검토',d:'출입·화재·주차 이벤트를 통합 감시합니다.'},
  {k:'transfer',ph:'별도 모듈 검토',d:'이사·양도 시 이력을 비식별화해 인계합니다.'},
  {k:'audit',   ph:'별도 모듈 검토',d:'조회·변경 기록을 보존해 접근 이력을 추적합니다.'},
];

/* T3 8개 화면은 사이드바에서 빼고 'roadmap' 하나로 대체한다 */
export const NAVG={
  resident:[
    {g:'우리 집',      items:['home']},
    {g:'생활 환경',    items:['envpred','neighbor']},
    {g:'에너지',       items:['energy','scenario']},
    {g:'서비스',       items:['request','reqstat']},
    {g:'확장 계획',    items:['roadmap']},
  ],
  facility:[
    {g:'운영 현황',    items:['dash','map']},
    {g:'이벤트 처리',  items:['alarm','req','work']},
    {g:'환경',         items:['energy8']},
    {g:'확장 계획',    items:['roadmap']},
  ],
  admin:[
    {g:'운영 현황',    items:['dash','map']},
    {g:'이벤트 처리',  items:['alarm','req','work']},
    {g:'분석 · 예측',  items:['energy8','report','rec']},
    {g:'확장 계획',    items:['roadmap']},
  ],
};


export const BOOT_MSGS=['공간 마스터 로드','센서 412개 연결 확인','BMS · IoT · CCTV 연계 점검','알람 규칙 적용','권한(RBAC) 매트릭스 확인','준비 완료'];

export const SCOPE_NOTE=`<div class="scopeBanner"><span style="font-size:15px">⚠</span>
  <span>이 화면은 <b>PRD 기능요구사항(F-001~F-710)에 정의되지 않은 기능</b>입니다.
  PRD 1.3 제외범위(생산 공정·공장 품질검사)와 4.2 제외모듈(BIM 기반 설계변경)에 인접하므로,
  정식 채택 시 <b>PRD 기능요구사항 개정</b>이 선행되어야 합니다. modular_digital_twin_platform 데모에서 이관했습니다.</span></div>`;


/* ══════════════════════════════════════════════════════════════════
   입주민 · HM-01 우리 집 현황 (용인동백 재현 · 센서필드 §1~§5)
   ══════════════════════════════════════════════════════════════════ */
export const TABS=[{k:'energy',nm:'에너지',i:'⚡'},{k:'comfort',nm:'쾌적성',i:'🌡'},
            {k:'air',nm:'공기질',i:'💨'},{k:'device',nm:'디바이스',i:'⊞'}];

/* ══════════ AI 어시스턴트 ══════════ */
export const AIQ={
  resident:['지금 우리 집 상태 어때?','전기요금 얼마 나올까?',`${spaceOf('living').nm}이 왜 더워?`,'이웃보다 많이 쓰나?'],
  facility:['오늘 내 작업 뭐야?',`${MODULE.typeNm} 알람 상황은?`,'반복 알람 원인은?'],
  partner:['다음 작업은?','안전 유의사항 알려줘'],
  admin:['지금 가장 급한 건 뭐야?','SLA 위험한 민원 알려줘','안전 이벤트 상황은?','이번 달 비용은?'],
};

/* 인라인 핸들러가 참조하는 심볼을 window 에 등록 (동작 유지) */
Object.assign(window,{TIERS,GRADE_E,GRADE_C,GRADE_A,gradeOf,SEV,ASTATUS,RSTATUS,RSTEPS,RCAT,WSTATUS,ROLES,RBAC,PAGES,ROADMAP,NAVG,BOOT_MSGS,SCOPE_NOTE,TABS,AIQ});
