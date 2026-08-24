/* BEES Home v0.9 · render/shell.js — 공용 셸 · 라우팅 · 드로어 · AI 패널 · 모달
   pages/* 와 순환 import 관계다. 서로 참조하는 심볼이 모두 함수 선언이라
   호이스팅으로 안전하며, 최상위에서 호출하는 코드는 index.html 에만 둔다. */
import {AIQ,BOOT_MSGS,NAVG,PAGES,ROLES,allowedPages,landingPage} from '../data/const.js';
import {$,COMMON,COMPLEX,ENVSYS,UNIT_REF,app,aqiOf,deviceOf,devicesOf,fx,spaceOf,won} from '../data/module.js';
import {MODULE} from '../data/moduleUnit.js';
import {ALARMS,COSTS,ENERGY,NEIGHBOR,NOTI,RECS,REQUESTS,SAFETY,WORKORDERS} from '../data/ops.js';
import {state} from '../data/state.js';
import {clearDetail,detailDepth,popDetail} from './detail.js';
import {myWos,pgAlarm,pgCctv,pgAudit,pgDash,pgMap,pgRec,pgReport,pgReq,pgSafety,pgWork,renderPartner} from '../pages/admin.js';
import {pgSimulator} from '../pages/simulator.js';
import {pgEnergyRes,pgEnvpred,pgHistory,pgHome,pgLifespan,pgMaterial,pgNeighbor,pgPipe,pgRemodel,pgReqstat,pgRequest,pgRoadmap,pgScenario,pgTransfer,renderPipe,renderPlan,renderReqForm,renderReqPlan,renderRight,selectRoom} from '../pages/resident.js';

/* ══════════════════════════════════════════════════════════════════
   부팅 · 로그인 · 역할
   ══════════════════════════════════════════════════════════════════ */
export function renderRoleSel(){
  $('roleSel').innerHTML=Object.entries(ROLES).map(([k,r])=>`
    <button class="roleOpt ${state.pickedRole===k?'on':''}" onclick="pickRole('${k}')">
      <span class="ri">${r.icon}</span>
      <span><span class="rn">${r.nm}</span><span class="rd">${r.scope} · ${r.d}</span></span>
    </button>`).join('');
}

export function pickRole(r){state.pickedRole=r;renderRoleSel();}

export function doLogin(e){
  e.preventDefault();
  const id=$('lgId').value.trim(), pw=$('lgPw').value;
  if(id.toLowerCase()!=='admin'||pw!=='123'){
    $('lgErr').classList.remove('hidden'); $('lgPw').value=''; $('lgPw').focus();
    document.querySelector('.bootwin').animate(
      [{transform:'translateX(0)'},{transform:'translateX(-7px)'},{transform:'translateX(7px)'},{transform:'translateX(0)'}],{duration:260});
    return;
  }
  state.loginUser=id||'Admin';
  $('bootform').classList.add('hidden'); $('bootload').classList.remove('hidden');
  $('bootStat').textContent='Authenticating';
  let i=0; const t=setInterval(()=>{
    i++; $('bbarI').style.width=Math.round(i/BOOT_MSGS.length*100)+'%';
    $('bmsg').textContent=BOOT_MSGS[Math.min(i,BOOT_MSGS.length-1)];
    if(i>=BOOT_MSGS.length){clearInterval(t);
      setTimeout(()=>{$('boot').classList.add('out');$('app').classList.remove('hidden');
        setTimeout(()=>{const b=$('boot');if(b)b.remove();},560);
        setRole(state.pickedRole);},420);}
  },250);
}

export function renderRoleSw(){
  $('roleSw').innerHTML=Object.entries(ROLES).map(([k,r])=>
    `<button class="${state.role===k?'on':''}" onclick="setRole('${k}')" title="${r.d}">${r.nm}</button>`).join('');
}

export function setRole(r){
  state.role=r; state.loginUser=ROLES[r].user;
  renderRoleSw(); renderEnvStrip(); renderNotiBadge(); renderDrawer();
  state.chatLog=[]; if(state.aiOpen)renderAi();
  $('scopeTxt').textContent=ROLES[r].scope;
  const isMob=r==='partner';
  $('shell').classList.toggle('hidden',isMob);
  $('mobWrap').classList.toggle('hidden',!isMob);
  if(isMob){renderPartner();return;}
  /* 역할이 바뀌면 현재 화면이 그 역할 범위 밖일 수 있다 — 진입 화면으로 되돌린다 */
  if(!allowedPages(r).includes(state.page))state.page=landingPage(r);
  renderSideNav(); renderPage();
}

export function renderSideNav(){
  const groups=NAVG[state.role]||[];
  let s='';
  groups.forEach(g=>{
    s+=`<div class="navSec">${g.g}</div>`;
    g.items.forEach(k=>{
      const p=PAGES[k]; if(!p)return;
      const n=p.bdg?p.bdg():0;
      /* T1(실연산 시연 대상)만 좌측 2px 마커. 배지·색상은 쓰지 않는다 */
      s+=`<button class="navItem ${state.page===k?'on':''} ${p.out?'scopeout':''} ${p.tier==='T1'?'t1':''}" onclick="goPage('${k}')">
        <span class="ni">${p.i}</span><span>${p.nm}</span>
        ${n>0?`<span class="nbdg ${p.bw?'w':''}">${n}</span>`:`<span class="nsc">${p.c}</span>`}</button>`;
    });
  });
  const R=ROLES[state.role];
  s+=`<div class="navFoot"><span class="dotOn"></span>실시간 연계 7/8<br>
    <b style="color:var(--ink2)">${R.user}</b> · ${R.nm}<br>${R.scope}<br>
    <span style="color:var(--purple);font-weight:700">DEMO 데이터</span></div>`;
  $('sideNav').innerHTML=s;
}

/* 페이지를 옮기면 상세 스택은 비운다 (같은 정보에 진입 경로를 남기지 않는다) */
export function goPage(k){clearDetail();state.page=k;renderSideNav();renderPage();$('mainArea').scrollTop=0;}

/* ══════════ T3 화면 수치 제거 (규칙 §7 · 단계 8 수정 8) ══════════════
   T3 는 로드맵 구상 단계다. 근거 없는 수치가 데모에서 반박당하는 것을 막기 위해
   구조와 항목명만 남기고 숫자·단위·금액을 표시하지 않는다.
   · 태그와 속성은 건드리지 않는다 (style·viewBox·fill 이 깨지면 레이아웃이 무너진다)
   · 화면·설비 식별 코드(HM-08, SCR-13, SEO_36 …)는 항목명이므로 보존한다
   · 'roadmap' 은 Phase 배지가 화면의 본체라 대상에서 제외한다 (T3 8개 목록 밖)   */
const T3_STRIP=['lifespan','material','pipe','history','remodel','transfer','safety','audit'];
const CODE_RE=/\b(?:HM|SCR|RM|AL|REQ|WO|RC|SF|CAM|IF|EV|AHU|EHP|ERV|ACS|FD|DR|FH|LED|GW|WS|P|MOD|G)[-_][\w.-]+/g;
const NUM_UNIT_RE=/\d[\d,.]*\s*(?:kWh|kW|W\b|℃|°C|%|㎥\/h|㎥|㎡|ppm|ppb|㎍\/㎥|만원|천원|원|개월|개소|시간|년|일|건|기|개|회|h\b|T\b|mm|m\b|σ|bar|점)/g;
/* 플레이스홀더에 숫자를 쓰면 뒤이은 숫자 제거 단계가 그것까지 지워
   식별 코드가 복원되지 않는다. 그래서 영문자만으로 인코딩한다. */
const PH_A='ABCDEFGHIJ';                              // 자리수 0~9 → A~J
const phEnc=i=>'\u0001'+String(i).replace(/\d/g,d=>PH_A[+d])+'\u0001';
export function stripT3Numbers(html){
  return html.split(/(<[^>]*>)/).map(part=>{
    if(part.charAt(0)==='<')return part;                 // 태그·속성 보존
    const keep=[];
    let t=part.replace(CODE_RE,m=>{keep.push(m);return phEnc(keep.length-1);});
    t=t.replace(NUM_UNIT_RE,'—').replace(/\d[\d,.]*/g,'—').replace(/—(?:\s*[·~/-]\s*—)+/g,'—');
    return t.replace(/\u0001([A-J]+)\u0001/g,(m,c)=>keep[+c.replace(/[A-J]/g,ch=>PH_A.indexOf(ch))]);
  }).join('');
}

export function renderPage(){
  const p=PAGES[state.page]; if(!p)return;
  const M=$('mainArea');
  M.className='mainArea '+(p.full?'full':'pad');
  let html=(PAGEFN[state.page]||(()=>'<div class="empty">준비 중</div>'))();
  if(T3_STRIP.includes(state.page))html=stripT3Numbers(html);
  M.innerHTML=html;
  if(state.page==='home'){renderPlan();renderRight();}
  if(state.page==='pipe'){renderPipe();const sv=$('pipeSvg'); if(sv)sv.innerHTML=stripT3Numbers(sv.innerHTML);}
  if(state.page==='request'){renderReqForm();renderReqPlan();}
}

export function pgHead(k,d,act){
  const p=PAGES[k];
  return `<div class="pgHead"><div><div class="pt">${p.nm}<span class="pcode">${p.c}</span>
    ${p.out?'<span class="scopeTag">PRD 범위 밖</span>':''}</div>
    <div class="pd2">${d}</div></div><div class="pgAct">${act||''}</div></div>`;
}

/* ══════════════════════════════════════════════════════════════════
   상단 환경 스트립 (센서필드 §1)
   ══════════════════════════════════════════════════════════════════ */
export function renderEnvStrip(){
  const pg=ENVSYS.pm10<=15?'ok':ENVSYS.pm10<=35?'info':'warn';
  $('envStrip').innerHTML=`
    <span class="ei"><span class="gi">☀</span>외부온도 <b>${fx(ENVSYS.outTemp)}°C</b></span>
    <span class="ei"><span class="gi">🌫</span>미세먼지 <b style="color:${pg==='ok'?'#7fd8b0':'#fff'}">${ENVSYS.pm10Grade}</b> ${ENVSYS.pm10}㎍/㎥</span>
    <span class="ei"><span class="gi">📅</span>${ENVSYS.date} <b>${ENVSYS.time}</b></span>
    <span class="ei"><span class="gi">📶</span>${ENVSYS.wifi}</span>
    <span class="ei"><span class="gi">🔋</span>${ENVSYS.battery}%</span>
    <span class="ei"><b>${ENVSYS.lang}</b></span>`;
}


/* ══════════ 화면 함수 레지스트리 ══════════ */
export const PAGEFN={
  roadmap:pgRoadmap,
  home:pgHome, material:pgMaterial, pipe:pgPipe, envpred:pgEnvpred, neighbor:pgNeighbor,
  energy:pgEnergyRes, scenario:pgScenario, simulator:pgSimulator, request:pgRequest, reqstat:pgReqstat,
  lifespan:pgLifespan, history:pgHistory, remodel:pgRemodel, transfer:pgTransfer,
  dash:pgDash, map:pgMap, cctv:pgCctv, alarm:pgAlarm, req:pgReq, work:pgWork,
  report:pgReport, rec:pgRec, safety:pgSafety, audit:pgAudit,
};


/* ══════════════════════════════════════════════════════════════════
   공통 다이얼로그 · 민원 · 리포트
   ══════════════════════════════════════════════════════════════════ */
export function dlgOpen(title,meta,body,footer,w){
  $('dlg').className='dlg'; $('dlg').style.width=(w||600)+'px'; $('dlg').style.maxWidth='94vw';
  $('dlg').innerHTML=`<div class="dh2"><span class="dt3">${title}</span>
    <span style="display:flex;align-items:center;gap:11px"><span class="dm2">${meta||''}</span>
    <button class="dx" onclick="closeAll()">✕</button></span></div>
    <div class="dbd">${body}</div>${footer?`<div class="dft">${footer}</div>`:''}`;
  $('mask').classList.remove('hidden'); $('dlg').classList.remove('hidden');
}

export function closeAll(){$('mask').classList.add('hidden');$('dlg').classList.add('hidden');}

export function toast(m){const t=$('toast');t.innerHTML=`<span class="ti2">✓</span>${m}`;t.classList.remove('hidden');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.add('hidden'),3200);}


/* ══════════ 알림 드로어 ══════════ */
export function toggleDrawer(){state.drawerOpen=!state.drawerOpen;$('drawer').classList.toggle('open',state.drawerOpen);if(state.drawerOpen)renderDrawer();}

export function renderDrawer(){
  const list=NOTI[state.role==='resident'?'resident':'admin']||[];
  $('drawerBody').innerHTML=list.map(n=>{
    const c={r:'#d64545',w:'#e08a12',i:'#0877ed',g:'#1a9c6a'}[n.k];
    return `<button class="notiItem" onclick="notiGo('${n.k}')">
      <span class="nd" style="background:${c}"></span>
      <span style="flex:1;min-width:0"><span class="nt2">${n.t}</span>
      <span class="nb">${n.b}</span><span class="nm2">${n.m}</span></span></button>`;}).join('');
}

export function notiGo(k){
  toggleDrawer();
  if(state.role==='resident'){selectRoom('bedroom');}
  else if(state.role==='partner'){return;}
  else goPage(k==='r'?'alarm':k==='w'?'alarm':'rec');
}

export function renderNotiBadge(){
  const list=NOTI[state.role==='resident'?'resident':'admin']||[];
  const n=list.filter(x=>x.k==='r'||x.k==='w').length;
  $('notiBdg').textContent=n; $('notiBdg').classList.toggle('hidden',n===0);
}

export function toggleAi(){state.aiOpen=!state.aiOpen;$('aiPanel').classList.toggle('hidden',!state.aiOpen);if(state.aiOpen)renderAi();}

export function renderAi(){
  if(state.chatLog.length===0){
    state.chatLog.push({r:'ai',t: state.role==='resident'
      ? `안녕하세요, <b>${MODULE.id}</b> 입주민님. 지금 유닛 상태를 요약해 드릴게요.<br><br>· 실내 <b>29.1℃</b> · 습도 51% · 공기질 주의<br>· 오늘 전기 <b>3.2kWh</b> · 예상 요금 12,550원<br>· <b>${spaceOf('living').nm}이 29.1℃</b>로 적정 범위를 넘었습니다`
      : state.role==='partner'
      ? `<b>${ROLES.partner.user}</b>님, 오늘 배정 작업은 <b>${myWos().length}건</b>입니다.<br><br>가장 급한 작업은 <b>WO-2608-014 승강기 진동 정밀 점검</b>이며 기한은 08-08 17:00입니다.`
      : `<b>${COMPLEX.nm}</b> 운영 현황입니다.<br><br>· 미처리 알람 <b>${ALARMS.filter(a=>a.st!=='done').length}건</b> (긴급 ${ALARMS.filter(a=>a.sev===1&&a.st!=='done').length})<br>· 미처리 민원 <b>${REQUESTS.filter(r=>r.st!=='done').length}건</b><br>· <b>미조치 안전 이벤트 ${SAFETY.filter(s=>s.st!=='done').length}건</b><br>· 승인 대기 권고 <b>${RECS.filter(r=>r.st==='pending').length}건</b>`});
  }
  $('aiBody').innerHTML=state.chatLog.map(m=>`<div class="msg ${m.r==='ai'?'ai':'me'}">${m.t}</div>`).join('');
  $('aiQs').innerHTML=(AIQ[state.role]||[]).map(q=>`<button onclick="ask('${q}')">${q}</button>`).join('');
  $('aiBody').scrollTop=9e9;
}

/* 현재 화면 컨텍스트 — 질문 시점의 화면·선택 상태를 그대로 넘긴다 */
export function aiCtx(){
  return {page:state.page, selRoom:state.selRoom, selSensor:state.selSensor, viewMode:state.planMode};
}

export function ask(q){state.chatLog.push({r:'me',t:q});state.chatLog.push({r:'ai',t:aiReply(q,aiCtx())});renderAi();}

export function sendAsk(){const v=$('aiInput').value.trim();if(!v)return;$('aiInput').value='';ask(v);}

export function aiReply(q,ctx=aiCtx()){
  const s=q.toLowerCase();
  /* 선택된 공간이 있으면 그 공간을 기준으로 답한다. 없으면 기존대로 거실 기준.
     공간 선택은 HM-01 도면에만 있으므로, 다른 화면으로 넘어간 뒤 남은
     selRoom 값으로 엉뚱하게 답하지 않도록 page 로 한 번 더 막는다.        */
  const sp=(ctx.page==='home'&&ctx.selRoom&&spaceOf(ctx.selRoom))||null;
  const dv=(ctx.selSensor&&deviceOf(ctx.selSensor))||null;
  /* 컨텍스트 머리말 — 무엇을 보고 답하는지 먼저 밝힌다 */
  const head=sp
    ? `<span class="srcb meas">${PAGES[ctx.page]?PAGES[ctx.page].c:ctx.page}</span> <b>${sp.nm}</b> 선택 중${
        dv?` · ${dv.nm} <span style="font-family:monospace">${dv.id}</span>`:''}${
        ctx.viewMode?` · ${ctx.viewMode.toUpperCase()} 도면`:''}<br><br>`
    : '';
  /* 선택 공간 기준 환경 요약 — 측정원 없는 항목은 '센서 없음' 으로 답한다 */
  if(sp){
    const e=sp.env, aq=aqiOf(sp);
    const tTxt=e.temp==null?'센서 없음':`<b>${e.temp}℃</b>`;
    const hTxt=e.humi==null?'센서 없음':`${e.humi}%`;
    const aTxt=aq==null?'공기질 센서 없음 (이 공간에 스위치 미설치)':`종합지수 <b>${aq}</b> · CO₂ ${e.co2}ppm`;
    const dl=devicesOf(sp.id);
    if(s.includes('더워')||s.includes('온도')||s.includes('쾌적')){
      /* 조치 제안은 그 공간에 실제로 있는 기기만 언급한다 */
      const blind=devicesOf(sp.id).find(d=>d.type==='SEC');
      const acts=[blind?`전동커튼 <span style="font-family:monospace">${blind.id}</span> 폐쇄`:null,'취침 2시간 전 선제 냉방']
                 .filter(Boolean).map(a=>'· '+a).join('<br>');
      return head+`<b>${sp.nm}</b> 현재 온도는 ${tTxt}, 습도 ${hTxt}입니다.<br><br>`+
        (e.temp==null?'이 공간에는 온습도 측정 기기(전등)가 없습니다.'
         :e.temp>26?`재실 냉방 상한 <b>26℃</b>를 <b>+${(e.temp-26).toFixed(1)}℃</b> 초과했습니다.<br>${acts}`
                   :'적정 범위 안입니다.')+
        `<br><br>측정원 ${sp.envSrc.th?`<span style="font-family:monospace">${sp.envSrc.th}</span>`:'없음'}`;
    }
    if(s.includes('공기')||s.includes('환기')||s.includes('co2')||s.includes('먼지'))
      return head+`<b>${sp.nm}</b> 공기질은 ${aTxt}입니다.<br><br>`+
        (aq==null?'CO₂·미세먼지·TVOC 는 스위치(SES)가 측정합니다. 이 공간에는 해당 기기가 없어 값을 표시하지 않습니다.'
                 :aq>=50?'환기 30분 또는 환기 유닛 급기량 2단계를 권장합니다.':'현재는 조치가 필요하지 않습니다.');
    if(s.includes('전기')||s.includes('요금')||s.includes('사용량'))
      return head+`<b>${sp.nm}</b> 최근 24시간 사용량은 <b>${fx(sp.kwh,2)}kWh</b>입니다.<br><br>`+
        dl.filter(d=>d.meas.kwhToday>0).sort((a,b)=>b.meas.kwhToday-a.meas.kwhToday).slice(0,3)
          .map(d=>`· ${d.nm} <b>${fx(d.meas.kwhToday,2)}kWh</b>`).join('<br>')+
        `<br><br>유닛 전체는 ${fx(ENERGY.todayKwh,2)}kWh 입니다.`;
    if(s.includes('기기')||s.includes('센서')||s.includes('디바이스'))
      return head+`<b>${sp.nm}</b>에 기기 <b>${dl.length}개</b>가 있고 <b>${dl.filter(d=>d.meas.on).length}개</b>가 동작 중입니다.<br><br>`+
        dl.map(d=>`· ${d.nm} <span style="font-family:monospace">${d.id}</span> — ${d.meas.on?'ON':'OFF'}`).join('<br>');
  }
  if(state.role==='resident'){
    if(sp)return head+`<b>${sp.nm}</b> 상태입니다.<br><br>· 온도 ${sp.env.temp==null?'센서 없음':`<b>${sp.env.temp}℃</b>`} · 습도 ${sp.env.humi==null?'센서 없음':sp.env.humi+'%'}<br>· 공기질 ${aqiOf(sp)==null?'센서 없음':'지수 '+aqiOf(sp)}<br>· 24시간 전기 <b>${fx(sp.kwh,2)}kWh</b><br><br>더 궁금한 항목을 물어보세요 (온도 · 공기질 · 전기 · 기기).`;
    if(s.includes('더워')||s.includes('거실'))return `<b>${spaceOf('living').nm}</b>은 서향이라 오후 일사가 집중됩니다.<br><br>현재 <b>29.1℃</b> · 적정 상한 26℃ 대비 <b>+3.1℃</b>입니다. 향후 6시간 내 31℃ 초과 확률이 <b>72%</b>로 예측됩니다.<br><br>· 전동커튼 SEC_1 자동 폐쇄<br>· 취침 2시간 전 선제 냉방<br><br>두 가지를 적용하면 취침 시각 기준 <b>27℃ 이하</b>로 낮출 수 있습니다.`;
    if(s.includes('요금')||s.includes('전기'))return `이달 누적 <b>21.8kWh</b>, 예상 <b>97.0kWh</b>입니다.<br><br>· 예상 누진 <b>1단계</b> (200kWh 이하)<br>· 예상 전기료 <b>12,550원</b><br><br>누진 2단계까지 <b>103kWh</b> 여유가 있습니다.`;
    if(s.includes('이웃')||s.includes('비교'))return `동일 평형 <b>${NEIGHBOR.n}세대</b> 평균과 비교하면 효율 등급 <b>${NEIGHBOR.grade}</b> · 상위 <b>${NEIGHBOR.pct}%</b>입니다.<br><br>· 전기 96.4kWh (평균 104.8) — 좋음<br>· <b>대기전력 4.6kWh (평균 2.0)</b> — 개선 필요<br><br>대기전력 자동 차단만 설정해도 월 3,200원을 아낄 수 있습니다.`;
    if(s.includes('민원'))return REQUESTS.filter(r=>r.mine&&r.st!=='done').length
      ? `진행 중인 민원이 <b>${REQUESTS.filter(r=>r.mine&&r.st!=='done').length}건</b> 있습니다.<br><br>· <b>REQ-26080712</b> 냉난방 불량 — 처리 중<br>· 방문 예정 <b>08-08 14:00</b>`
      : `진행 중인 민원이 없습니다.`;
    return `현재 유닛 상태입니다.<br><br>· 온도 <b>29.1℃</b> · 습도 51% · CO₂ 903ppm<br>· 오늘 전기 <b>3.2kWh</b><br>· 주의 <b>${spaceOf('living').nm} 고온 · CO₂ 상승 추세</b><br><br><b>환기 30분</b>과 <b>전동커튼 폐쇄</b>를 권장합니다.`;
  }
  if(state.role==='partner'){
    if(s.includes('안전'))return `현재 작업 <b>승강기 진동 정밀 점검</b>의 안전 유의사항입니다.<br><br>· 작업 전 <b>전원 차단</b> 확인<br>· <b>2인 1조</b> 작업 원칙<br>· 개인보호구(안전모·안전대) 착용 필수<br>· 승강로 진입 시 비상정지 스위치 위치 확인`;
    return `배정된 작업은 <b>${myWos().length}건</b>입니다.<br><br>${myWos().slice(0,3).map(w=>`· <b>${w.id}</b> ${w.nm} (기한 ${w.due})`).join('<br>')}`;
  }
  if(s.includes('급한')||s.includes('긴급'))return `가장 시급한 건은 <b>3건</b>입니다.<br><br><b>1. SF-2608-013 화재 감지기 통신 두절</b> (긴급 · 안전)<br>${COMMON.corr} · 감지 공백 발생<br><br><b>2. AL-2608-041 누수 감지</b> (긴급)<br>${COMMON.mech} · 작업 WO-2608-018 진행 중<br><br><b>3. REQ-26080711 급수 누수 민원</b><br>${UNIT_REF.b03} · SLA 20:55까지`;
  if(s.includes('sla')||s.includes('민원'))return `SLA 임박 민원은 <b>${REQUESTS.filter(r=>r.slaPct>=80&&r.st!=='done').length}건</b>입니다.<br><br>· <b>REQ-26080605</b> ${UNIT_REF.c02} 전기·조명 — 경과 <b>76%</b><br>기한 80% 경과 시 담당자 경고가 자동 발송됩니다.`;
  if(s.includes('안전')||s.includes('보안'))return `미조치 안전 이벤트가 <b>${SAFETY.filter(s2=>s2.st!=='done').length}건</b>입니다.<br><br>${SAFETY.filter(s2=>s2.st!=='done').map(s2=>`· <b>${s2.type}</b> — ${s2.loc} (대응기한 ${s2.due})`).join('<br>')}<br><br>PRD KPI 「미조치 위험 이벤트 수」 목표는 <b>0건</b>입니다.`;
  if(s.includes('비용')||s.includes('원'))return `이번 달 운영 비용은 <b>${won(Math.round(COSTS.reduce((a,c)=>a+c.v,0)/10000))}만원</b>입니다.<br><br>${COSTS.map(c=>`· ${c.k} ${won(Math.round(c.v/10000))}만원`).join('<br>')}<br><br>개체당 약 <b>${won(Math.round(COSTS.reduce((a,c)=>a+c.v,0)/COMPLEX.units/1000))}천원</b> · IF-ERP 미연계로 추정 배분값입니다.`;
  if(s.includes('반복')||s.includes('알람'))return `반복 알람 그룹이 <b>2개</b> 있습니다.<br><br><b>G-02 실내 온도 상한 초과</b> (9회)<br><b>동일 모듈 타입 ${MODULE.typeNm} 2기</b>(${MODULE.id}·${UNIT_REF.a03})의 ${spaceOf('living').nm}에서 같은 현상입니다.<br>개별 개체 문제가 아니라 <b>타입 설계</b>(서향 일사 차단) 이슈로 보입니다 (권고 RC-016).`;
  return `현재 운영 상태입니다.<br><br>· 미처리 알람 <b>${ALARMS.filter(a=>a.st!=='done').length}건</b> · 민원 <b>${REQUESTS.filter(r=>r.st!=='done').length}건</b><br>· 미조치 안전 <b>${SAFETY.filter(s2=>s2.st!=='done').length}건</b><br>· 진행 작업 <b>${WORKORDERS.filter(w=>w.st==='progress').length}건</b> · 승인 대기 권고 <b>${RECS.filter(r=>r.st==='pending').length}건</b><br>· 연계 <b>7/8</b> 정상 (IF-ERP 미연계)`;
}

/* ══════════ 집중 모드 · 키 ══════════ */
export function toggleFocus(){state.bare=!state.bare;app.classList.toggle('bare',state.bare);
  if(state.bare)toast('집중 모드 — ESC로 패널을 다시 표시합니다');}

/* ESC — 분기 하나. 후퇴 순서는 popDetail() 이 전부 판단한다 (단계 9).
   모달 → 상세 패널 → 드로어 → AI → 집중모드 → 우측 패널 → 없으면 무동작 */
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  popDetail();
});

/* 인라인 핸들러가 참조하는 심볼을 window 에 등록 (동작 유지) */
Object.assign(window,{renderRoleSel,pickRole,doLogin,renderRoleSw,setRole,renderSideNav,goPage,renderPage,pgHead,renderEnvStrip,PAGEFN,dlgOpen,closeAll,toast,toggleDrawer,renderDrawer,notiGo,renderNotiBadge,toggleAi,renderAi,ask,sendAsk,aiReply,aiCtx,toggleFocus});
