/* BEES Home v0.9 · data/state.js — 전역 상태 단일 출처
   v0.8 의 let 선언 12줄을 그대로 옮겼다. 초기값은 한 글자도 바꾸지 않았다.
   다른 모듈은 import {state} 로 참조하고 state.page='home' 처럼 속성으로 쓴다.
   setter 함수는 두지 않는다.                                            */
import {MODULE} from './moduleUnit.js';
import {SPACES} from './moduleUnit.js';
import {TRANSFER_ITEMS} from './ops.js';

export const state={
  role:'resident', loginUser:'Admin', pickedRole:'resident',
  page:'home',
  planTab:'energy', selRoom:null, selSensor:null,
  simForm:null,                 /* HM-15 입력 폼 {mode,from,to,date,time} — 최초 렌더에서 채운다 */
  simRan:null,                  /* HM-15 실행 결과 {caseId} | {error} | {unmapped} */
  /* 우측 패널 네비게이션 스택 (render/detail.js 가 관리)
     [summary] → [summary,space] → [summary,space,sensor]
     rightMode 단일 문자열을 대체한다. 읽기는 rightMode(), 이동은 rightTo(). */
  right:{ stack:['summary'] },
  outletTab:'일간', senior:true, away:false, bare:false,
  aiOpen:false, drawerOpen:false, chatLog:[],
  alarmFilter:{sev:'all',st:'all',q:''}, reqFilter:'all', woSel:'WO-2608-018',
  mapLayer:{alarm:true,request:true,work:false,energy:false}, mapType:MODULE.type,
  sensorPeriod:'D', devState:{},
  matRoom:'living', pipeOn:{water:true,drain:true,elec:true,hvac:false,comm:false},
  scnSel:'S6', remodelSel:'R1', remodelRun:false, transferSel:{},
  woTab:'list', safeFilter:'all', poWo:'WO-2608-014', poChk:{}, poPhoto:0, poNote:'',
  /* 중앙 도면 : 2D 평면도 / 3D 실내 뷰 (render/scene3d.js) */
  planMode:'2d',
  view3d:{ yaw:-34, pitch:36, zoom:1, panX:0, panY:0, cutaway:true, wallCut:1.25,
           layers:{frame:true, door:true, fix:true, ceiling:false, jet:false, porch:false} },
  /* 공용 상세 패널 스택 (render/detail.js) — L3 상세는 전부 여기로 */
  detail:{ stack:[] },
  /* 존 모델 CFD 근사 오버레이 (build_cfd.js 사전계산 · 계보 시뮬+가정) */
  cfd:{ caseId:'', data:null, loading:false, sliceY:1.1 },
  /* 작업 지시 생성 (FR-MNT-02) */
  woDraft:{},
  /* 민원 접수 폼 (페이지 내 인라인 · FR-CSM-01) */
  reqDraft:{cat:'설비',sub:null,urg:'보통',desc:'',photos:0,loc:SPACES[0].nm},
};
TRANSFER_ITEMS.forEach((t,i)=>state.transferSel[i]=t.on);

/* 인라인 핸들러가 state.matRoom='living' 처럼 직접 대입하므로 window 에 노출한다 */
window.state=state;
