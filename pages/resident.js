/* BEES Home v0.9 · pages/resident.js — HM-01~HM-13 · RM-01 입주민 화면 */
import {GRADE_A,GRADE_C,GRADE_E,PAGES,RCAT,ROADMAP,RSTATUS,RSTEPS,SCOPE_NOTE,TABS,gradeOf} from '../data/const.js';
import {$,DEV_CTRL_INIT,LIFESPAN,MATERIALS,MYUNIT,NOW,PIPES,STYPE,aqiOf,clamp,devicesOf,fx,iconOf,plL,plX,plY,planShell,rnd,sensorReading,spaceOf,won} from '../data/module.js';
import {MODULE,SPACES} from '../data/moduleUnit.js';
import {ENERGY,ENVPRED,HOMEHIST,NEIGHBOR,NOTI,REMODEL,REQUESTS,RISKS,SAFETY,SCENARIOS,TRANSFER_ITEMS} from '../data/ops.js';
import {state} from '../data/state.js';
import {gaugeArc,svgArea,svgBars,svgMulti} from '../render/chart.js';
import {closeAll,dlgOpen,pgHead,renderPage,renderSideNav,toast} from '../render/shell.js';
import {openDetail,popDetail,clearDetail} from '../render/detail.js';
import {render3D,toggle3DLayer,toggle3DCut,spin3D,zoom3D,reset3D,selectCfdCase} from '../render/scene3d.js';
/* 3D 뷰의 인라인 핸들러도 window 에 등록한다 (2D 와 같은 방식) */
Object.assign(window,{render3D,toggle3DLayer,toggle3DCut,spin3D,zoom3D,reset3D,selectCfdCase});

export function pgHome(){
  const items=NOTI.resident.filter(n=>n.k==='w'||n.k==='r');
  const sp=spaceOf('living'), r={...sp.env, nm:sp.nm, aqi:aqiOf(sp)};
  const tg=gradeOf(GRADE_C,r.temp), ag=gradeOf(GRADE_A,r.aqi), hOk=r.humi>=40&&r.humi<=60;
  return `<div class="homeGrid">
    <div class="resCol">
      <div class="card unitCard">
        <div><div class="un">🏢 ${MYUNIT.nm}</div>
          <div class="ua">전용 ${MYUNIT.area}㎡ · ${MYUNIT.household}인 가구 · ${MYUNIT.movedIn} 입주</div></div>
        <span class="pill ok dot">${MYUNIT.occupancy}</span>
      </div>

      <div class="card butler">
        <div class="ch"><span class="ct"><span class="ci">🤖</span>BEES 집사</span>
          <span style="display:flex;gap:6px;align-items:center"><span class="pill info">${items.length}건</span>
          <button class="iconBtn" style="color:var(--muted);width:24px;height:24px;font-size:12px" onclick="goPage('envpred')" title="환경 예측">⚙</button></span></div>
        <div class="butlerBody">${items.length===0
          ? `<div class="butlerEmpty"><div class="bi">🤖</div><p>새로운 알림이 없습니다</p></div>`
          : `<div class="butlerList">${items.map((n,i)=>`
              <button class="butlerItem" onclick="${i===0?"selectRoom('bedroom')":"goPage('reqstat')"}">
                <span class="bi2">${n.k==='r'?'🚨':'⚠'}</span>
                <span style="flex:1;min-width:0"><span class="bt">${n.t}</span>
                <span class="bd">${n.b}</span><span class="bm">${n.m}</span></span></button>`).join('')}</div>`}</div>
      </div>

      <div class="card">
        <div class="ch"><span class="ct"><span class="ci">🌿</span>실내환경</span><span class="pill mute">${r.nm}</span></div>
        <div class="envRow"><span class="el"><span class="eic">🌡</span>실내온도</span>
          <span class="er"><span class="ev" style="color:${tg.c}">${fx(r.temp)}<small>°C</small></span>
          <span class="eu">적정범위 18~26°C · ${tg.k}</span></span></div>
        <div class="envRow"><span class="el"><span class="eic">💧</span>실내습도</span>
          <span class="er"><span class="ev" style="color:${hOk?'#1a9c6a':'#e08a12'}">${r.humi}<small>%</small></span>
          <span class="eu">${hOk?'적절함':'조정 필요'} · 권장 40~60%</span></span></div>
        <div class="envRow"><span class="el"><span class="eic">💨</span>공기질</span>
          <span class="er"><span class="ev" style="color:${ag.c}">${fx(r.pm25)}<small>㎍/㎥</small></span>
          <span class="eu">${ag.k} · 종합지수 ${r.aqi}</span></span></div>
        <div class="envSub"><span>PM2.5 <b>${fx(r.pm25)}</b> ㎍/㎥</span><span>CO₂ <b>${r.co2}</b> ppm</span></div>
        <div class="envRow"><span class="el"><span class="eic">🧪</span>TVOC</span>
          <span class="er"><span class="ev" style="color:${r.tvoc<=400?'#1a9c6a':'#e08a12'}">${r.tvoc}<small>ppb</small></span>
          <span class="eu">휘발성유기화합물 · 기준 400ppb</span></span></div>
      </div>

      <div class="card">
        <div class="ch"><span class="ct"><span class="ci">📋</span>내 민원</span>
          <button class="btn sm" onclick="goPage('request')">＋ 접수</button></div>
        <div class="cb" style="padding:10px 12px" id="myReqList"></div>
      </div>
    </div>

    <div class="resMid">
      <div class="tabRow">
        <div class="tabs">${TABS.map(t=>
          `<button class="${state.planTab===t.k?'on':''}" onclick="setPlanTab('${t.k}')"><span class="ti">${t.i}</span>${t.nm}</button>`).join('')}</div>
        <div class="togWrap">
          <span class="seg viewSeg">
            <button class="${state.planMode==='2d'?'on':''}" onclick="setPlanMode('2d')">▦ 2D 평면도</button>
            <button class="${state.planMode==='3d'?'on':''}" onclick="setPlanMode('3d')">🧱 3D 실내</button>
          </span>
          <button class="tog ${state.senior?'on':''}" onclick="tgSenior()"><span class="sw"></span>시니어케어</button>
          <button class="tog ${state.away?'on':''}" onclick="tgAway()"><span class="sw"></span>부재중 알림</button>
        </div>
      </div>
      <div class="card planCard">
        <div class="planWrap">
          <div class="planTip ${state.planMode==='3d'?'low':''}" id="planTip">공간을 클릭하면 우측에 상세가 표시됩니다</div>
          ${state.planMode==='3d'
            ? `<svg id="scene3d" class="scene3d" viewBox="0 0 520 430" preserveAspectRatio="xMidYMid meet"></svg>
               <div class="s3dBar" id="s3dBar"></div>
               <div class="cfdLegend hidden" id="cfdLegend"></div>`
            : `<svg id="planSvg" viewBox="0 0 520 430" preserveAspectRatio="xMidYMid meet"></svg>`}
          <div class="planLegend" id="planLegend"></div>
        </div>
      </div>
    </div>

    <div class="resCol" id="resRight"></div>
  </div>`;
}

export function setPlanTab(k){state.planTab=k;state.selSensor=null;if(state.rightMode==='sensor')state.rightMode='space';renderPage();}

export function tgSenior(){state.senior=!state.senior;renderPage();toast(state.senior?'시니어케어 ON — 장시간 미활동 감지 시 알림':'시니어케어 OFF');}

export function tgAway(){state.away=!state.away;renderPage();toast(state.away?'부재중 알림 ON — 재실 없음 상태에서 이상 감지 시 알림':'부재중 알림 OFF');}


export function renderMyReq(){
  const el=$('myReqList'); if(!el)return;
  const mine=REQUESTS.filter(r=>r.mine);
  el.innerHTML = mine.length===0 ? `<div class="empty">접수한 민원이 없습니다</div>`
    : mine.slice(0,3).map(r=>{
      const si=RSTEPS.indexOf(r.st), done=r.st==='done';
      return `<button class="sensorRow" style="align-items:flex-start" onclick="openMyReq('${r.id}')">
        <span class="si" style="background:${done?'var(--ok-soft)':'var(--blue-soft)'};border-color:${done?'#b7e6d0':'var(--blue-line)'}">${done?'✓':'⏱'}</span>
        <span style="flex:1;min-width:0"><span class="sn">${r.sub}</span>
          <span class="st">${r.id} · ${r.at}</span>
          <span class="stepFlow" style="margin-top:6px">${RSTEPS.map((s,i)=>
            `<span class="sf ${i<si?'done':i===si?'cur':''}">${RSTATUS[s]}</span>`).join('<span class="sa">›</span>')}</span>
          ${done&&r.sat===null?`<span style="display:block;margin-top:6px"><span class="pill warn">만족도 평가 대기</span></span>`:''}
        </span></button>`;}).join('');
}

/* 평면도 */
export function roomPaint(sp){
  if(state.planTab==='energy'){const g=gradeOf(GRADE_E,sp.kwh);return{c:g.c,k:g.k,v:fx(sp.kwh,2)+' kWh'};}
  if(state.planTab==='comfort'){const g=gradeOf(GRADE_C,sp.env.temp);return{c:g.c,k:g.k,v:fx(sp.env.temp)+'°C'};}
  if(state.planTab==='air'){const a=aqiOf(sp),g=gradeOf(GRADE_A,a);return{c:g.c,k:g.k,v:'지수 '+a};}
  const s=devicesOf(sp.id), on=s.filter(d=>d.meas.on).length;
  return{c:on?'#0877ed':'#96a1b0',k:on?'연결됨':'대기',v:`${on} / ${s.length}`};
}

/* 중앙 도면 모드 — 2D 평면도 / 3D 실내 뷰. 선택·지표 색은 양쪽이 공유한다 */
export function setPlanMode(m){state.planMode=m;state.selSensor=null;
  if(state.rightMode==='sensor')state.rightMode='space';
  renderPage();}

export function renderPlan(){
  if(state.planMode==='3d'){render3D();renderPlanLegend();return;}
  const sv=$('planSvg'); if(!sv)return;
  let s=planShell();
  SPACES.forEach(sp=>{
    const p=roomPaint(sp), sel=state.selRoom===sp.id, list=devicesOf(sp.id);
    const x=plX(sp.plan.x), y=plY(sp.plan.y), w=plL(sp.plan.w), h=plL(sp.plan.h);
    const cols=Math.max(1,Math.floor((w-14)/22));
    const fits=Math.ceil(list.length/cols)*20<=h-38;
    const showVal=state.planTab!=='device'||fits;
    s+=`<g class="roomG ${sel?'sel':''}" onclick="selectRoom('${sp.id}')">
      <rect class="rf" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"
        fill="${p.c}" fill-opacity="${state.planTab==='device'?0.16:0.30}" stroke="${p.c}" stroke-width="1.6"/>
      <text class="rn2" x="${x+w/2}" y="${y+h/2+(showVal?-4:0)}">${sp.nm}</text>
      ${showVal?`<text class="rv" x="${x+w/2}" y="${y+h/2+12}">${p.v}</text>`:''}</g>`;
    if(state.planTab==='device'){
      if(fits){
        list.forEach((dv,i)=>{
          const cx=x+11+(i%cols)*22, cy=y+h-12-Math.floor(i/cols)*20;
          s+=`<g class="devDot" onclick="event.stopPropagation();selectRoom('${sp.id}');selectSensor('${dv.id}')">
            <circle cx="${cx}" cy="${cy}" r="8.5" fill="${dv.meas.on?'#0877ed':'#c3ccd8'}" stroke="#fff" stroke-width="1.6"/>
            <text x="${cx}" y="${cy+3.4}" text-anchor="middle" font-size="8.5" fill="#fff">${STYPE[dv.type].icon}</text></g>`;});
      }else{
        const on=list.filter(d=>d.meas.on).length;
        s+=`<g class="devDot" onclick="event.stopPropagation();selectRoom('${sp.id}')">
          <rect x="${x+w/2-26}" y="${y+h-24}" width="52" height="17" rx="8.5"
            fill="${on?'#0877ed':'#c3ccd8'}" stroke="#fff" stroke-width="1.4"/>
          <text x="${x+w/2}" y="${y+h-12}" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">기기 ${list.length}</text></g>`;
      }
    }
  });
  sv.innerHTML=s;
  renderPlanLegend();
  $('planTip').textContent = state.selRoom
    ? `${spaceOf(state.selRoom).nm} 선택됨 — 우측 상세 표시 중`
    : '공간을 클릭하면 우측에 상세가 표시됩니다';
}
/* 범례 — 2D · 3D 공용 (지표 등급 색이 동일하다) */
export function renderPlanLegend(){
  const el=$('planLegend'); if(!el)return;
  const LG={energy:GRADE_E,comfort:GRADE_C,air:GRADE_A};
  const t=TABS.find(x=>x.k===state.planTab);
  el.innerHTML = state.planTab==='device'
    ? `<span class="lgt">${t.i} ${t.nm}</span><span class="lgi"><i class="lgd" style="background:#0877ed"></i>연결됨</span>
       <span class="lgi"><i class="lgd" style="background:#c3ccd8"></i>대기</span><span style="color:#ffffff8c">${state.planMode==='3d'?'기기를 클릭 시 제어':'아이콘 클릭 시 제어'}</span>`
    : `<span class="lgt">${t.i} ${t.nm}</span>`+LG[state.planTab].map(g=>
       `<span class="lgi"><i class="lgd" style="background:${g.c}"></i>${g.k}</span>`).join('');
}

export function selectRoom(id){state.selRoom=id;state.selSensor=null;state.rightMode='space';
  if(state.page!=='home'){state.page='home';renderSideNav();renderPage();return;}
  renderPlan();renderRight();}

export function backToSummary(){state.selRoom=null;state.selSensor=null;state.rightMode='summary';renderPlan();renderRight();}

export function backToSpace(){state.selSensor=null;state.rightMode='space';renderRight();}

export function selectSensor(sid){state.selSensor=sid;state.rightMode='sensor';renderRight();}


export function renderRight(){
  const el=$('resRight'); if(!el)return;
  if(state.rightMode==='space'&&state.selRoom) el.innerHTML=spacePanel(spaceOf(state.selRoom));
  else if(state.rightMode==='sensor'&&state.selSensor) el.innerHTML=sensorPanel();
  else el.innerHTML=summaryPanel();
  renderMyReq();
}

export function summaryPanel(){
  const E=ENERGY, tierPct=clamp(E.forecastKwh/400,0,1), usedDays=E.daily.filter(v=>v>0).length;
  return `
  <div class="card">
    <div class="ch"><span class="ct"><span class="ci">⚡</span>오늘의 전기사용량</span><span class="srcb meas">계측</span></div>
    <div class="cb">
      <div class="bigStat"><div class="bv num">${fx(E.todayKwh)}<small>kWh</small></div>
        <span class="pill ${E.todayKwh<4?'ok':'warn'}">${E.todayKwh<4?'절약 구간':'평균 이상'}</span></div>
      ${svgArea(E.hourly,300,58,'#e0a015')}
      <div class="axl"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span></div>
    </div></div>
  <div class="card">
    <div class="ch"><span class="ct"><span class="ci">📅</span>이달의 전기사용량</span><span class="cx">8월 1일 ~ ${NOW.d}일</span></div>
    <div class="cb">
      <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin-bottom:10px">
        <div class="mBox" style="height:100%"><div class="ml">누적 사용량</div>
          <div class="mv num">${fx(E.monthKwh)}<small>kWh</small></div>
          <div class="mn">지난달 같은 기간과 동일</div></div>
        <div class="gauge">${gaugeArc(tierPct,'1단계','예상 누진')}</div>
      </div>
      <div class="mGrid" style="grid-template-columns:1fr 1fr 1fr">
        <div class="mBox"><div class="ml">예상 사용량</div><div class="mv num">${fx(E.forecastKwh)}<small>kWh</small></div></div>
        <div class="mBox"><div class="ml">예상 누진단계</div><div class="mv" style="color:var(--ok)">${E.tier}단계</div></div>
        <div class="mBox"><div class="ml">예상 전기료</div><div class="mv num">${won(E.forecastWon)}<small>원</small></div></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:13px 0 5px">
        <span class="sec" style="margin:0">일별 사용량</span><span class="cx">1일 ~ 31일</span></div>
      ${svgBars(E.daily,300,50,(v,i)=>v===0?'#e8edf3':(i===usedDays-1?'#062b5c':'#38a3f5'))}
      <div class="axl"><span>1</span><span>8</span><span>15</span><span>22</span><span>31</span></div>
    </div></div>
  <div class="card">
    <div class="ch"><span class="ct"><span class="ci">🔌</span>사용량 많은 콘센트</span>
      <span class="seg mini">${['일간','주간','월간'].map(t=>
        `<button class="${state.outletTab===t?'on':''}" onclick="setOutletTab('${t}')">${t}</button>`).join('')}</span></div>
    <div class="cb">${ENERGY.outlets[state.outletTab].map((o,i)=>{
      const mx=ENERGY.outlets[state.outletTab][0].kwh;
      return `<div class="rankRow ${i===0?'top':''}"><span class="rk">${i+1}</span>
        <span class="rn3"><span class="rt">${o.nm}<span>${o.rm}</span></span>
          <span class="rb bar"><i style="width:${(o.kwh/mx*100).toFixed(0)}%;background:${i===0?'#062b5c':'#38a3f5'}"></i></span></span>
        <span class="rv2 num">${fx(o.kwh,o.kwh<10?2:1)} kWh</span></div>`;}).join('')}</div></div>
  <div class="card"><div class="cb" style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
    <button class="btn" onclick="goPage('neighbor')">👥 이웃 비교</button>
    <button class="btn" onclick="goPage('scenario')">🔬 절감 시나리오</button>
    <button class="btn" onclick="goPage('envpred')">🔮 환경 예측</button>
    <button class="btn" onclick="openReport()">📄 월간 리포트</button>
  </div></div>`;
}

export function setOutletTab(t){state.outletTab=t;renderRight();}

export function spacePanel(sp){
  const r={...sp.env, id:sp.id, nm:sp.nm, kwh:sp.kwh, icon:iconOf(sp.id), aqi:aqiOf(sp)};
  const eg=gradeOf(GRADE_E,r.kwh), cg=gradeOf(GRADE_C,r.temp), ag=gradeOf(GRADE_A,r.aqi);
  const sl=devicesOf(sp.id), onN=sl.filter(d=>d.meas.on).length;
  const bar=(nm,v,mx,unit,col,note)=>`<div class="aqBar"><span class="an">${nm}</span>
    <span class="bar"><i style="width:${clamp(v/mx*100,2,100).toFixed(0)}%;background:${col}"></i></span>
    <span class="av">${v} <span style="font-weight:500;color:var(--muted2);font-size:10px">${unit}</span></span></div>
    <div style="font-size:10px;color:var(--muted2);margin:-4px 0 6px 63px">${note}</div>`;
  return `
  <div class="card">
    <div class="detHead"><button class="bk" onclick="backToSummary()">←</button>
      <span class="dt2"><span class="dn">${r.icon} ${r.nm}</span>
        <span class="dd">${MYUNIT.nm} · 센서 ${sl.length}개 · ${onN}개 동작 중</span></span>
      <button class="tog ${onN?'on':''}" onclick="toggleSpacePower('${r.id}')"><span class="sw"></span>전원</button></div>
    <div class="cb">
      <div class="kv"><span class="k">전기사용량 <small>최근 24시간</small></span>
        <span class="v num" style="color:${eg.c}">${fx(r.kwh,2)} kWh</span></div>
      <div class="kv"><span class="k">에너지 평가</span><span class="v"><span class="pill" style="background:${eg.c}1a;color:${eg.c};border-color:${eg.c}4d">${eg.k}</span></span></div>
    </div></div>
  <div class="card">
    <div class="ch"><span class="ct"><span class="ci">🌡</span>쾌적성</span>
      <span class="pill" style="background:${cg.c}1a;color:${cg.c};border-color:${cg.c}4d">${cg.k}</span></div>
    <div class="cb"><div class="mGrid">
      <div class="mBox"><div class="ml">온도</div><div class="mv num" style="color:${cg.c}">${fx(r.temp)}<small>°C</small></div><div class="mn">적정 18~26°C</div></div>
      <div class="mBox"><div class="ml">습도</div><div class="mv num">${r.humi}<small>%</small></div><div class="mn">권장 40~60%</div></div>
    </div></div></div>
  <div class="card">
    <div class="ch"><span class="ct"><span class="ci">💨</span>종합 공기질</span>
      <span class="pill" style="background:${ag.c}1a;color:${ag.c};border-color:${ag.c}4d">${ag.k} · ${r.aqi}</span></div>
    <div class="cb">
      ${bar('PM2.5',fx(r.pm25),35,'㎍/㎥',r.pm25<=15?'#1a9c6a':r.pm25<=35?'#e08a12':'#d64545', r.pm25<=15?'정상 범위':'권장 상한 35 접근')}
      ${bar('CO₂',r.co2,1500,'ppm',r.co2<=800?'#1a9c6a':r.co2<=1000?'#e08a12':'#d64545', r.co2<=800?'정상 범위':'높음 · 환기 권장 (기준 800)')}
      ${bar('TVOC',r.tvoc,400,'ppb',r.tvoc<=200?'#1a9c6a':r.tvoc<=400?'#e08a12':'#d64545', r.tvoc<=200?'정상 범위':'기준 400ppb 접근')}
    </div></div>
  <div class="card">
    <div class="ch"><span class="ct"><span class="ci">📡</span>영역 센서</span><span class="cx">${sl.length}개</span></div>
    <div class="cb">${sl.map(d=>`
      <button class="sensorRow" onclick="selectSensor('${d.id}')">
        <span class="si">${STYPE[d.type].icon}</span>
        <span style="flex:1;min-width:0"><span class="sn">${d.nm}</span>
          <span class="st">${d.id} · ${STYPE[d.type].k}</span></span>
        <span class="sv2"><span class="pill ${d.meas.on?'ok':'mute'} dot">${d.meas.on?'ON':'OFF'}</span></span>
      </button>`).join('')}</div></div>
  <div class="card"><div class="cb" style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
    <button class="btn" onclick="goPage('material')">🪵 이 공간 자재</button>
    <button class="btn" onclick="goPage('request')">📝 민원 접수</button></div></div>`;
}

export function toggleSpacePower(rid){
  const sl=devicesOf(rid), anyOn=sl.some(d=>d.meas.on);
  sl.forEach(d=>{if(d.type!=='SEA')d.meas.on=!anyOn;});
  renderPlan();renderRight();
  toast(`${spaceOf(rid).nm} 전체 ${anyOn?'OFF':'ON'} — 환경센서는 항상 동작합니다`);
}

export function sensorPanel(){
  const rid=state.selRoom, s=devicesOf(rid).find(x=>x.id===state.selSensor);
  if(!s)return summaryPanel();
  const d=sensorReading(s.id), ty=STYPE[s.type];
  const N=state.sensorPeriod==='R'?12:state.sensorPeriod==='D'?24:state.sensorPeriod==='W'?7:30;
  const gen=(base,amp,seed)=>Array.from({length:N},(_,i)=>+(base+Math.sin(i/N*6.1+seed)*amp+(rnd(i+seed*7)-0.5)*amp*0.7).toFixed(2));
  const tS=gen(d.tempAvg,2.4,3), hS=gen(d.humiAvg,7,9), vS=gen(d.tvocAvg,38,13),
        cS=gen(d.co2Avg,120,17), pS=gen(d.pm25Avg,2.2,21);
  const per=()=>`<span class="seg mini">${['R','D','W','M'].map(x=>
    `<button class="${state.sensorPeriod===x?'on':''}" onclick="setPeriod('${x}')">${x}</button>`).join('')}</span>`;
  return `
  <div class="card">
    <div class="detHead"><button class="bk" onclick="backToSpace()">←</button>
      <span class="dt2"><span class="dn">${ty.icon} ${ty.nm}</span>
        <span class="dd">${s.id} · ${spaceOf(rid).nm} · ${s.nm}</span></span>
      <button class="tog ${s.meas.on?'on':''}" onclick="toggleSensor('${s.id}')"><span class="sw"></span>${s.meas.on?'ON':'OFF'}</button></div>
    <div class="cb">
      <div class="sec">실시간 측정값 <span class="srcb meas">계측</span></div>
      <div class="mGrid" style="grid-template-columns:1fr 1fr 1fr">
        <div class="mBox"><div class="ml">TVOC</div><div class="mv num">${fx(d.tvoc)}</div><div class="mn">ppb</div></div>
        <div class="mBox"><div class="ml">CO₂</div><div class="mv num">${fx(d.co2,2)}</div><div class="mn">ppm</div></div>
        <div class="mBox"><div class="ml">미세먼지</div><div class="mv num">${fx(d.pm25,2)}</div><div class="mn">㎍/㎥</div></div>
      </div>
      ${s.type!=='SEA'?`<div class="kv" style="margin-top:10px"><span class="k">현재 소비전력</span>
        <span class="v num">${s.meas.on?fx(s.meas.w,1):'0.0'} W</span></div>`:''}
      <div class="kv"><span class="k">설치 공간</span><span class="v" style="font-weight:600">${spaceOf(rid).nm}</span></div>
    </div></div>
  <div class="card"><div class="ch"><span class="ct"><span class="ci">${ty.icon}</span>기기 제어</span>
      <span class="cx">${ty.nm} · ${s.id}</span></div>
    <div class="cb" style="text-align:center">${deviceControl(s)}</div></div>
  <div class="card"><div class="cb">
    <div class="chartHead"><span class="cht">온습도</span>${per()}</div>
    <div class="chartVals"><div>현재 온도<b>${fx(d.temp)}°C</b></div><div>현재 습도<b>${fx(d.humi)}%</b></div>
      <div>평균 온도<b>${fx(d.tempAvg)}°C</b></div><div>평균 습도<b>${fx(d.humiAvg)}%</b></div></div>
    ${svgMulti([{v:tS,c:'#d64545'},{v:hS,c:'#0877ed'}],300,72)}</div></div>
  <div class="card"><div class="cb">
    <div class="chartHead"><span class="cht">TVOC</span>${per()}</div>
    <div class="chartVals"><div>현재값<b>${fx(d.tvoc)} ppb</b></div><div>평균값<b>${fx(d.tvocAvg)} ppb</b></div></div>
    ${svgArea(vS,300,64,'#6b57d6')}</div></div>
  <div class="card"><div class="cb">
    <div class="chartHead"><span class="cht">공기질</span>${per()}</div>
    <div class="chartVals"><div>CO₂<b>${fx(d.co2,2)} ppm</b></div><div>PM2.5<b>${fx(d.pm25,2)} ㎍/㎥</b></div></div>
    ${svgMulti([{v:cS,c:'#e08a12'},{v:pS.map(v=>v*40),c:'#0f9b9b'}],300,72)}</div></div>`;
}

export function setPeriod(p){state.sensorPeriod=p;renderRight();}

export function toggleSensor(sid){
  const s=devicesOf(state.selRoom).find(x=>x.id===sid); if(!s)return;
  s.meas.on=!s.meas.on; renderPlan(); renderRight(); toast(`${s.nm} ${s.meas.on?'ON':'OFF'}`);
}

/* ── 기기 제어 — 우측 패널 3단의 유일한 제어면 ──────────────────
   2D 평면도 아이콘 · 3D 씬 폴리곤 · 목록 행이 모두 selectRoom+selectSensor 로
   여기 도달한다. 별도 제어 모달(openDevice)은 제거했다.               */
export function deviceControl(s){
  const sid=s.id;
  if(state.devState[sid]===undefined)
    state.devState[sid]=DEV_CTRL_INIT[sid]!==undefined?DEV_CTRL_INIT[sid]:(s.meas.on?100:0);
  const pct=state.devState[sid];
  const modeOf=p=>p>=95?'완전개방':p<=5?'닫힘':p>=45&&p<=55?'분할개방':'부분개방';
  const isBlind=s.type==='SEC', isDim=s.type==='SEL', isSensor=s.type==='SEA';
  if(isSensor)return `<div class="empty" style="text-align:left">환경센서는 항상 동작하며 제어 대상이 아닙니다</div>`;
  return `
    <div class="devMode">${isBlind?modeOf(pct):isDim?'밝기':'전원 상태'}</div>
    <div class="devPct">${isBlind||isDim?pct+'%':(s.meas.on?'ON':'OFF')}</div>
    ${isBlind||isDim?`<input class="devSlider" type="range" min="0" max="100" value="${pct}" oninput="devSet('${sid}',this.value)">`:''}
    ${isBlind?`<div class="devBtns">
        <button onclick="devSet('${sid}',100)">▲ 올림</button>
        <button onclick="devStop('${sid}')">■ 정지</button>
        <button onclick="devSet('${sid}',0)">▼ 내림</button></div>`
     :`<div class="devBtns" style="grid-template-columns:1fr 1fr">
        <button onclick="devPower('${sid}',true)" style="${s.meas.on?'border-color:var(--blue);color:var(--blue);background:var(--blue-soft)':''}">ON</button>
        <button onclick="devPower('${sid}',false)" style="${!s.meas.on?'border-color:var(--danger);color:var(--danger);background:var(--danger-soft)':''}">OFF</button></div>`}
    <div class="kv" style="margin-top:14px"><span class="k">제어 방식 <small>FR-SIM-10 가드레일 적용</small></span>
      <span class="v" style="font-weight:600">수동 · 즉시</span></div>`;
}

export function devSet(sid,v){
  state.devState[sid]=+v; const s=devicesOf(state.selRoom).find(x=>x.id===sid);
  if(s)s.meas.on=+v>0;                 // 조광·개폐율은 devState 에만 보관
  renderPlan(); renderRight();
}

export function devStop(){toast('정지 — 현재 위치에서 멈춤');}

export function devPower(sid,on){
  const s=devicesOf(state.selRoom).find(x=>x.id===sid); if(!s)return;
  s.meas.on=on; state.devState[sid]=on?100:0; renderPlan(); renderRight();
}


/* ══════════ RM-01 확장 로드맵 (T3 8개 화면의 단일 진입점) ══════════
   T3 규칙에 따라 수치·단위·금액을 표시하지 않고, 구조와 항목명만 남긴다.
   카드는 열람 전용이며 상호작용이 없다.                                  */
export function pgRoadmap(){
  const phases=[...new Set(ROADMAP.map(r=>r.ph))];
  return pgHead('roadmap','현재 데모 범위 밖 화면의 단계별 확장 계획 · 구조와 항목만 표시')+`
  <div class="rmGrid">${ROADMAP.map(r=>{
    const p=PAGES[r.k];
    return `<div class="rmCard">
      <div class="rmTop"><span class="rmIcon">${p.i}</span><span class="rmPh">${r.ph}</span></div>
      <div class="rmNm">${p.nm}</div>
      <div class="rmD">${r.d}</div>
      <div class="rmFoot"><span class="rmCode">${p.c}</span><span class="rmFr">${p.fr}</span></div>
    </div>`;}).join('')}</div>
  <div class="empty" style="text-align:left;margin-top:12px;font-size:11px">
    ${phases.map(ph=>`<b>${ph}</b> ${ROADMAP.filter(r=>r.ph===ph).map(r=>PAGES[r.k].nm).join(' · ')}`).join('<br>')}
    <br><br>위 화면들은 <b>구상 단계</b>입니다. 근거 데이터가 확보되기 전이므로 수치를 표시하지 않습니다.</div>`;
}


/* ══════════ HM-09 자재·마감 (modular F-03) ══════════ */
export function pgMaterial(){
  const list=MATERIALS[state.matRoom]||[];
  return pgHead('material','공간별 마감재 · 제조사 · 시공 이력 · 성능 스펙')+SCOPE_NOTE+`
  <div class="g12">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🏠</span>공간 선택</span></div>
      <div class="cb">${SPACES.map(sp=>`<button class="sensorRow" style="${state.matRoom===sp.id?'border-color:var(--blue);background:var(--blue-soft)':''}"
        onclick="state.matRoom='${sp.id}';renderPage()">
        <span class="si">${iconOf(sp.id)}</span><span style="flex:1"><span class="sn">${sp.nm}</span>
        <span class="st">${(MATERIALS[sp.id]||[]).length}개 항목</span></span>
        <span class="sv2" style="color:var(--muted2)">›</span></button>`).join('')}</div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🪵</span>${spaceOf(state.matRoom).nm} 마감 스펙</span>
      <span class="cx">준공 2025.02 기준</span></div>
      <div class="cb">${list.map(m=>`<div class="specRow">
        <span class="sk">${m.k}</span>
        <span><span class="sv3">${m.v}</span><span class="sm2">${m.m}</span></span>
        <span class="swatch" style="background:${m.c}"></span></div>`).join('')}
        <div class="empty" style="text-align:left;margin-top:12px;font-size:11px">
          동일 자재로 보수·교체가 필요할 때 <b>제조사·모델·시공일</b>을 그대로 사용할 수 있습니다.
          리모델링 시에는 <b>배관·전선 경로</b>를 함께 확인하세요.</div>
      </div></div>
  </div>`;
}

/* ══════════ HM-10 배관·전선 (modular F-04) ══════════ */
export function pgPipe(){
  return pgHead('pipe','벽체 내부 배관·전선 경로 · 리모델링/보수 사전 확인용',
    `<div class="layerBar">${PIPES.map(p=>
      `<button class="lchip ${state.pipeOn[p.k]?'on':''}" onclick="tgPipe('${p.k}')"><i class="lcd" style="background:${p.c}"></i>${p.nm}</button>`).join('')}</div>`)
    +SCOPE_NOTE+`
  <div class="g21">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🔧</span>경로 도면</span>
      <span class="cx">세대 평면 기준 · 축척 1:100</span></div>
      <div class="cb"><div style="background:var(--panel2);border-radius:var(--r-m);padding:10px">
        <svg id="pipeSvg" class="pipeSvg" viewBox="0 0 520 430" preserveAspectRatio="xMidYMid meet"></svg></div>
        <div class="empty" style="text-align:left;margin-top:11px;font-size:10.5px">
          경로는 <b>준공 도면 기준</b>이며 실제 시공 오차가 있을 수 있습니다.
          타공·철거 전에는 반드시 관리사무소에 <b>사전 확인</b>을 요청하세요.</div>
      </div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📐</span>경로 정보</span></div>
      <div class="cb">${PIPES.map(p=>`
        <div class="kv"><span class="k"><i style="display:inline-block;width:12px;height:3px;background:${p.c};margin-right:8px;vertical-align:middle"></i>${p.nm}</span>
          <span class="v"><span class="pill ${state.pipeOn[p.k]?'info':'mute'}">${state.pipeOn[p.k]?'표시':'숨김'}</span></span></div>`).join('')}
        <div class="sec" style="margin-top:14px">주의 구간</div>
        <div class="kv"><span class="k">주방 하부 <small>급수·배수 교차</small></span><span class="v" style="color:var(--danger)">타공 금지</span></div>
        <div class="kv"><span class="k">거실 벽 중앙 <small>전기 간선</small></span><span class="v" style="color:var(--warn)">주의</span></div>
        <div class="kv"><span class="k">${spaceOf('bath').nm} 천장 <small>배수·환기 덕트</small></span><span class="v" style="color:var(--danger)">타공 금지</span></div>
      </div></div>
  </div>`;
}

export function tgPipe(k){state.pipeOn[k]=!state.pipeOn[k];renderPage();}

export function renderPipe(){
  const sv=$('pipeSvg'); if(!sv)return;
  let s=planShell();
  SPACES.forEach(sp=>{const x=plX(sp.plan.x),y=plY(sp.plan.y),w=plL(sp.plan.w),h=plL(sp.plan.h);
    s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#fff" fill-opacity=".55" stroke="#cfd8e3" stroke-width="1"/>
    <text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#96a1b0">${sp.nm}</text>`;});
  PIPES.forEach(p=>{
    s+=`<path class="pipeLine" d="${p.d}" fill="none" stroke="${p.c}" stroke-width="3.2"
      stroke-linecap="round" stroke-linejoin="round" opacity="${state.pipeOn[p.k]?0.92:0}"
      stroke-dasharray="${p.k==='elec'||p.k==='comm'?'8 5':'none'}"/>`;});
  sv.innerHTML=s;
}

/* ══════════ HM-02 실내환경 예측 (modular F-15 · FR-SIM-03) ══════════ */
export function pgEnvpred(){
  const P=ENVPRED, lbl=['현재','+1h','+2h','+3h','+4h','+5h','+6h'];
  return pgHead('envpred','현재 설정 유지 시 향후 6시간 실내 환경 변화 예측',
    `<span class="srcb pred">추정</span>`)+`
  <div class="kpiRow" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi warn"><div class="kl2">CO₂ 임계 도달 예상</div>
      <div class="kv2">${P.hitAt}</div><div class="ks">${P.hitVal} 초과 예상</div></div>
    <div class="kpi danger"><div class="kl2">거실 온도 (+6h)</div>
      <div class="kv2 num">${fx(P.temp.series[6])}<small>°C</small></div>
      <div class="ks">적정 상한 ${P.temp.limit}°C 대비 <b class="up">+${fx(P.temp.series[6]-P.temp.limit)}</b></div></div>
    <div class="kpi info"><div class="kl2">환기 시 회복</div>
      <div class="kv2 num">640<small>ppm</small></div><div class="ks">30분 환기 기준</div></div>
  </div>
  <div class="g2 mb12">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🌡</span>${P.temp.label} 예측</span>
      <span class="cx">향후 6시간</span></div>
      <div class="cb">${svgMulti([{v:P.temp.series,c:'#d64545'}],560,150,{v:P.temp.limit,c:'#1a9c6a'})}
        <div class="axl">${lbl.map(l=>`<span>${l}</span>`).join('')}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:8px">
          <i style="display:inline-block;width:10px;height:2px;background:#d64545;vertical-align:middle;margin-right:5px"></i>예측 온도
          <i style="display:inline-block;width:10px;height:2px;background:#1a9c6a;vertical-align:middle;margin:0 5px 0 12px"></i>적정 상한 ${P.temp.limit}°C</div>
      </div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">💨</span>${P.co2.label} 예측</span>
      <span class="cx">향후 6시간</span></div>
      <div class="cb">${svgMulti([{v:P.co2.series,c:'#e08a12'}],560,150,{v:P.co2.limit,c:'#d64545'})}
        <div class="axl">${lbl.map(l=>`<span>${l}</span>`).join('')}</div>
        <div class="empty" style="text-align:left;margin-top:11px;border-color:#f5dcae;background:var(--warn-soft);color:#8a5a00">
          <b>예측 경보</b> · 현재 상태 유지 시 ${P.hitAt} CO₂가 ${P.hitVal}을 초과할 것으로 예측됩니다. 환기를 권장합니다.</div>
      </div></div>
  </div>
  <div class="card"><div class="ch"><span class="ct"><span class="ci">🔮</span>환경 리스크</span><span class="cx">FR-SIM-03</span></div>
    <div class="cb"><div class="g3">${RISKS.map(k=>`
      <div style="border:1px solid var(--line);border-radius:var(--r-m);padding:12px 13px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-size:13px;font-weight:800">${k.nm}</span>
          <span class="pill" style="background:${k.c}1a;color:${k.c};border-color:${k.c}4d">${k.grade}</span></div>
        <div style="display:flex;align-items:center;gap:9px;margin:9px 0">
          <span class="bar" style="flex:1"><i style="width:${k.score}%;background:${k.c}"></i></span>
          <span class="num" style="font-size:14px;font-weight:800;color:${k.c}">${k.score}</span></div>
        <div style="font-size:11px;color:var(--muted);line-height:1.6">${k.sp} · ${k.why}</div>
        <div style="font-size:11px;margin-top:7px;padding:8px 10px;background:var(--blue-soft);border-radius:var(--r-s);border:1px solid var(--blue-line)">
          <b style="color:var(--blue)">권고</b> ${k.rec}</div></div>`).join('')}</div>
      <div style="font-size:10.5px;color:var(--muted2);margin-top:12px;line-height:1.6">${P.note}</div>
    </div></div>`;
}

/* ══════════ HM-03 이웃 세대 비교 (modular F-10 · FR-ENG-02) ══════════ */
export function pgNeighbor(){
  const N=NEIGHBOR;
  return pgHead('neighbor',`동일 평형 ${N.unitType} ${N.n}세대 평균과 비교한 우리 세대 효율`,
    `<span class="srcb calc">산출</span>`)+`
  <div class="g21">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">👥</span>항목별 비교</span>
      <span class="cx">최근 30일 · 동일 평형 평균 대비</span></div>
      <div class="cb" style="padding-top:24px">${N.items.map(it=>{
        const mx=Math.max(it.me,it.avg)*1.35;
        const good=it.lower?it.me<=it.avg:it.me>=it.avg;
        const dp=((it.me-it.avg)/it.avg*100);
        return `<div class="cmpRow"><span class="cn3">${it.nm}</span>
          <span class="cmpBar">
            <i class="me" style="width:${(it.me/mx*100).toFixed(0)}%;background:${good?'#1a9c6a':'#d64545'}"></i>
            <i class="avg" style="left:${(it.avg/mx*100).toFixed(0)}%"></i>
            <i class="avgL" style="left:${(it.avg/mx*100).toFixed(0)}%">평균 ${fx(it.avg)}</i></span>
          <span class="cv2" style="color:${good?'var(--ok)':'var(--danger)'}">${fx(it.me)} ${it.unit}
            <div style="font-size:10px;font-weight:600">${dp>0?'+':''}${fx(dp)}%</div></span></div>`;}).join('')}
      </div></div>
    <div>
      <div class="card mb12"><div class="ch"><span class="ct"><span class="ci">🏅</span>에너지 효율 등급</span></div>
        <div class="cb"><div class="gradeBig">
          <div class="gv" style="color:var(--ok)">${N.grade}</div>
          <div class="gs">상위 <b>${N.pct}%</b> 효율</div>
          <div class="gt">${N.unitType} ${N.n}세대 기준</div></div>
          <div class="bar" style="height:8px"><i style="width:${100-N.pct}%;background:linear-gradient(90deg,#1a9c6a,#0877ed)"></i></div>
          <div class="axl"><span>상위</span><span>하위</span></div>
        </div></div>
      <div class="card"><div class="ch"><span class="ct"><span class="ci">💡</span>절감 팁</span></div>
        <div class="cb"><div style="font-size:11.5px;line-height:1.7;color:var(--ink2)">${N.tip}</div>
          <button class="btn blue" style="width:100%;margin-top:11px" onclick="goPage('scenario')">절감 시나리오 보기 ›</button>
          <div style="font-size:10px;color:var(--muted2);margin-top:10px;line-height:1.6">
            비교는 <b>동일 평형·유사 향</b> 세대만 대상으로 하며, 공실 세대는 제외됩니다.
            개별 세대 정보는 노출되지 않고 <b>집계값</b>만 사용합니다.</div>
        </div></div>
    </div>
  </div>`;
}

/* ══════════ HM-06 에너지 사용 분석 ══════════ */
export function pgEnergyRes(){
  const E=ENERGY, usedDays=E.daily.filter(v=>v>0).length;
  const byRoom=SPACES.map(sp=>({nm:sp.nm,v:sp.kwh,c:gradeOf(GRADE_E,sp.kwh).c})).sort((a,b)=>b.v-a.v);
  return pgHead('energy','세대 전력 사용 상세 · 시간대 · 일별 · 공간별 · 기기별')+`
  <div class="kpiRow" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi info"><div class="kl2">오늘 <span class="srcb meas">계측</span></div>
      <div class="kv2 num">${fx(E.todayKwh)}<small>kWh</small></div><div class="ks">어제 대비 −4.2%</div></div>
    <div class="kpi"><div class="kl2">이달 누적</div><div class="kv2 num">${fx(E.monthKwh)}<small>kWh</small></div>
      <div class="ks">지난달 동기간과 동일</div></div>
    <div class="kpi ok"><div class="kl2">예상 사용량</div><div class="kv2 num">${fx(E.forecastKwh)}<small>kWh</small></div>
      <div class="ks">누진 ${E.tier}단계 이내</div></div>
    <div class="kpi ok"><div class="kl2">예상 전기료</div><div class="kv2 num">${won(E.forecastWon)}<small>원</small></div>
      <div class="ks">1단계 120.0원/kWh</div></div>
  </div>
  <div class="g2 mb12">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">⏱</span>시간대별 사용</span><span class="cx">오늘 00~23시</span></div>
      <div class="cb">${svgBars(E.hourly,560,120,(v,i)=>v>0.16?'#e08a12':'#38a3f5')}
        <div class="axl"><span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span></div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:9px">저녁 <b>18~22시</b>에 사용이 집중됩니다 (전체의 42%).</div>
      </div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📅</span>일별 사용</span><span class="cx">8월 1일 ~ 31일</span></div>
      <div class="cb">${svgBars(E.daily,560,120,(v,i)=>v===0?'#e8edf3':(i===usedDays-1?'#062b5c':'#38a3f5'))}
        <div class="axl"><span>1</span><span>8</span><span>15</span><span>22</span><span>31</span></div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:9px">일평균 <b>${fx(E.monthKwh/usedDays,2)} kWh</b> · 남은 기간 동일 추세 가정</div>
      </div></div>
  </div>
  <div class="g2">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🏠</span>공간별 사용</span><span class="cx">최근 24시간</span></div>
      <div class="cb">${byRoom.map(r=>`<div class="cmpRow" style="grid-template-columns:76px 1fr 76px">
        <span class="cn3">${r.nm}</span>
        <span class="bar" style="height:9px"><i style="width:${(r.v/byRoom[0].v*100).toFixed(0)}%;background:${r.c}"></i></span>
        <span class="cv2">${fx(r.v,2)} kWh</span></div>`).join('')}</div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🔌</span>기기별 사용</span>
      <span class="seg mini">${['일간','주간','월간'].map(t=>
        `<button class="${state.outletTab===t?'on':''}" onclick="state.outletTab='${t}';renderPage()">${t}</button>`).join('')}</span></div>
      <div class="cb">${ENERGY.outlets[state.outletTab].map((o,i)=>{
        const mx=ENERGY.outlets[state.outletTab][0].kwh;
        return `<div class="rankRow ${i===0?'top':''}"><span class="rk">${i+1}</span>
          <span class="rn3"><span class="rt">${o.nm}<span>${o.rm}</span></span>
            <span class="rb bar"><i style="width:${(o.kwh/mx*100).toFixed(0)}%;background:${i===0?'#062b5c':'#38a3f5'}"></i></span></span>
          <span class="rv2 num">${fx(o.kwh,o.kwh<10?2:1)} kWh</span></div>`;}).join('')}
        <button class="btn" style="width:100%;margin-top:11px" onclick="goPage('neighbor')">이웃 세대와 비교하기 ›</button>
      </div></div>
  </div>`;
}

/* ══════════ HM-07 절감 시나리오 (modular F-14 · FR-SIM-06) ══════════ */
export function pgScenario(){
  const sel=SCENARIOS.find(s=>s.id===state.scnSel);
  const mx=Math.max(...SCENARIOS.map(s=>s.save));
  return pgHead('scenario','개선 시나리오별 예상 절감량 · 비용 · 투자 회수 기간',
    `<span class="srcb pred">추정</span>`)+`
  <div class="g21 mb12">
    <div><div class="g2" style="gap:11px">${SCENARIOS.map(s=>`
      <button class="scnCard ${state.scnSel===s.id?'on':''}" onclick="state.scnSel='${s.id}';renderPage()">
        <span class="sn4">${s.nm}<span class="pill ${s.cost===0?'ok':'warn'}">${s.cost===0?'비용 없음':won(s.cost/10000)+'만원'}</span></span>
        <span class="sd2">${s.d}</span>
        <span class="sg3">
          <div>월 절감<b>${fx(s.save)} kWh</b></div>
          <div>월 절약<b>${won(s.won)}원</b></div>
          <div>회수 기간<b>${s.pay?s.pay+'개월':'즉시'}</b></div>
        </span></button>`).join('')}</div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📊</span>시나리오 비교</span></div>
      <div class="cb">
        ${SCENARIOS.map(s=>`<div class="cmpRow" style="grid-template-columns:1fr 1fr 62px;padding:7px 0">
          <span class="cn3" style="font-size:11px">${s.nm}</span>
          <span class="bar" style="height:9px"><i style="width:${(s.save/mx*100).toFixed(0)}%;background:${state.scnSel===s.id?'#062b5c':'#38a3f5'}"></i></span>
          <span class="cv2" style="font-size:11px">${fx(s.save)}</span></div>`).join('')}
        <div class="sec" style="margin-top:16px">선택 시나리오</div>
        <div class="mBox"><div class="ml">${sel.nm}</div>
          <div class="mv num" style="color:var(--ok)">−${fx(sel.save)}<small>kWh/월</small></div>
          <div class="mn">연간 ${fx(sel.save*12)} kWh · ${won(sel.won*12)}원</div></div>
        <div class="kv" style="margin-top:10px"><span class="k">난이도</span><span class="v">${sel.diff}</span></div>
        <div class="kv"><span class="k">효과 발생</span><span class="v">${sel.eff}</span></div>
        <div class="kv"><span class="k">투자 비용</span><span class="v num">${sel.cost?won(sel.cost)+'원':'없음'}</span></div>
        <div class="kv"><span class="k">회수 기간</span><span class="v">${sel.pay?sel.pay+'개월':'즉시'}</span></div>
        <button class="btn blue" style="width:100%;margin-top:12px" onclick="applyScenario('${sel.id}')">이 시나리오 적용 요청</button>
        <div style="font-size:10px;color:var(--muted2);margin-top:9px;line-height:1.6">
          절감량은 최근 12개월 사용 패턴 기반 <b>추정치</b>입니다. 실제 효과는 생활 패턴·외기 조건에 따라 달라집니다.</div>
      </div></div>
  </div>`;
}

export function applyScenario(id){
  const s=SCENARIOS.find(x=>x.id===id);
  toast(`「${s.nm}」 적용을 요청했습니다 — 관리자 검토 후 회신됩니다`);
}

/* ══════════ HM-08 설비 수명 예측 (modular F-16 · FR-SIM-04) ══════════ */
export function pgLifespan(){
  const risk={'경고':'#d64545','주의':'#e08a12','낮음':'#1a9c6a'};
  const soon=LIFESPAN.filter(l=>l.risk!=='낮음');
  return pgHead('lifespan','가동 이력 기반 세대 설비 잔여 수명 및 교체 시점 예측',
    `<span class="srcb pred">추정</span>`)+`
  <div class="kpiRow" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi info"><div class="kl2">관리 대상 설비</div><div class="kv2 num">${LIFESPAN.length}<small>대</small></div></div>
    <div class="kpi warn"><div class="kl2">교체 검토 필요</div><div class="kv2 num">${soon.length}<small>대</small></div>
      <div class="ks">2년 이내 교체 예상</div></div>
    <div class="kpi ok"><div class="kl2">평균 사용률</div>
      <div class="kv2 num">${fx(LIFESPAN.reduce((a,l)=>a+l.run/l.std,0)/LIFESPAN.length*100)}<small>%</small></div>
      <div class="ks">표준 수명 대비</div></div>
  </div>
  <div class="card"><div class="ch"><span class="ct"><span class="ci">📅</span>설비별 잔여 수명</span>
    <span class="cx">누적 가동시간 ÷ 표준 수명</span></div>
    <div class="cb">${LIFESPAN.map(l=>{
      const p=clamp(l.run/l.std*100,0,100), c=risk[l.risk];
      return `<div class="lifeRow">
        <span><span class="ln3">${l.nm} <span style="font-weight:500;color:var(--muted);font-size:11px">· ${l.loc}</span></span>
          <span class="lm2">${l.code} · ${l.inst} 설치 · 누적 ${won(l.run)}h / ${won(l.std)}h</span></span>
        <span class="lb2"><i style="width:${p.toFixed(0)}%;background:${c}"></i></span>
        <span class="lv3" style="color:${c}">${fx(p,0)}%<div style="font-size:10px;font-weight:600;color:var(--muted)">${l.rep}</div></span>
      </div>`;}).join('')}
      <div class="empty" style="text-align:left;margin-top:12px;font-size:11px">
        <b>교체 예상 시점</b>은 현재 가동 패턴이 유지된다고 가정한 값입니다.
        <b>${soon.map(s=>s.nm).join(' · ')}</b>은(는) 2년 이내 교체가 예상되므로 관리사무소와 미리 협의하시기 바랍니다.</div>
    </div></div>`;
}

/* ══════════ HM-11 우리 집 이력서 (modular F-18) ══════════ */
export function pgHistory(){
  const byK={};HOMEHIST.forEach(h=>byK[h.t]=(byK[h.t]||0)+1);
  return pgHead('history','제작 · 시공 · 검사 · 수리 · 교체 전체 이력 타임라인')+SCOPE_NOTE+`
  <div class="g21">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📋</span>이력 타임라인</span>
      <span class="cx">${HOMEHIST.length}건 · 2024.10 ~ 현재</span></div>
      <div class="cb"><div class="tl">${HOMEHIST.map(h=>`
        <div class="tlItem ${h.k}"><div class="tt">${h.d} · ${h.t}</div><div class="tm">${h.m}</div></div>`).join('')}</div></div></div>
    <div>
      <div class="card mb12"><div class="ch"><span class="ct"><span class="ci">📊</span>이력 요약</span></div>
        <div class="cb">${Object.entries(byK).map(([k,v])=>
          `<div class="kv"><span class="k">${k}</span><span class="v num">${v}건</span></div>`).join('')}
          <div class="kv" style="border-top:2px solid var(--line);margin-top:6px;padding-top:9px">
            <span class="k">미해결 하자</span><span class="v" style="color:var(--ok)">0건</span></div>
        </div></div>
      <div class="card"><div class="ch"><span class="ct"><span class="ci">🏭</span>제작 정보</span></div>
        <div class="cb">
          <div class="kv"><span class="k">모듈 제작</span><span class="v">2024.10.12</span></div>
          <div class="kv"><span class="k">공장 검사번호</span><span class="v" style="font-family:monospace;font-size:11px">MQ-2410-0338</span></div>
          <div class="kv"><span class="k">현장 설치</span><span class="v">2024.11.05</span></div>
          <div class="kv"><span class="k">준공 검사</span><span class="v" style="color:var(--ok)">합격</span></div>
          <div class="kv"><span class="k">입주</span><span class="v">2025.03.18</span></div>
          <button class="btn" style="width:100%;margin-top:11px" onclick="goPage('transfer')">이력 요약본 만들기 ›</button>
        </div></div>
    </div>
  </div>`;
}

/* ══════════ HM-12 리모델링 영향 (modular F-17) ══════════ */
export function pgRemodel(){
  const sel=REMODEL.find(r=>r.id===state.remodelSel);
  return pgHead('remodel','리모델링이 구조 · 설비 · 에너지에 미치는 영향 사전 확인')+SCOPE_NOTE+`
  <div class="g2">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🏗</span>옵션 선택</span></div>
      <div class="cb">${REMODEL.map(r=>`
        <button class="scnCard ${state.remodelSel===r.id?'on':''}" style="margin-bottom:9px" onclick="state.remodelSel='${r.id}';state.remodelRun=false;renderPage()">
          <span class="sn4">${r.nm}</span><span class="sd2">${r.d}</span>
          <span class="sg3" style="grid-template-columns:1fr 1fr">
            <div>예상 비용<b>${r.cost}만원</b></div><div>예상 공기<b>${r.days}일</b></div></span>
        </button>`).join('')}
        <button class="btn blue" style="width:100%" onclick="state.remodelRun=true;renderPage()">🔬 영향 시뮬레이션 실행</button>
      </div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📐</span>시뮬레이션 결과</span>
      ${state.remodelRun?'<span class="srcb pred">추정</span>':''}</div>
      <div class="cb">${!state.remodelRun
        ? `<div class="empty" style="padding:44px 14px">← 옵션을 선택하고 시뮬레이션을 실행하세요</div>`
        : `<div style="font-size:14px;font-weight:800;letter-spacing:-.02em;margin-bottom:11px">${sel.nm}</div>
           ${[['구조 영향','struct','🏛'],['전기 영향','elec','⚡'],['냉난방·환기 영향','hvac','🌬'],['에너지 변화','energy','📊']].map(([l,k,i])=>`
             <div class="kv"><span class="k">${i} ${l}</span>
               <span class="v" style="font-weight:600;font-size:11.5px;text-align:right;max-width:62%;
                 color:${k==='energy'?(sel.eff[k].startsWith('−')?'var(--ok)':'var(--danger)'):'var(--ink)'}">${sel.eff[k]}</span></div>`).join('')}
           <div class="mGrid" style="margin-top:12px">
             <div class="mBox"><div class="ml">예상 비용</div><div class="mv num">${sel.cost}<small>만원</small></div></div>
             <div class="mBox"><div class="ml">예상 공기</div><div class="mv num">${sel.days}<small>일</small></div></div>
           </div>
           <div class="empty" style="text-align:left;margin-top:12px;font-size:10.5px">
             구조 영향 판정은 <b>준공 도면 기준</b>이며, 실제 착공 전 <b>구조 기술사 검토</b>와 관리사무소 승인이 필요합니다.
             배관·전선 간섭은 <b>배관·전선 경로</b> 화면에서 함께 확인하세요.</div>
           <button class="btn" style="width:100%;margin-top:10px" onclick="goPage('pipe')">배관·전선 경로 확인 ›</button>`}
      </div></div>
  </div>`;
}

/* ══════════ HM-13 이사·양도 패키지 (modular F-19) ══════════ */
export function pgTransfer(){
  const n=Object.values(state.transferSel).filter(Boolean).length;
  return pgHead('transfer','이사 · 매매 시 전달할 세대 이력 요약본 생성')+SCOPE_NOTE+`
  <div class="g2">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📦</span>포함 항목</span>
      <span class="cx">${n} / ${TRANSFER_ITEMS.length} 선택</span></div>
      <div class="cb">${TRANSFER_ITEMS.map((t,i)=>`
        <button class="chk ${state.transferSel[i]?'ok':''}" style="width:100%;text-align:left" onclick="state.transferSel[${i}]=!state.transferSel[${i}];renderPage()">
          <span class="cbx">${state.transferSel[i]?'✓':''}</span>
          <span class="cn2"><b style="font-size:12px">${t.nm}</b>
            <div style="font-size:10.5px;color:var(--muted);font-weight:400;margin-top:2px">${t.d}</div></span>
        </button>`).join('')}
        <div class="empty" style="text-align:left;margin-top:10px;font-size:10.5px">
          <b>개인 생활 패턴 데이터</b>는 기본 제외됩니다. 포함 시 재실 시간대 등 민감 정보가 전달되므로 신중히 선택하세요 (PRD NF-011).</div>
      </div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📄</span>요약본 생성</span></div>
      <div class="cb" style="text-align:center;padding:26px 14px">
        <div style="font-size:44px;margin-bottom:12px">📋</div>
        <div style="font-size:15px;font-weight:800;letter-spacing:-.02em">${MYUNIT.nm} 이력 요약서</div>
        <div style="font-size:11.5px;color:var(--muted);margin:5px 0 20px">입주 ${MYUNIT.movedIn} ~ 현재 · 전용 ${MYUNIT.area}㎡ · ${n}개 항목</div>
        <button class="btn blue" style="padding:11px 26px" onclick="genTransfer()">📦 요약본 생성하기</button>
        <div id="transferOut" style="margin-top:16px"></div>
      </div></div>
  </div>`;
}

export function genTransfer(){
  const n=Object.values(state.transferSel).filter(Boolean).length;
  $('transferOut').innerHTML=`
    <div class="empty" style="text-align:left;border-color:#b7e6d0;background:var(--ok-soft)">
      <b style="color:var(--ok)">생성 완료</b> · BEES_HOME_${MODULE.id}_이력요약서.pdf<br>
      <span style="font-size:10.5px;color:var(--muted)">${n}개 항목 · 14페이지 · 개인정보 비식별화 적용</span></div>
    <div style="display:flex;gap:7px;margin-top:9px">
      <button class="btn" style="flex:1" onclick="toast('공유 링크가 복사되었습니다 · 유효기간 7일')">🔗 링크 공유</button>
      <button class="btn" style="flex:1" onclick="toast('다운로드는 데모 범위 밖입니다')">⬇ 다운로드</button></div>`;
  toast('이력 요약서를 생성했습니다');
}

/* ══════════ HM-04 / HM-05 민원 ══════════ */
export function pgRequest(){
  return pgHead('request','세대 위치 자동 입력 · 2단계 유형 분류 · 사진 첨부 · 1분 이내 완료 흐름')+`
  <div class="g2">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📝</span>접수</span><span class="cx">FR-CSM-01</span></div>
      <div class="cb" id="reqForm"></div></div>
    <div>
      <div class="card mb12"><div class="ch"><span class="ct"><span class="ci">📍</span>위치 선택</span>
        <span class="cx">공간을 클릭하면 위치가 지정됩니다</span></div>
        <div class="cb"><svg id="reqPlan" viewBox="0 0 520 430" preserveAspectRatio="xMidYMid meet" style="width:100%;display:block"></svg></div></div>
      <div class="card"><div class="ch"><span class="ct"><span class="ci">🕐</span>SLA 안내</span></div>
        <div class="cb">
          <div class="kv"><span class="k">급수·배수 <small>긴급</small></span><span class="v">1차 30분 · 처리 4시간</span></div>
          <div class="kv"><span class="k">냉난방 불량</span><span class="v">1차 2시간 · 처리 48시간</span></div>
          <div class="kv"><span class="k">전기·조명</span><span class="v">1차 2시간 · 처리 72시간</span></div>
          <div class="kv"><span class="k">소음 · 환경</span><span class="v">1차 4시간 · 처리 48시간</span></div>
        </div></div>
    </div>
  </div>`;
}

export function pgReqstat(){
  const mine=REQUESTS.filter(r=>r.mine);
  return pgHead('reqstat','접수한 민원의 처리 단계 · 방문 일정 · 만족도 평가',
    `<button class="btn pri sm" onclick="goPage('request')">＋ 새 민원 접수</button>`)+`
  <div class="kpiRow" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi info"><div class="kl2">전체 접수</div><div class="kv2 num">${mine.length}<small>건</small></div></div>
    <div class="kpi warn"><div class="kl2">처리 중</div><div class="kv2 num">${mine.filter(r=>r.st!=='done').length}<small>건</small></div></div>
    <div class="kpi ok"><div class="kl2">완료</div><div class="kv2 num">${mine.filter(r=>r.st==='done').length}<small>건</small></div>
      <div class="ks">평균 처리 1.4일</div></div>
  </div>
  <div class="card"><div class="ch"><span class="ct"><span class="ci">🔍</span>내 민원</span><span class="cx">FR-CSM-04 · FR-CSM-05</span></div>
    <div class="cb">${mine.length===0?'<div class="empty">접수한 민원이 없습니다</div>':mine.map(r=>{
      const si=RSTEPS.indexOf(r.st), done=r.st==='done';
      return `<div style="border:1px solid var(--line);border-radius:var(--r-m);padding:13px 14px;margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div><div style="font-size:13.5px;font-weight:800">${r.sub}</div>
            <div style="font-size:10.5px;color:var(--muted);margin-top:2px">${r.id} · ${r.at} · ${r.cat}</div></div>
          <span class="pill ${done?'ok':'info'}">${RSTATUS[r.st]}</span></div>
        <div style="font-size:11.5px;color:var(--muted);margin:9px 0;line-height:1.6">${r.desc}</div>
        <div class="stepFlow">${RSTEPS.map((s,i)=>
          `<span class="sf ${i<si?'done':i===si?'cur':''}">${RSTATUS[s]}</span>`).join('<span class="sa">›</span>')}</div>
        <div style="display:flex;gap:14px;margin-top:10px;font-size:11px;color:var(--muted);flex-wrap:wrap">
          <span>담당 <b style="color:var(--ink2)">${r.assignee?'시설관리팀':'배정 중'}</b></span>
          <span>처리 목표 <b style="color:var(--ink2)">${r.slaDue}</b></span>
          ${r.visit?`<span>방문 예정 <b style="color:var(--blue)">${r.visit}</b></span>`:''}</div>
        <div style="display:flex;gap:6px;margin-top:11px">
          <button class="btn sm" onclick="openMyReq('${r.id}')">상세 보기</button>
          ${done&&r.sat===null?`<button class="btn blue sm" onclick="openMyReq('${r.id}')">만족도 평가</button>`:''}
          ${done&&r.sat?`<span class="pill ok" style="align-self:center">평가 ${r.sat}점 완료</span>`:''}
        </div></div>`;}).join('')}</div></div>`;
}


export function renderReqForm(err){
  const el=$('reqForm'); if(!el)return;
  el.innerHTML=`
    <div class="fld"><label>위치</label>
      <input value="${MYUNIT.nm} · ${state.reqDraft.loc}" readonly style="background:var(--blue-soft);border-color:var(--blue-line);font-weight:700">
      <div class="hint">로그인 세대가 자동 입력됩니다 · 우측 평면도에서 공간을 선택하세요</div></div>
    <div class="fld"><label>유형 <span class="req">*</span></label>
      <div class="chipSel" style="margin-bottom:7px">${Object.keys(RCAT).map(c=>
        `<button class="${state.reqDraft.cat===c?'on':''}" onclick="state.reqDraft.cat='${c}';state.reqDraft.sub=null;renderReqForm()">${c}</button>`).join('')}</div>
      <div class="chipSel">${RCAT[state.reqDraft.cat].map(s=>
        `<button class="${state.reqDraft.sub===s?'on':''}" onclick="state.reqDraft.sub='${s}';renderReqForm()">${s}</button>`).join('')}</div>
      ${err==='sub'?'<div class="emsg">상세 유형을 선택해 주세요 (E-INPUT-001)</div>':''}
      <div class="hint">2단계 분류 · 접수 후 AI가 자동 분류를 보정합니다</div></div>
    <div class="fld"><label>긴급도</label>
      <div class="chipSel">${['낮음','보통','긴급'].map(u=>
        `<button class="${state.reqDraft.urg===u?'on':''}" onclick="state.reqDraft.urg='${u}';renderReqForm()">${u}</button>`).join('')}</div></div>
    <div class="fld ${err==='desc'?'err':''}"><label>내용 <span class="req">*</span></label>
      <textarea placeholder="어떤 불편이 있으신가요? 발생 시점과 증상을 함께 적어주시면 빠르게 확인할 수 있습니다."
        oninput="state.reqDraft.desc=this.value">${state.reqDraft.desc}</textarea>
      ${err==='desc'?'<div class="emsg">내용을 입력해 주세요 (E-INPUT-001)</div>':''}</div>
    <div class="fld"><label>사진 <span style="font-weight:500;color:var(--muted2)">최대 5장</span></label>
      <div class="photoDrop" onclick="state.reqDraft.photos=Math.min(5,state.reqDraft.photos+1);renderReqForm()">
        ${state.reqDraft.photos?`📷 ${state.reqDraft.photos}장 첨부됨 · 클릭하면 추가`:'📷 클릭하여 사진 첨부'}</div>
      <div class="hint">업로드 시 자동 압축됩니다. 개인정보가 포함되지 않도록 주의해 주세요.</div></div>
    <div class="empty" style="text-align:left;font-size:11px;margin-bottom:12px">
      접수 시 <b>세대 위치 · 관련 센서 데이터 · 과거 민원 이력</b>이 자동 연결되어 담당자에게 전달됩니다.</div>
    <button class="btn pri" style="width:100%" onclick="submitReq()">접수하기</button>`;
}

export function renderReqPlan(){
  const sv=$('reqPlan'); if(!sv)return;
  let s=planShell();
  SPACES.forEach(sp=>{const on=state.reqDraft.loc===sp.nm;
    const x=plX(sp.plan.x),y=plY(sp.plan.y),w=plL(sp.plan.w),h=plL(sp.plan.h);
    s+=`<g class="roomG" onclick="state.reqDraft.loc='${sp.nm}';renderReqForm();renderReqPlan()">
      <rect class="rf" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"
        fill="${on?'#0877ed':'#c9d4e0'}" fill-opacity="${on?0.34:0.22}" stroke="${on?'#0877ed':'#aab6c6'}" stroke-width="${on?2.4:1.3}"/>
      <text class="rn2" x="${x+w/2}" y="${y+h/2+4}">${sp.nm}</text></g>`;});
  sv.innerHTML=s;
}

export function submitReq(){
  if(!state.reqDraft.sub)return renderReqForm('sub');
  if(!state.reqDraft.desc.trim())return renderReqForm('desc');
  const id='REQ-2608'+String(80+REQUESTS.length).slice(-2)+String(Math.floor(rnd(REQUESTS.length)*90+10));
  const sla={'긴급':'08-08 21:45','보통':'08-10 17:45','낮음':'08-11 17:45'}[state.reqDraft.urg];
  REQUESTS.unshift({id,sp:MODULE.id,mine:true,cat:state.reqDraft.cat,sub:state.reqDraft.sub,
    urg:state.reqDraft.urg,at:'08-08 17:45',desc:`[${state.reqDraft.loc}] `+state.reqDraft.desc,st:'received',assignee:null,
    slaDue:sla,slaPct:2,visit:null,auto:{cat:`${state.reqDraft.cat} > ${state.reqDraft.sub}`,conf:0.86},rep:1,sat:null,photos:state.reqDraft.photos,
    log:[{t:'08-08 17:45',m:'입주민 접수 · 접수번호 발급'},
         {t:'08-08 17:45',m:`자동 분류 「${state.reqDraft.cat} > ${state.reqDraft.sub}」 (신뢰도 86%)`},
         {t:'08-08 17:45',m:'세대 센서 데이터 · 과거 이력 연결 완료'}]});
  const d={...state.reqDraft};
  state.reqDraft={cat:'설비',sub:null,urg:'보통',desc:'',photos:0,loc:SPACES[0].nm};
  renderSideNav();
  dlgOpen('접수 완료','접수 확인 알림이 발송되었습니다',`
    <div style="text-align:center;padding:14px 0 18px">
      <div style="font-size:42px;margin-bottom:10px">✅</div>
      <div style="font-size:15px;font-weight:800;letter-spacing:-.02em">민원이 접수되었습니다</div>
      <div style="font-size:12px;color:var(--muted);margin-top:5px">담당자 배정 후 방문 일정을 안내드립니다</div></div>
    <div class="kv"><span class="k">접수 번호</span><span class="v" style="font-family:monospace">${id}</span></div>
    <div class="kv"><span class="k">위치</span><span class="v">${MYUNIT.nm} · ${d.loc}</span></div>
    <div class="kv"><span class="k">유형</span><span class="v">${d.cat} › ${d.sub}</span></div>
    <div class="kv"><span class="k">1차 확인 예정</span><span class="v num">${d.urg==='긴급'?'30분 이내':'2시간 이내'}</span></div>
    <div class="kv"><span class="k">처리 목표(SLA)</span><span class="v num">${sla}</span></div>`,
    `<button class="btn pri" onclick="closeAll();goPage('reqstat')">처리 현황 보기</button>`,460);
}

export function openMyReq(id){
  const r=REQUESTS.find(x=>x.id===id); if(!r)return;
  const si=RSTEPS.indexOf(r.st), done=r.st==='done';
  openDetail({
    title:r.sub, subtitle:`${r.id} · ${r.at}`,
    sections:[
      {label:'진행 상황', body:`
        <div class="stepFlow" style="margin-bottom:16px">${RSTEPS.map((s,i)=>
          `<span class="sf ${i<si?'done':i===si?'cur':''}">${RSTATUS[s]}</span>`).join('<span class="sa">›</span>')}</div>
        <div class="sec">접수 내용</div>
        <div style="background:var(--panel2);border:1px solid var(--line);border-radius:var(--r-m);padding:11px 12px;
          font-size:12px;line-height:1.7;margin-bottom:14px">${r.desc}</div>
        <div class="kv"><span class="k">담당 조직</span><span class="v">${r.assignee?'시설관리팀':'배정 중'}</span></div>
        <div class="kv"><span class="k">처리 목표</span><span class="v num">${r.slaDue}</span></div>
        ${r.visit?`<div class="kv"><span class="k">방문 예정</span><span class="v num" style="color:var(--blue)">${r.visit}</span></div>`:''}
        <div class="kv"><span class="k">문의</span><span class="v">관리사무소 1600-0000</span></div>
        ${done?(r.sat===null?`
          <div class="sec" style="margin-top:16px">만족도 평가 <span class="srcb calc">FR-CSM-05</span></div>
          <div style="display:flex;gap:6px;justify-content:center;margin:10px 0">
            ${[1,2,3,4,5].map(n=>`<button class="btn" style="width:46px;height:46px;font-size:19px;padding:0"
              onclick="rateReq('${r.id}',${n})">★</button>`).join('')}</div>
          <div style="text-align:center;font-size:11px;color:var(--muted2)">평가 기간 7일 · 미응답 시 미평가로 확정됩니다</div>
          <button class="btn dz" style="width:100%;margin-top:10px" onclick="reopenReq('${r.id}')">해결되지 않았습니다 · 재접수</button>`
          :`<div class="kv" style="margin-top:14px"><span class="k">만족도 평가</span>
            <span class="v" style="color:var(--warn)">${'★'.repeat(r.sat)}${'☆'.repeat(5-r.sat)} ${r.sat}점</span></div>`):''}`},
      r.log.length&&{label:`처리 진행 ${r.log.length}`, body:
        `<div class="tl">${r.log.map(l=>`<div class="tlItem i"><div class="tt">${l.t}</div><div class="tm">${l.m}</div></div>`).join('')}</div>`},
    ],
  });
}

export function rateReq(id,n){
  const r=REQUESTS.find(x=>x.id===id); if(!r)return;
  r.sat=n; r.log.push({t:'08-08 17:46',m:`만족도 ${n}점 등록`});
  clearDetail(); renderPage(); toast(`만족도 ${n}점이 등록되었습니다. 의견 감사합니다`);
}

export function reopenReq(id){
  const o=REQUESTS.find(x=>x.id===id); if(!o)return;
  const nid=id.replace('REQ-','REQ-R');
  REQUESTS.unshift({...o,id:nid,st:'received',assignee:null,slaPct:2,sat:null,visit:null,rep:o.rep+1,
    at:'08-08 17:46',log:[{t:'08-08 17:46',m:`재접수 · 원 민원 ${id} 연결`},
      {t:'08-08 17:46',m:'「재접수」 태그 부여 · 반복 민원 지표에 가중 반영'}]});
  clearDetail(); renderSideNav(); renderPage();
  toast(`재접수 완료 (${nid}) — 원 민원과 연결되었습니다`);
}

/* 월간 리포트 (FR-RPT-01) */
export function openReport(){
  const isRes=state.role==='resident';
  openDetail({
    title:'2026년 7월 운영 리포트', subtitle:isRes?'우리 세대 요약':'단지 전체 · 확정본 v1.2',
    sections:[{label:'요약', body:`
    <div class="kpiRow" style="grid-template-columns:repeat(2,1fr);margin-bottom:16px">
      ${(isRes?[['전기 사용','96.4','kWh','전월 −4.2%','ok'],['평균 실내온도','26.8','°C','쾌적 82%','info'],
                ['민원 접수','2','건','평균 처리 1.4일','info'],['절감 실적','12,400','원','동일 평형 대비','ok']]
              :[['민원 접수','32','건','전월 −5건','ok'],['알람 발생','118','건','전월 +12건','warn'],
                ['정비 작업','27','건','예방 61%','info'],['운영 비용','3,816','만원','전월 +6.8%','warn']])
        .map(([l,v,u,s,c])=>`<div class="kpi ${c}"><div class="kl2">${l}</div>
          <div class="kv2 num">${v}<small>${u}</small></div><div class="ks">${s}</div></div>`).join('')}
    </div>
    ${isRes?`
    <div class="sec">월별 전기 사용 추이</div>
    ${svgBars([88,92,79,74,81,90,96.4],520,80,(v,i)=>i===6?'#062b5c':'#38a3f5')}
    <div class="axl" style="margin-bottom:16px"><span>1월</span><span>3월</span><span>5월</span><span>7월</span></div>
    <div class="sec">우리 세대 개선 포인트</div>
    <div class="empty" style="text-align:left">
      <b>1. ${spaceOf('living').nm} 오후 고온</b> — 서향 일사로 재실 냉방 상한 26℃ 초과가 월 18일 발생했습니다. 전동커튼 자동 제어 시 월 6.2kWh 절감이 예상됩니다.<br><br>
      <b>2. ${spaceOf('living').nm} CO₂</b> — 저녁 시간대 900ppm 초과가 잦습니다. 환기 유닛 예약 운전을 권장합니다.<br><br>
      <b>3. 대기전력</b> — 미사용 콘센트 3개에서 월 2.1kWh가 소모되고 있습니다.</div>`
    :`<div class="sec">섹션별 요약</div>
    <table class="tbl"><thead><tr><th>섹션</th><th class="n">주요 지표</th><th>전월 대비</th><th>상태</th></tr></thead><tbody>
      <tr><td class="str">민원</td><td class="n">32건 · SLA 92.4%</td><td>−5건 / +4.3%p</td><td><span class="pill ok">개선</span></td></tr>
      <tr><td class="str">알람</td><td class="n">118건 · 반복 14%</td><td>+12건</td><td><span class="pill warn">악화</span></td></tr>
      <tr><td class="str">정비</td><td class="n">27건 · 예방 61%</td><td>+6.8%p</td><td><span class="pill ok">개선</span></td></tr>
      <tr><td class="str">에너지</td><td class="n">86,420 kWh</td><td>+8.4%</td><td><span class="pill warn">폭염 영향</span></td></tr>
      <tr><td class="str">안전</td><td class="n">사고 0건 · 미조치 ${SAFETY.filter(s=>s.st!=='done').length}건</td><td>—</td><td><span class="pill ok">양호</span></td></tr>
      <tr><td class="str">비용</td><td class="n">3,816만원 (추정)</td><td>+6.8%</td><td><span class="pill purple">IF-ERP 미연계</span></td></tr>
    </tbody></table>
    <div class="empty" style="text-align:left;margin-top:12px;font-size:11px">
      원천 데이터가 미수집된 섹션은 <b>"데이터 불충분"</b>으로 표시하고 리포트 생성은 진행합니다.
      확정 후 원천 데이터가 정정되면 <b>개정판</b>으로 재발행됩니다.</div>`}`}],
    actions:[ !isRes&&{label:'리포트 확정',kind:'primary',
      fn:()=>{clearDetail();toast('7월 리포트를 확정했습니다 · v1.2 → 확정본 보존');}} ],
  });
}

/* 인라인 핸들러가 참조하는 심볼을 window 에 등록 (동작 유지) */
Object.assign(window,{pgHome,setPlanTab,setPlanMode,renderPlanLegend,tgSenior,tgAway,renderMyReq,roomPaint,renderPlan,selectRoom,backToSummary,backToSpace,selectSensor,renderRight,summaryPanel,setOutletTab,spacePanel,toggleSpacePower,sensorPanel,setPeriod,toggleSensor,deviceControl,devSet,devStop,devPower,pgRoadmap,pgMaterial,pgPipe,tgPipe,renderPipe,pgEnvpred,pgNeighbor,pgEnergyRes,pgScenario,applyScenario,pgLifespan,pgHistory,pgRemodel,pgTransfer,genTransfer,pgRequest,pgReqstat,renderReqForm,renderReqPlan,submitReq,openMyReq,rateReq,reopenReq,openReport});
