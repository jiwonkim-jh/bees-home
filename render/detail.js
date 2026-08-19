/* BEES Home v0.9 · render/detail.js — 공용 상세 패널 (DetailPanel)
   규칙 §6 : L3 상세는 전부 인페이지 패널. 모달은 되돌릴 수 없는 조작 2종만.
   #dlg 단일 슬롯을 재사용하던 방식은 상세에서 상세를 열면 이전 것이 사라졌다.
   여기서는 스택을 유지해 중첩 진입과 ESC 단계별 후퇴를 지원한다.
   목록→상세 패턴을 화면마다 다르게 만들지 않기 위한 단일 컴포넌트다.     */
import {state} from '../data/state.js';
import {$,app} from '../data/module.js';
/* shell.js · pages/resident.js 와 순환 import 다. 서로 참조하는 심볼이 모두
   함수 선언이라 호이스팅으로 안전하며, 최상위에서 호출하지 않는다. */
import {closeAll,toggleDrawer,toggleAi} from './shell.js';
import {renderPlan,renderRight} from '../pages/resident.js';

const stack=()=>state.detail.stack;
const top=()=>stack()[stack().length-1]||null;

/* sections = [{label, body}]  ·  actions = [{label, kind:'primary'|'ghost', fn}] */
export function openDetail({title,subtitle,sections,actions,onBack}){
  stack().push({title,subtitle:subtitle||'',sections:(sections||[]).filter(Boolean),
    actions:(actions||[]).filter(Boolean),onBack,tab:0});
  renderDetail();
  return stack().length;
}
/* ══════════ 우측 패널 네비게이션 스택 ══════════════════════════════
   [summary] → [summary,space] → [summary,space,sensor]
   backToSummary / backToSpace 두 갈래를 없애고 popDetail() 하나로 합친다. */
const RIGHT_PATH={summary:['summary'], space:['summary','space'],
                  sensor:['summary','space','sensor']};
export function rightStack(){
  if(!state.right)state.right={stack:['summary']};
  return state.right.stack;
}
export function rightMode(){const s=rightStack();return s[s.length-1];}
/* 정해진 경로로만 이동해 스택이 어긋나지 않게 한다 */
export function rightTo(mode){
  const p=RIGHT_PATH[mode]||RIGHT_PATH.summary;
  state.right.stack=p.slice();
  return rightMode();
}

/* ══════════ 한 단계 후퇴 — 앱의 유일한 '뒤로' 경로 ══════════════════
   ESC 키와 모든 ← 버튼이 이 함수 하나만 호출한다.
   우선순위 : 모달 → 상세 패널 → 드로어 → AI → 집중모드 → 우측 패널.
   전부 비어 있으면 아무것도 하지 않는다.                              */
export function popDetail(){
  /* 1) 되돌릴 수 없는 조작용 모달 2종 */
  if(!$('dlg').classList.contains('hidden')){closeAll();return 'dlg';}
  /* 2) 공용 상세 패널 스택 */
  if(stack().length){
    const t=stack().pop();
    if(t&&typeof t.onBack==='function')t.onBack();
    renderDetail();
    return 'detail:'+stack().length;
  }
  /* 3) 알림 드로어 · 4) AI 패널 · 5) 집중 모드 */
  if(state.drawerOpen){toggleDrawer();return 'drawer';}
  if(state.aiOpen){toggleAi();return 'ai';}
  if(state.bare){state.bare=false;app.classList.remove('bare');return 'bare';}
  /* 6) 우측 패널 스택 — 입주민 우리 집 현황에서만 의미가 있다 */
  const rs=rightStack();
  if(rs.length>1){
    rs.pop();
    if(rightMode()==='summary'){state.selRoom=null;state.selSensor=null;}
    else if(rightMode()==='space'){state.selSensor=null;}
    renderPlan(); renderRight();
    return 'right:'+rs.length;
  }
  return null;                              /* 스택이 비면 아무것도 하지 않는다 */
}
export function clearDetail(){stack().length=0;renderDetail();}
export function detailDepth(){return stack().length;}
export function setDetailTab(i){const t=top(); if(!t)return; t.tab=+i; renderDetail();}

export function renderDetail(){
  const el=$('detailPanel'); if(!el)return;
  const t=top();
  if(!t){el.classList.add('hidden'); el.innerHTML=''; return;}
  const multi=t.sections.length>1;
  const cur=t.sections[Math.min(t.tab,t.sections.length-1)]||{body:''};
  el.innerHTML=`
    <div class="dpHead">
      <button class="dpBack" data-back="1" title="뒤로">←</button>
      <span class="dpT"><span class="dpTitle">${t.title}</span>
        ${t.subtitle?`<span class="dpSub">${t.subtitle}</span>`:''}</span>
      ${stack().length>1?`<span class="dpDepth">${stack().length}단</span>`:''}
      <button class="dpX" data-close="1" title="닫기">✕</button>
    </div>
    ${multi?`<div class="dpTabs">${t.sections.map((s,i)=>
      `<button class="${i===(t.tab||0)?'on':''}" data-tab="${i}">${s.label||('구역 '+(i+1))}</button>`).join('')}</div>`:''}
    <div class="dpBody">${!multi&&cur.label?`<div class="sec">${cur.label}</div>`:''}${cur.body||''}</div>
    ${t.actions.length?`<div class="dpFoot">${t.actions.map((a,i)=>
      `<button class="btn ${a.kind==='primary'?'pri':''}" data-act="${i}">${a.label}</button>`).join('')}</div>`:''}`;
  el.classList.remove('hidden');
  /* actions.fn 은 클로저이므로 인라인 onclick 대신 직접 바인딩한다 */
  el.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
    const a=t.actions[+b.dataset.act]; if(a&&typeof a.fn==='function')a.fn();}));
  el.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setDetailTab(b.dataset.tab)));
  el.querySelector('[data-back]')?.addEventListener('click',()=>popDetail());
  el.querySelector('[data-close]')?.addEventListener('click',()=>clearDetail());
  el.scrollTop=0;
}

/* 인라인 핸들러(상세 본문의 onclick)가 참조할 수 있게 window 에 등록 */
Object.assign(window,{openDetail,popDetail,clearDetail,setDetailTab,detailDepth,renderDetail,
  rightMode,rightTo,rightStack});
