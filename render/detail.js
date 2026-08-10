/* BEES Home v0.9 · render/detail.js — 공용 상세 패널 (DetailPanel)
   규칙 §6 : L3 상세는 전부 인페이지 패널. 모달은 되돌릴 수 없는 조작 2종만.
   #dlg 단일 슬롯을 재사용하던 방식은 상세에서 상세를 열면 이전 것이 사라졌다.
   여기서는 스택을 유지해 중첩 진입과 ESC 단계별 후퇴를 지원한다.
   목록→상세 패턴을 화면마다 다르게 만들지 않기 위한 단일 컴포넌트다.     */
import {state} from '../data/state.js';
import {$} from '../data/module.js';

const stack=()=>state.detail.stack;
const top=()=>stack()[stack().length-1]||null;

/* sections = [{label, body}]  ·  actions = [{label, kind:'primary'|'ghost', fn}] */
export function openDetail({title,subtitle,sections,actions,onBack}){
  stack().push({title,subtitle:subtitle||'',sections:(sections||[]).filter(Boolean),
    actions:(actions||[]).filter(Boolean),onBack,tab:0});
  renderDetail();
  return stack().length;
}
/* 한 단계 후퇴. 남은 깊이를 돌려준다 (0 이면 패널 닫힘) */
export function popDetail(){
  const t=stack().pop();
  if(t&&typeof t.onBack==='function')t.onBack();
  renderDetail();
  return stack().length;
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
Object.assign(window,{openDetail,popDetail,clearDetail,setDetailTab,detailDepth,renderDetail});
