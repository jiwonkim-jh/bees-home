/* BEES Home v0.9 · pages/admin.js — SCR-01~SCR-14 관리자 화면 + 협력사 모바일 */
import {ASTATUS,ROLES,RSTATUS,RSTEPS,SEV,WSTATUS} from '../data/const.js';
import {$,COMMON,COMPLEX,ENVSYS,MODULE_TYPES,UNITS,clamp,fx,rnd,typeNmOf,won} from '../data/module.js';
import {MODULE} from '../data/moduleUnit.js';
import {ALARMS,AUDIT,CCTVS,COSTS,ENG_TREND,IFACES,KPIS,PARTNERS,RECS,REQUESTS,RISKS,SAFETY,SAFE_SEV,TIMELINE,WORKORDERS,WORKTIME,typeGroups} from '../data/ops.js';
import {state} from '../data/state.js';
import {donut,svgArea,svgBars,svgMulti} from '../render/chart.js';
import {closeAll,dlgOpen,pgHead,renderNotiBadge,renderPage,renderSideNav,toast} from '../render/shell.js';
import {openDetail,popDetail,clearDetail,setDetailTab} from '../render/detail.js';

/* ══════════════════════════════════════════════════════════════════
   관리자 · SCR-01 통합 운영 대시보드 (FR-MON-01)
   ══════════════════════════════════════════════════════════════════ */
export function pgDash(){
  const openAl=ALARMS.filter(a=>a.st!=='done'), urg=openAl.filter(a=>a.sev===1).length;
  const openRq=REQUESTS.filter(r=>r.st!=='done'), late=openRq.filter(r=>r.slaPct>=80).length;
  const openWo=WORKORDERS.filter(w=>w.st==='planned'||w.st==='progress');
  const openSf=SAFETY.filter(s=>s.st!=='done');
  const totalEng=MODULE_TYPES.reduce((a,t)=>a+t.eng,0);
  const tgrps=typeGroups(ALARMS.filter(a=>a.st!=='done'));
  return pgHead('dash',`${COMPLEX.nm} · 모듈 ${MODULE_TYPES.length}종 · 개체 ${COMPLEX.units}기 · 최근 갱신 ${ENVSYS.time}`,
    `<button class="btn sm" onclick="goPage('map')">🗺 트윈 맵</button>
     <button class="btn pri sm" onclick="goPage('alarm')">미처리 ${openAl.length}건 처리 →</button>`)+`
  <div class="kpiRow" style="grid-template-columns:repeat(6,1fr)">
    <div class="kpi ${urg?'danger':'ok'}"><div class="kl2">🔔 미처리 알람</div>
      <div class="kv2 num">${openAl.length}<small>건</small></div>
      <div class="ks">긴급 <b class="up">${urg}</b> · 높음 ${openAl.filter(a=>a.sev===2).length}</div></div>
    <div class="kpi ${late?'warn':'ok'}"><div class="kl2">📋 미처리 민원</div>
      <div class="kv2 num">${openRq.length}<small>건</small></div>
      <div class="ks">SLA 임박 <b class="up">${late}</b> · 반복 ${REQUESTS.filter(r=>r.rep>=3).length}</div></div>
    <div class="kpi info"><div class="kl2">🔧 진행 중 작업</div>
      <div class="kv2 num">${openWo.length}<small>건</small></div>
      <div class="ks">완료 보고 대기 ${WORKORDERS.filter(w=>w.st==='reported').length}</div></div>
    <div class="kpi ${openSf.filter(s=>s.sev===1).length?'danger':'warn'}"><div class="kl2">🛡 미조치 안전</div>
      <div class="kv2 num">${openSf.length}<small>건</small></div>
      <div class="ks">긴급 <b class="up">${openSf.filter(s=>s.sev===1).length}</b> · PRD KPI</div></div>
    <div class="kpi"><div class="kl2">⚡ 금일 단지 전력 <span class="srcb meas">계측</span></div>
      <div class="kv2 num">${fx(totalEng)}<small>kWh</small></div>
      <div class="ks">전일 대비 <b class="up">▲ 6.2%</b></div></div>
    <div class="kpi ok"><div class="kl2">✅ SLA 준수율</div>
      <div class="kv2 num">92.4<small>%</small></div>
      <div class="ks">전월 대비 <b class="dn">▲ 4.3%p</b></div></div>
  </div>

  <div class="g21 mb12">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🧱</span>모듈 타입별 운영 상태</span>
      <span class="cx">활성 이벤트 심각도 가중 합산</span></div>
      <div class="cb"><div class="typeGrid">${MODULE_TYPES.map(t=>`
        <button class="typeCard" onclick="state.mapType='${t.id}';goPage('map')">
          <span class="dg" style="background:${t.c}"></span>
          <div class="dn2">${t.nm}</div><div class="dm">개체 ${t.count}기 · ${t.grade}</div>
          <div class="dstats"><div>알람<b>${t.al}</b></div><div>민원<b>${t.req}</b></div>
            <div>작업<b>${t.wo}</b></div><div>전력<b>${fx(t.eng)}</b></div></div>
        </button>`).join('')}</div>
        ${tgrps.length?`<div class="sec" style="margin:14px 0 8px">동일 모듈 타입 반복 현상 <span class="srcb calc">산출</span></div>
        ${tgrps.map(g=>`<div class="kv"><span class="k"><b style="color:var(--ink)">${typeNmOf(g.type)} ${g.units.size}기</b>
          <small>에서 같은 현상 — ${g.kind}</small></span>
          <span class="v"><span class="pill warn">반복 ${g.rep}회</span></span></div>`).join('')}`:''}
        <div class="sec" style="margin:14px 0 8px">최근 7일 단지 전력 추이 <span class="srcb meas">계측</span></div>
        ${svgBars(ENG_TREND.slice(-7).map(e=>+e.elec),640,64,(v,i)=>i===6?'#062b5c':'#38a3f5')}
        <div class="axl"><span>08-02</span><span>08-04</span><span>08-06</span><span>08-08</span></div>
      </div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🕐</span>24시간 이벤트</span>
      <span class="cx">${TIMELINE.length}건</span></div>
      <div class="cb" style="max-height:430px;overflow-y:auto">
        <div class="tl">${TIMELINE.map(e=>`<div class="tlItem ${e.k}">
          <div class="tt">${e.t}</div><div class="tm">${e.m}</div></div>`).join('')}</div>
      </div></div>
  </div>

  <div class="g3">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🚨</span>긴급 조치 목록</span>
      <button class="btn sm" onclick="goPage('alarm')">전체 →</button></div>
      <table class="tbl"><thead><tr><th>알람</th><th>위치</th><th>상태</th></tr></thead><tbody>
      ${openAl.filter(a=>a.sev<=2).slice(0,5).map(a=>`<tr class="clk" onclick="goPage('alarm');openAlarm('${a.id}')">
        <td class="str"><span class="sevDot sev${a.sev}"></span>${a.type}</td>
        <td style="font-size:11px">${a.loc}</td>
        <td><span class="pill ${a.st==='occurred'?'danger':a.st==='acting'?'info':'mute'}">${ASTATUS[a.st]}</span></td></tr>`).join('')}
      </tbody></table></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🛡</span>안전·보안</span>
      <button class="btn sm" onclick="goPage('safety')">전체 →</button></div>
      <table class="tbl"><thead><tr><th>이벤트</th><th>위치</th><th>상태</th></tr></thead><tbody>
      ${openSf.slice(0,5).map(s=>`<tr class="clk" onclick="goPage('safety')">
        <td class="str"><span class="sevDot sev${s.sev}"></span>${s.type}</td>
        <td style="font-size:11px">${s.loc}</td>
        <td><span class="pill ${s.st==='open'?'danger':'info'}">${s.st==='open'?'미조치':'조치 중'}</span></td></tr>`).join('')}
      </tbody></table></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🔌</span>데이터 연계</span>
      <span class="cx">FR-ADM-06</span></div>
      <table class="tbl"><thead><tr><th>IF</th><th>최종 수신</th><th>상태</th></tr></thead><tbody>
      ${IFACES.map(f=>`<tr><td class="str">${f.id}<div style="font-size:10px;color:var(--muted2);font-weight:400">${f.nm}</div></td>
        <td class="num" style="font-size:11px;color:var(--muted)">${f.last}</td>
        <td><span class="pill ${f.st==='ok'?'ok':f.st==='warn'?'warn':'mute'} dot">${f.st==='ok'?'정상':f.st==='warn'?'주의':'미연계'}</span></td></tr>`).join('')}
      </tbody></table></div>
  </div>`;
}


/* ══════════ SCR-02 디지털 트윈 맵 (FR-DTM-01~05) ══════════ */
export function pgMap(){
  const d=MODULE_TYPES.find(x=>x.id===state.mapType)||MODULE_TYPES[0];
  const us=UNITS.filter(u=>u.type===d.id);
  return pgHead('map','공간 계층 트리 · 단지 > 모듈 타입 > 개체 · 상태 오버레이',
    `<div class="layerBar">${[['alarm','알람','#d64545'],['request','민원','#e08a12'],['work','작업','#0877ed'],['energy','에너지','#6b57d6']].map(([k,nm,c])=>
        `<button class="lchip ${state.mapLayer[k]?'on':''}" onclick="tgLayer('${k}')"><i class="lcd" style="background:${c}"></i>${nm}</button>`).join('')}</div>`)+`
  <div class="g12">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🌳</span>공간 계층</span><span class="cx">FR-DTM-01</span></div>
      <div class="cb" style="max-height:520px;overflow-y:auto">
        <button class="treeNode on" style="font-weight:700"><span class="tw">▼</span>🏙 ${COMPLEX.nm}
          <span class="tbg"><span class="tb2 r">${ALARMS.filter(a=>a.st!=='done').length}</span>
          <span class="tb2 w">${REQUESTS.filter(r=>r.st!=='done').length}</span></span></button>
        ${MODULE_TYPES.map(tg=>`
          <button class="treeNode ${state.mapType===tg.id?'on':''}" style="padding-left:20px" onclick="setType('${tg.id}')">
            <span class="tw">${state.mapType===tg.id?'▼':'▶'}</span>🧱 ${tg.nm}
            <span class="tbg">${tg.al?`<span class="tb2 r">${tg.al}</span>`:''}${tg.req?`<span class="tb2 w">${tg.req}</span>`:''}</span></button>
          ${state.mapType===tg.id?UNITS.filter(u=>u.type===tg.id).map(u=>
            `<button class="treeNode" style="padding-left:38px" onclick="openUnit('${u.id}')">
              <span class="tw">▸</span>${u.id}${u.mine?' · 우리 유닛':''}
              <span class="tbg">${u.al?`<span class="tb2 r">${u.al}</span>`:''}${u.req?`<span class="tb2 w">${u.req}</span>`:''}</span></button>`
          ).join(''):''}`).join('')}
        <div style="margin-top:10px;padding:9px 10px;background:var(--panel2);border-radius:var(--r-s);font-size:10.5px;color:var(--muted);line-height:1.6">
          ${state.role==='facility'?`<b>시설 관리자</b>는 담당 구역(${MODULE.typeNm})만 수정 가능하며, 타 구역은 조회 전용입니다.`
            :'입주민 계정은 <b>본인 개체 + 단지 공용부</b>만 조회됩니다 (RBAC).'}
        </div>
      </div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🗺</span>${d.nm} 개체 배치</span>
      <span class="cx">타입별 개체 그룹 · FR-DTM-05</span></div>
      <div class="cb"><div class="mapWrap">${typeGroupSvg(us,d)}</div>
        <div style="display:flex;gap:14px;justify-content:center;margin-top:10px;font-size:10.5px;color:var(--muted);flex-wrap:wrap">
          <span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#d64545;margin-right:5px"></i>알람 있음</span>
          <span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#e08a12;margin-right:5px"></i>민원 있음</span>
          <span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#dfe6ee;margin-right:5px"></i>정상</span>
          <span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#f4f6f9;border:1px dashed #c3ccd8;margin-right:5px"></i>공실</span>
        </div></div></div>
  </div>`;
}

/* 타입별 개체 그룹 — 층 격자가 아니라 타입 카드 그룹으로 배치한다 */
export function typeGroupSvg(us,t){
  const W=640, cw=118, chh=58, gx=18, gy=16, cols=4;
  const rows=Math.ceil(us.length/cols);
  const x0=(W-(cols*cw+(cols-1)*gx))/2, y0=34;
  const H=y0+rows*(chh+gy)+10;
  let s=`<svg id="dtMap" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  s+=`<text x="${x0}" y="16" font-size="10" fill="#96a1b0">${t.nm} 개체 ${us.length}기 · 층 구분 없음 (평면 배치)</text>`;
  s+=`<rect x="${x0-10}" y="${y0-12}" width="${cols*cw+(cols-1)*gx+20}" height="${rows*(chh+gy)+4}"
       rx="9" fill="none" stroke="#dfe6ee" stroke-dasharray="5 4"/>`;
  us.forEach((un,i)=>{
    const x=x0+(i%cols)*(cw+gx), y=y0+Math.floor(i/cols)*(chh+gy);
    let fill='#dfe6ee', stroke='#cfd8e3', dash='';
    if(!un.occ){fill='#f4f6f9';stroke='#c3ccd8';dash='stroke-dasharray="4 3"';}
    else if(state.mapLayer.alarm&&un.al){fill='#d64545';}
    else if(state.mapLayer.request&&un.req){fill='#e08a12';}
    else if(state.mapLayer.energy){const v=clamp((un.kwh-58)/82,0,1);fill=`rgb(${Math.round(107+v*100)},${Math.round(87+v*20)},${Math.round(214-v*90)})`;}
    const dark=(state.mapLayer.alarm&&un.al)||(state.mapLayer.request&&un.req)||state.mapLayer.energy;
    s+=`<g class="mapUnit" onclick="openUnit('${un.id}')">
      <rect x="${x}" y="${y}" width="${cw}" height="${chh}" rx="7" fill="${fill}" ${dash}
        stroke="${un.mine?'#062b5c':stroke}" stroke-width="${un.mine?2.6:1.2}"/>
      <text x="${x+11}" y="${y+21}" font-size="11.5" font-weight="800" fill="${dark?'#fff':'#152033'}">${un.id}</text>
      <text x="${x+11}" y="${y+37}" font-size="9.5" fill="${dark?'#ffffffc7':'#6d7787'}">${un.occ?fx(un.kwh)+' kWh':'공실'}</text>
      ${un.al&&state.mapLayer.alarm?`<circle cx="${x+cw-15}" cy="${y+16}" r="8" fill="#fff"/><text x="${x+cw-15}" y="${y+19.5}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#d64545">${un.al}</text>`:''}
      ${un.req&&state.mapLayer.request?`<circle cx="${x+cw-15}" cy="${y+40}" r="8" fill="#fff"/><text x="${x+cw-15}" y="${y+43.5}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#e08a12">${un.req}</text>`:''}
    </g>`;});
  return s+'</svg>';
}

export function tgLayer(k){state.mapLayer[k]=!state.mapLayer[k];renderPage();}

export function setType(id){state.mapType=id;renderPage();}

export function openUnit(id){
  const u=UNITS.find(x=>x.id===id); if(!u)return;
  /* 개체 조회 키 = 유닛 코드 (동·호 조합 아님) */
  const al=ALARMS.filter(a=>String(a.loc).includes(u.id));
  const rq=REQUESTS.filter(r=>r.sp===u.id);
  const sameType=UNITS.filter(x=>x.type===u.type&&x.occ);
  const typeAvg=sameType.reduce((a,x)=>a+x.kwh,0)/(sameType.length||1);
  openDetail({
    title:`${u.id} · ${u.typeNm}`, subtitle:'개체 상세 · FR-DTM-04',
    sections:[
      {label:'개요', body:`
        <div class="kpiRow" style="grid-template-columns:1fr 1fr 1fr">
          <div class="kpi"><div class="kl2">이달 전력</div><div class="kv2 num">${fx(u.kwh)}<small>kWh</small></div>
            <div class="ks">동일 타입 평균 ${fx(typeAvg)}</div></div>
          <div class="kpi ${u.al?'danger':'ok'}"><div class="kl2">활성 알람</div><div class="kv2 num">${u.al}<small>건</small></div></div>
          <div class="kpi ${u.req?'warn':'ok'}"><div class="kl2">미처리 민원</div><div class="kv2 num">${u.req}<small>건</small></div></div>
        </div>
        <div class="sec" style="margin-top:14px">기본 정보</div>
        <div class="kv"><span class="k">점유</span><span class="v">${u.occ?'입주':'공실'}</span></div>
        <div class="kv"><span class="k">모듈 타입</span><span class="v" style="font-weight:600">${u.typeNm} <small style="color:var(--muted2)">${u.type}</small></span></div>
        <div class="kv"><span class="k">개체 ID</span><span class="v" style="font-family:monospace">${u.id}</span></div>
        <div class="kv"><span class="k">제조 번호</span><span class="v" style="font-family:monospace">${u.serial}</span></div>
        <div class="kv"><span class="k">센서 연결</span><span class="v">${u.occ?'7개 정상':'—'}</span></div>
        <div class="empty" style="margin-top:14px;text-align:left">담당 부서 <b>시설관리팀</b> · 대표 채널 1600-0000<br>
          <span style="color:var(--muted2)">개인 연락처는 노출하지 않습니다 (FR-CSM-04)</span></div>`},
      {label:`관련 알람 ${al.length}`, body: al.length
        ? al.map(a=>`<button class="sensorRow" onclick="openAlarm('${a.id}')">
            <span class="si"><span class="sevDot sev${a.sev}"></span></span>
            <span style="flex:1;min-width:0"><span class="sn">${a.type}</span><span class="st">${a.id} · ${a.at}</span></span>
            <span class="sv2" style="color:var(--muted2)">›</span></button>`).join('')
        : `<div class="empty">활성 알람이 없습니다</div>`},
      {label:`관련 민원 ${rq.length}`, body: rq.length
        ? rq.map(r=>`<button class="sensorRow" onclick="openReqAdmin('${r.id}')">
            <span class="si">📋</span>
            <span style="flex:1;min-width:0"><span class="sn">${r.sub}</span><span class="st">${r.id} · ${r.at}</span></span>
            <span class="sv2"><span class="pill ${r.st==='done'?'ok':'info'}">${RSTATUS[r.st]}</span></span></button>`).join('')
        : `<div class="empty">미처리 민원이 없습니다</div>`},
    ],
    actions:[{label:'작업 지시 생성 ›',kind:'primary',fn:()=>openWoNew({sp:u.id})}],
  });
}


/* ══════════ SCR-03 알람 관리 ══════════ */
export function pgAlarm(){
  let list=ALARMS.filter(a=>
    (state.alarmFilter.sev==='all'||a.sev===+state.alarmFilter.sev)&&
    (state.alarmFilter.st==='all'||a.st===state.alarmFilter.st)&&
    (!state.alarmFilter.q||`${a.type}${a.loc}${a.eq}${a.id}`.toLowerCase().includes(state.alarmFilter.q.toLowerCase())));
  list=list.slice().sort((a,b)=>a.sev-b.sev||(a.at<b.at?1:-1));
  const grps={}; ALARMS.forEach(a=>{if(a.grp)(grps[a.grp]=grps[a.grp]||[]).push(a);});
  return pgHead('alarm','임계값·통신장애·비정상 패턴 기반 자동 생성 · 상태 전이 이력 관리',
    `<button class="btn sm" onclick="resetAlarmFilter()">필터 초기화</button>`)+`
  <div class="card mb12"><div class="cb" style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">
    <span class="sec" style="margin:0">필터</span>
    <select class="btn" style="padding:6px 10px" onchange="state.alarmFilter.sev=this.value;renderPage()">
      <option value="all"${state.alarmFilter.sev==='all'?' selected':''}>심각도 전체</option>
      ${[1,2,3,4].map(s=>`<option value="${s}"${state.alarmFilter.sev==s?' selected':''}>${SEV[s].nm}</option>`).join('')}</select>
    <select class="btn" style="padding:6px 10px" onchange="state.alarmFilter.st=this.value;renderPage()">
      <option value="all"${state.alarmFilter.st==='all'?' selected':''}>상태 전체</option>
      ${Object.entries(ASTATUS).map(([k,v])=>`<option value="${k}"${state.alarmFilter.st===k?' selected':''}>${v}</option>`).join('')}</select>
    <input class="btn" style="padding:6px 12px;flex:1;min-width:170px;text-align:left" placeholder="유형·위치·설비 검색"
      value="${state.alarmFilter.q}" oninput="state.alarmFilter.q=this.value;renderPage()">
    <span class="pill mute">${list.length} / ${ALARMS.length}건</span>
  </div></div>
  <div class="g21">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🔔</span>알람 목록</span>
      <span class="cx">심각도 ↓ · 발생시간 ↓</span></div>
      <div class="tblWrap" style="max-height:520px">
      ${list.length===0?'<div class="empty" style="margin:14px">조건에 맞는 알람이 없습니다</div>':`
      <table class="tbl"><thead><tr><th>유형</th><th>위치 · 설비</th><th>발생</th><th>반복</th><th>상태</th><th></th></tr></thead><tbody>
      ${list.map(a=>`<tr class="clk" onclick="openAlarm('${a.id}')">
        <td class="str"><span class="sevDot sev${a.sev}"></span>${a.type}
          <div style="font-size:10px;color:var(--muted2);font-family:monospace;margin-top:1px">${a.id}</div></td>
        <td>${a.loc}<div style="font-size:10.5px;color:var(--muted)">${a.eq}</div></td>
        <td class="num" style="font-size:11px;color:var(--muted)">${a.at}</td>
        <td>${a.rep>1?`<span class="pill warn">${a.rep}회${a.grp?' · '+a.grp:''}</span>`:'<span style="color:var(--muted2)">—</span>'}</td>
        <td><span class="pill ${a.st==='occurred'?'danger':a.st==='acting'?'info':a.st==='done'?'ok':'mute'}">${ASTATUS[a.st]}</span></td>
        <td style="text-align:right;color:var(--muted2)">›</td></tr>`).join('')}
      </tbody></table>`}</div></div>
    <div>
      <div class="card mb12"><div class="ch"><span class="ct"><span class="ci">🧩</span>반복 알람 그룹</span><span class="cx">FR-MON-05</span></div>
        <div class="cb">${Object.entries(grps).map(([g,arr])=>{
          const top=arr.reduce((a,b)=>a.sev<=b.sev?a:b);
          return `<div style="border:1px solid var(--line);border-radius:var(--r-m);padding:11px 12px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <span style="font-size:12.5px;font-weight:800"><span class="sevDot sev${top.sev}"></span>${top.type}</span>
              <span class="pill warn">반복 ${arr.reduce((a,b)=>a+b.rep,0)}회</span></div>
            <div style="font-size:11px;color:var(--muted);margin-top:5px;line-height:1.6">
              그룹 ${g} · ${arr.length}개 알람 · 최초 ${arr[arr.length-1].at} → 최근 ${arr[0].at}</div>
            ${(()=>{const tg=typeGroups(arr); return tg.length
              ? `<div style="font-size:11px;color:var(--ink2);margin-top:5px;font-weight:700">
                  ${tg.map(x=>`동일 모듈 타입 ${typeNmOf(x.type)} ${x.units.size}기에서 같은 현상`).join('<br>')}</div>`
              : '';})()}
            <div style="font-size:10.5px;color:var(--muted2);margin-top:5px">${arr.map(a=>a.loc).join(' / ')}</div>
            <button class="btn sm" style="margin-top:8px;width:100%" onclick="goPage('rec')">예방 정비 권고 후보 →</button>
          </div>`;}).join('')}</div></div>
      <div class="card"><div class="ch"><span class="ct"><span class="ci">📤</span>알림 발송 규칙</span><span class="cx">FR-MON-06</span></div>
        <div class="cb">
          ${[[1,'즉시 · 담당자 + 상위자'],[2,'즉시 · 담당자'],[3,'대시보드 집계'],[4,'일 1회 집계']].map(([s,d])=>
            `<div class="kv"><span class="k"><span class="sevDot sev${s}"></span>${SEV[s].nm}</span><span class="v" style="font-size:11px">${d}</span></div>`).join('')}
          <button class="btn" style="width:100%;margin-top:10px" onclick="openEscalation()">발송 이력 · 에스컬레이션 →</button>
          <div style="font-size:10px;color:var(--muted2);margin-top:6px">발송 이력은 알람 상세의 「발송 이력」 탭에서도 볼 수 있습니다</div>
        </div></div>
    </div>
  </div>`;
}

export function resetAlarmFilter(){state.alarmFilter={sev:'all',st:'all',q:''};renderPage();}

export function openAlarm(id){
  const a=ALARMS.find(x=>x.id===id); if(!a)return;
  const flow=['occurred','ack','acting','done'], ci=flow.indexOf(a.st);
  const wo=WORKORDERS.find(w=>w.src===a.id);
  openDetail({
    title:a.type, subtitle:`${a.id} · ${SEV[a.sev].nm}`,
    sections:[
      {label:'상세', body:`
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
          <span class="pill ${SEV[a.sev].c} dot">${SEV[a.sev].nm}</span>
          <span class="pill mute">${a.loc}</span><span class="pill mute">${a.eq}</span>
          ${a.rep>1?`<span class="pill warn">반복 ${a.rep}회</span>`:''}</div>
        <div class="sec">상태 전이 <span class="srcb calc">상태 머신</span></div>
        <div class="stepFlow" style="margin-bottom:6px">${flow.map((f,i)=>
          `<span class="sf ${i<ci?'done':i===ci?'cur':''}">${ASTATUS[f]}</span>`).join('<span class="sa">›</span>')}</div>
        <div style="font-size:10.5px;color:var(--muted2);margin-bottom:14px">
          허용 전이: 발생→확인→조치 중→완료 / 확인→보류→확인. 그 외는 E-FLOW-001로 거부됩니다.</div>
        <div class="sec">원인 데이터</div>
        <div class="kv"><span class="k">감지 근거</span><span class="v" style="font-weight:600;font-size:11.5px;text-align:right;max-width:60%">${a.src}</span></div>
        <div class="kv"><span class="k">발생 시각</span><span class="v num">${a.at}</span></div>
        <div class="kv"><span class="k">권장 조치</span><span class="v" style="font-weight:600;font-size:11.5px;text-align:right;max-width:60%">${a.act}</span></div>
        ${wo?`<div class="sec" style="margin-top:14px">연결 작업 지시</div>
          <div class="kv"><span class="k">${wo.id}</span><span class="v"><span class="pill info">${WSTATUS[wo.st]}</span></span></div>
          <div class="kv"><span class="k">${wo.nm}</span><span class="v" style="font-weight:600;font-size:11px">${wo.assignee}</span></div>`
          :`<div class="empty" style="margin-top:14px">연결된 작업 지시가 없습니다</div>`}`},
      /* 발송 이력 — 별도 모달이던 것을 알람 상세의 탭으로 흡수했다 (FR-MON-06) */
      {label:'발송 이력', body:escalationBody()},
    ],
    actions:[
      !wo&&{label:'작업 지시 생성',fn:()=>openWoNew({trg:'알람',src:a.id,nm:`${a.type} 조치`,sp:a.loc,eq:a.eq,pri:SEV[a.sev].nm})},
      a.st!=='done'&&{label:'보류',fn:()=>alarmNext(a.id,'hold')},
      a.st!=='done'&&{label:ci<flow.length-1?ASTATUS[flow[ci+1]]+'로 전환':'완료',kind:'primary',fn:()=>alarmNext(a.id,'next')},
    ],
  });
}

export function alarmNext(id,mode){
  const a=ALARMS.find(x=>x.id===id); if(!a)return;
  const flow=['occurred','ack','acting','done'], ci=flow.indexOf(a.st);
  if(mode==='hold'){a.st='hold';toast(`${a.id} 보류 — 사유 입력이 필수입니다`);}
  else{a.st=flow[Math.min(ci+1,flow.length-1)];
    logAudit('알람 상태 변경',`${a.id} → ${ASTATUS[a.st]}`);
    toast(`${a.id} → ${ASTATUS[a.st]} 전환 · 처리자 ${state.loginUser} 이력 기록`);}
  clearDetail(); renderSideNav(); renderPage(); renderNotiBadge();
}

/* 발송 이력 버튼 — 같은 정보에 진입 경로를 두 개 만들지 않기 위해
   가장 시급한 미처리 알람의 상세를 열고 「발송 이력」 탭으로 이동한다 */
export function openEscalation(){
  const a=ALARMS.filter(x=>x.st!=='done').sort((x,y)=>x.sev-y.sev)[0]||ALARMS[0];
  openAlarm(a.id); setDetailTab(1);
}

/* 알림 발송 이력 — 알람 상세의 탭 본문 (단독 모달이 아니다) */
export function escalationBody(){
  return `
    <table class="tbl"><thead><tr><th>시각</th><th>알람</th><th>채널</th><th>수신자</th><th>결과</th></tr></thead><tbody>
      <tr><td class="num" style="font-size:11px">16:52:04</td><td class="str">AL-2608-041 누수</td><td>대시보드 + 문자</td><td>이재훈 · 최은영</td><td><span class="pill ok">확인 02:11</span></td></tr>
      <tr><td class="num" style="font-size:11px">16:30:12</td><td class="str">AL-2608-040 CO₂</td><td>대시보드</td><td>김성호</td><td><span class="pill ok">확인 04:38</span></td></tr>
      <tr><td class="num" style="font-size:11px">15:12:41</td><td class="str">AL-2608-039 EHP</td><td>대시보드</td><td>김성호</td><td><span class="pill ok">확인 01:22</span></td></tr>
      <tr><td class="num" style="font-size:11px">14:48:03</td><td class="str">AL-2608-038 통신</td><td>대시보드</td><td>김성호</td><td><span class="pill warn">미확인 2:55</span></td></tr>
      <tr><td class="num" style="font-size:11px">14:58:03</td><td class="str">└ 에스컬레이션</td><td>문자</td><td>최은영 (상위자)</td><td><span class="pill info">발송</span></td></tr>
      <tr><td class="num" style="font-size:11px">08:00:00</td><td class="str">AL-2608-032 필터</td><td>일 집계</td><td>박지훈</td><td><span class="pill mute">집계 전환</span></td></tr>
    </tbody></table>
    <div class="empty" style="text-align:left;margin-top:12px;font-size:10.5px">
      긴급 알람이 <b>10분</b> 내 확인되지 않으면 상위 담당자에게 자동 에스컬레이션됩니다.
      야간(22~07시) 보통·낮음 알람은 발송을 억제하고 익일 집계로 전환합니다.
      <span style="color:var(--purple)">모바일 푸시 발송은 데모 범위 밖 — 발송 기록만 표시합니다.</span></div>`;
}


/* ══════════ SCR-04 민원 관리 ══════════ */
export function pgReq(){
  const list=REQUESTS.filter(r=>state.reqFilter==='all'||(state.reqFilter==='open'&&r.st!=='done')||
    (state.reqFilter==='late'&&r.slaPct>=80&&r.st!=='done')||(state.reqFilter==='rep'&&r.rep>=3));
  const repGroups={}; REQUESTS.filter(r=>r.rep>=3).forEach(r=>{
    const k=`${r.sp}|${r.sub}`; (repGroups[k]=repGroups[k]||[]).push(r);});
  return pgHead('req','자동 분류 · 담당자 추천 · SLA 타이머 · 반복 민원 지표',
    `<span class="seg">${[['all','전체'],['open','미처리'],['late','SLA 임박'],['rep','반복']].map(([k,n])=>
      `<button class="${state.reqFilter===k?'on':''}" onclick="state.reqFilter='${k}';renderPage()">${n}</button>`).join('')}</span>`)+`
  <div class="kpiRow" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi info"><div class="kl2">전체 민원</div><div class="kv2 num">${REQUESTS.length}<small>건</small></div><div class="ks">이번 달 접수</div></div>
    <div class="kpi warn"><div class="kl2">미처리</div><div class="kv2 num">${REQUESTS.filter(r=>r.st!=='done').length}<small>건</small></div>
      <div class="ks">SLA 임박 ${REQUESTS.filter(r=>r.slaPct>=80&&r.st!=='done').length}건</div></div>
    <div class="kpi ok"><div class="kl2">평균 1차 확인</div><div class="kv2 num">2.4<small>시간</small></div><div class="ks">목표 2.0시간</div></div>
    <div class="kpi danger"><div class="kl2">반복 민원 <span class="srcb calc">FR-CSM-06</span></div>
      <div class="kv2 num">${REQUESTS.filter(r=>r.rep>=3).length}<small>건</small></div><div class="ks">90일 · 동일 세대+유형 3회↑</div></div>
  </div>
  <div class="g21">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📋</span>민원 목록</span><span class="cx">${list.length}건</span></div>
      <div class="tblWrap" style="max-height:500px">
      ${list.length===0?'<div class="empty" style="margin:14px">조건에 맞는 민원이 없습니다</div>':`
      <table class="tbl"><thead><tr><th>유형</th><th>위치</th><th>담당</th><th>SLA</th><th>상태</th><th></th></tr></thead><tbody>
      ${list.map(r=>{const late=r.slaPct>=80&&r.st!=='done';
        return `<tr class="clk" onclick="openReqAdmin('${r.id}')">
        <td class="str">${r.urg==='긴급'?'<span class="sevDot sev1"></span>':''}${r.sub}
          <div style="font-size:10px;color:var(--muted2);font-family:monospace;margin-top:1px">${r.id}${r.rep>=3?' · 반복':''}</div></td>
        <td>${r.sp}<div style="font-size:10.5px;color:var(--muted)">${r.at}</div></td>
        <td style="font-size:11px">${r.assignee||'<span style="color:var(--danger)">미배정</span>'}</td>
        <td><span class="slaBar" style="display:block"><i style="width:${r.slaPct}%;background:${late?'#d64545':r.slaPct>=50?'#e08a12':'#1a9c6a'}"></i></span>
          <span style="font-size:9.5px;color:${late?'var(--danger)':'var(--muted2)'}">${r.st==='done'?'완료':late?'지연 위험':r.slaDue}</span></td>
        <td><span class="pill ${r.st==='done'?'ok':r.st==='acting'?'info':r.st==='assigned'?'purple':'warn'}">${RSTATUS[r.st]}</span></td>
        <td style="text-align:right;color:var(--muted2)">›</td></tr>`;}).join('')}
      </tbody></table>`}</div></div>
    <div>
      <div class="card mb12"><div class="ch"><span class="ct"><span class="ci">🔁</span>반복 민원 상위</span><span class="cx">FR-CSM-06</span></div>
        <div class="cb">${Object.entries(repGroups).map(([k,arr])=>{const [sp,sub]=k.split('|');
          return `<div style="border:1px solid var(--line);border-radius:var(--r-m);padding:11px 12px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span style="font-size:12.5px;font-weight:800">${sp}</span><span class="pill danger">${arr.length}회</span></div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">${sub} · 최근 90일</div>
            <button class="btn sm" style="margin-top:8px;width:100%" onclick="toast('근본 원인 분석 과제를 생성했습니다')">근본 원인 분석 과제 생성</button>
          </div>`;}).join('')||'<div class="empty">반복 민원 없음</div>'}</div></div>
      <div class="card"><div class="ch"><span class="ct"><span class="ci">⏱</span>유형별 SLA 정책</span><span class="cx">FR-ADM-04</span></div>
        <div class="cb">
          <div class="kv"><span class="k">급수·배수 <small>긴급</small></span><span class="v">1차 30분 · 처리 4시간</span></div>
          <div class="kv"><span class="k">냉난방 불량</span><span class="v">1차 2시간 · 처리 48시간</span></div>
          <div class="kv"><span class="k">전기·조명</span><span class="v">1차 2시간 · 처리 72시간</span></div>
          <div class="kv"><span class="k">소음 · 환경</span><span class="v">1차 4시간 · 처리 48시간</span></div>
          <div style="font-size:10.5px;color:var(--muted2);margin-top:9px;line-height:1.6">
            기한의 <b>80% 경과</b> 시 담당자 경고, 초과 시 지연 전환 + 관리자 통보(E-FLOW-002).</div>
        </div></div>
    </div>
  </div>`;
}

export function openReqAdmin(id){
  const r=REQUESTS.find(x=>x.id===id); if(!r)return;
  const si=RSTEPS.indexOf(r.st);
  const cands=[{n:'김성호',t:'시설관리 · 설비',load:4},{n:'박지훈',t:'시설관리 · 시설',load:2},{n:'이재훈',t:'시설관리 · 배관',load:5}];
  openDetail({
    title:r.sub, subtitle:`${r.id} · ${r.sp}`,
    sections:[
      {label:'접수 내용', body:`
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
          <span class="pill ${r.urg==='긴급'?'danger':r.urg==='보통'?'warn':'mute'} dot">${r.urg}</span>
          <span class="pill mute">${r.cat} › ${r.sub}</span>
          ${r.rep>=3?'<span class="pill danger">반복 민원</span>':''}
          ${r.photos?`<span class="pill info">사진 ${r.photos}장</span>`:''}</div>
        <div class="stepFlow" style="margin-bottom:14px">${RSTEPS.map((s,i)=>
          `<span class="sf ${i<si?'done':i===si?'cur':''}">${RSTATUS[s]}</span>`).join('<span class="sa">›</span>')}</div>
        <div class="sec">접수 내용</div>
        <div style="background:var(--panel2);border:1px solid var(--line);border-radius:var(--r-m);padding:11px 12px;
          font-size:12px;line-height:1.7;margin-bottom:14px">${r.desc}</div>
        <div class="sec">자동 분류 <span class="srcb pred">추정</span></div>
        <div class="kv"><span class="k">분류 결과</span><span class="v">${r.auto.cat}</span></div>
        <div class="kv"><span class="k">신뢰도</span><span class="v num" style="color:${r.auto.conf>=0.8?'var(--ok)':'var(--warn)'}">${(r.auto.conf*100).toFixed(0)}%
          ${r.auto.conf<0.7?'<span class="pill warn" style="margin-left:6px">분류 확인 필요</span>':''}</span></div>`},
      {label:'SLA · 배정', body:`
        <div class="sec">SLA</div>
        <div class="kv"><span class="k">기한</span><span class="v num">${r.slaDue}</span></div>
        <div class="kv"><span class="k">경과</span><span class="v"><span class="slaBar" style="display:inline-block;width:120px;vertical-align:middle">
          <i style="width:${r.slaPct}%;background:${r.slaPct>=80?'#d64545':r.slaPct>=50?'#e08a12':'#1a9c6a'}"></i></span>
          <span style="margin-left:7px">${r.slaPct}%</span></span></div>
        ${r.visit?`<div class="kv"><span class="k">방문 예정</span><span class="v num">${r.visit}</span></div>`:''}
        <div class="sec" style="margin-top:14px">담당자 추천 <span class="srcb calc">업무량 반영</span></div>
        ${cands.map(c=>`<div class="kv"><span class="k">${c.n} <small>${c.t}</small></span>
          <span class="v">${r.assignee&&r.assignee.includes(c.n)?'<span class="pill ok">배정됨</span>':
          `<span style="font-size:11px;color:var(--muted);margin-right:8px">처리 중 ${c.load}건</span>
           <button class="btn sm" onclick="assignReq('${r.id}','시설관리 ${c.n}')">배정</button>`}</span></div>`).join('')}`},
      r.log.length&&{label:`처리 이력 ${r.log.length}`, body:
        `<div class="tl">${r.log.map(l=>`<div class="tlItem i"><div class="tt">${l.t}</div><div class="tm">${l.m}</div></div>`).join('')}</div>`},
    ],
    actions:[
      {label:'작업 지시 생성',fn:()=>openWoNew({trg:'민원',src:r.id,nm:`${r.sub} 조치`,sp:r.sp,pri:r.urg})},
      r.st!=='done'&&{label:`${RSTATUS[RSTEPS[Math.min(si+1,3)]]}로 전환`,kind:'primary',fn:()=>reqNext(r.id)},
    ],
  });
}

export function assignReq(id,who){
  const r=REQUESTS.find(x=>x.id===id); if(!r)return;
  r.assignee=who; if(r.st==='received')r.st='assigned';
  r.log.push({t:'08-08 17:45',m:`${who} 배정 · 처리자 ${state.loginUser}`});
  logAudit('민원 담당자 배정',`${id} → ${who}`);
  renderSideNav(); renderPage();
  const _tab=(state.detail.stack[state.detail.stack.length-1]||{}).tab||0;
  popDetail(); openReqAdmin(id); setDetailTab(_tab);   // 상세 패널 갱신 · 탭 유지
  toast(`${id} → ${who} 배정 · SLA 타이머 시작`);
}

export function reqNext(id){
  const r=REQUESTS.find(x=>x.id===id); if(!r)return;
  const i=RSTEPS.indexOf(r.st); r.st=RSTEPS[Math.min(i+1,3)];
  if(r.st==='done'){r.slaPct=100;r.log.push({t:'08-08 17:45',m:'처리 완료 · 만족도 평가 요청 발송'});}
  logAudit('민원 상태 변경',`${id} → ${RSTATUS[r.st]}`);
  renderSideNav(); renderPage();
  const _tab=(state.detail.stack[state.detail.stack.length-1]||{}).tab||0;
  popDetail(); openReqAdmin(id); setDetailTab(_tab);   // 상세 패널 갱신 · 탭 유지
  toast(`${id} → ${RSTATUS[r.st]}`);
}


/* ══════════════════════════════════════════════════════════════════
   SCR-06 정비 작업 관리 (FR-MNT-01·02·04·05·06 + 협력사 성과)
   ══════════════════════════════════════════════════════════════════ */
export function pgWork(){
  const w=WORKORDERS.find(x=>x.id===state.woSel)||WORKORDERS[0];
  const doneN=w.chk.filter(c=>c.r).length;
  return pgHead('work','작업 지시 생성 · 체크리스트 · 완료 보고 · 설비 이력 · 협력사 성과',
    `<span class="seg">${[['list','작업 목록'],['partner','협력사 성과']].map(([k,n])=>
      `<button class="${state.woTab===k?'on':''}" onclick="state.woTab='${k}';renderPage()">${n}</button>`).join('')}</span>
     <button class="btn pri sm" onclick="openWoNew({})">＋ 작업 지시</button>`)+
  (state.woTab==='partner'?pgPartnerPerf():`
  <div class="kpiRow" style="grid-template-columns:repeat(5,1fr)">
    ${Object.entries(WSTATUS).map(([k,nm])=>{
      const n=WORKORDERS.filter(x=>x.st===k).length;
      return `<div class="kpi ${k==='progress'?'info':k==='approved'?'ok':k==='hold'?'danger':''}">
        <div class="kl2">${nm}</div><div class="kv2 num">${n}<small>건</small></div></div>`;}).join('')}
  </div>
  <div class="g21">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🔧</span>작업 목록</span><span class="cx">우선순위 · 기한 순</span></div>
      <div class="tblWrap" style="max-height:480px">
      <table class="tbl"><thead><tr><th>작업</th><th>대상</th><th>담당</th><th>기한</th><th>상태</th></tr></thead><tbody>
      ${WORKORDERS.map(x=>`<tr class="clk ${x.id===state.woSel?'sel':''}" onclick="state.woSel='${x.id}';renderPage()">
        <td class="str">${x.pri==='긴급'?'<span class="sevDot sev1"></span>':x.pri==='높음'?'<span class="sevDot sev2"></span>':''}${x.nm}
          <div style="font-size:10px;color:var(--muted2);margin-top:1px">${x.id} · ${x.trg} ${x.src}</div></td>
        <td style="font-size:11px">${x.sp}<div style="color:var(--muted)">${x.eq}</div></td>
        <td style="font-size:11px">${x.assignee}</td>
        <td class="num" style="font-size:11px;color:var(--muted)">${x.due}</td>
        <td><span class="pill ${x.st==='approved'?'ok':x.st==='progress'?'info':x.st==='hold'?'danger':x.st==='reported'?'purple':'mute'}">${WSTATUS[x.st]}</span></td>
      </tr>`).join('')}
      </tbody></table></div></div>
    <div>
      <div class="card mb12"><div class="ch"><span class="ct"><span class="ci">✅</span>체크리스트</span>
        <span class="cx">${w.ver} · ${doneN}/${w.chk.length}</span></div>
        <div class="cb">
          <div style="font-size:12.5px;font-weight:800;margin-bottom:3px">${w.nm}</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:11px">${w.sp} · ${w.eq} · ${w.assignee}</div>
          ${w.chk.map((c,i)=>`<div class="chk ${c.r==='ok'?'ok':c.r==='bad'?'bad':''}">
            <span class="cbx">${c.r==='ok'?'✓':c.r==='bad'?'!':''}</span>
            <span class="cn2">${c.n}</span>
            <span style="display:flex;gap:3px">
              <button class="btn sm" style="padding:3px 8px;${c.r==='ok'?'background:var(--ok);border-color:var(--ok);color:#fff':''}"
                onclick="setChk('${w.id}',${i},'ok')">정상</button>
              <button class="btn sm" style="padding:3px 8px;${c.r==='bad'?'background:var(--danger);border-color:var(--danger);color:#fff':''}"
                onclick="setChk('${w.id}',${i},'bad')">이상</button></span>
          </div>`).join('')}
          ${w.chk.some(c=>c.r==='bad')?`<div class="empty" style="text-align:left;border-color:#f5c2c2;background:var(--danger-soft);color:var(--danger);margin-top:8px">
            이상 판정 항목이 있습니다 — 사진 첨부가 필수이며, 완료 시 후속 작업 생성이 제안됩니다.</div>`:''}
          ${w.dur?`<div class="kv" style="margin-top:10px"><span class="k">소요 시간</span><span class="v num">${w.dur}분</span></div>`:''}
          <div style="display:flex;gap:6px;margin-top:11px">
            <button class="btn" style="flex:1" onclick="woHold('${w.id}')">보완 요청</button>
            <button class="btn pri" style="flex:1" onclick="woApprove('${w.id}')">완료 승인</button></div>
        </div></div>
      <div class="card"><div class="ch"><span class="ct"><span class="ci">📜</span>설비 이력</span><span class="cx">${w.eq} · FR-MNT-05</span></div>
        <div class="cb"><div class="tl">
          ${WORKORDERS.filter(x=>x.eq===w.eq).map(x=>`<div class="tlItem ${x.st==='approved'?'g':'i'}">
            <div class="tt">${x.due.slice(0,5)} · ${x.id}</div><div class="tm">${x.nm} <b>${WSTATUS[x.st]}</b></div></div>`).join('')}
          ${ALARMS.filter(a=>a.eq===w.eq).map(a=>`<div class="tlItem ${a.sev<=2?'r':'w'}">
            <div class="tt">${a.at}</div><div class="tm">알람 · ${a.type}</div></div>`).join('')}</div>
        <div class="kv" style="margin-top:10px"><span class="k">누적 정비</span><span class="v num">${WORKORDERS.filter(x=>x.eq===w.eq).length}회</span></div>
        <div class="kv"><span class="k">동종 설비 평균 대비</span><span class="v" style="color:var(--danger)">고장 빈도 +64%</span></div>
        </div></div>
    </div>
  </div>`);
}

export function pgPartnerPerf(){
  const mxH=Math.max(...WORKTIME.map(w=>w.h));
  return `
  <div class="g21">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🤝</span>협력사별 작업 성과</span>
      <span class="cx">최근 90일 · PRD 9. 정비 작업 화면</span></div>
      <table class="tbl"><thead><tr><th>협력사</th><th>분야</th><th class="n">작업</th><th class="n">기한 준수</th>
        <th class="n">평균 소요</th><th class="n">재작업</th><th>등급</th></tr></thead><tbody>
      ${PARTNERS.map(p=>`<tr>
        <td class="str">${p.nm}</td><td style="font-size:11px">${p.cat}</td>
        <td class="n">${p.cnt}</td>
        <td class="n" style="color:${p.onTime>=90?'var(--ok)':p.onTime>=85?'var(--warn)':'var(--danger)'}">${fx(p.onTime)}%</td>
        <td class="n">${fx(p.avgH)}h</td>
        <td class="n" style="color:${p.rework?'var(--danger)':'var(--ok)'}">${p.rework}</td>
        <td><span class="pill ${p.score.startsWith('A')?'ok':'warn'}">${p.score}</span></td></tr>`).join('')}
      </tbody></table>
      <div class="mnote" style="padding:11px 14px">기한 준수율 85% 미만 또는 재작업 3건 이상은 <b>계약 갱신 검토 대상</b>으로 분류됩니다.</div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">⏱</span>분야별 작업 시간</span>
      <span class="cx">누적 시간 · 건수</span></div>
      <div class="cb">${WORKTIME.map(w=>`
        <div class="costBar"><span style="color:var(--muted);font-weight:600">${w.k}</span>
          <span class="cb2"><i style="width:${(w.h/mxH*100).toFixed(0)}%;background:#0877ed"></i></span>
          <span class="cvv">${fx(w.h)}h<div style="font-size:9.5px;color:var(--muted2);font-weight:500">${w.n}건</div></span></div>`).join('')}
        <div class="kv" style="margin-top:12px;border-top:2px solid var(--line);padding-top:10px">
          <span class="k">총 작업 시간</span><span class="v num">${fx(WORKTIME.reduce((a,w)=>a+w.h,0))} h</span></div>
        <div class="kv"><span class="k">총 작업 건수</span><span class="v num">${WORKTIME.reduce((a,w)=>a+w.n,0)} 건</span></div>
        <div class="kv"><span class="k">건당 평균</span><span class="v num">${fx(WORKTIME.reduce((a,w)=>a+w.h,0)/WORKTIME.reduce((a,w)=>a+w.n,0))} h</span></div>
      </div></div>
  </div>`;
}

export function setChk(wid,i,v){
  const w=WORKORDERS.find(x=>x.id===wid); if(!w)return;
  w.chk[i].r=w.chk[i].r===v?null:v; renderPage();
}

export function woHold(id){
  const w=WORKORDERS.find(x=>x.id===id); if(!w)return;
  w.st='hold'; logAudit('작업 보완 요청',id); renderPage();
  toast(`${id} 보완 요청 — 반려 사유가 이력에 기록됩니다`);
}

export function woApprove(id){
  const w=WORKORDERS.find(x=>x.id===id); if(!w)return;
  if(w.chk.some(c=>!c.r)){toast('미점검 항목이 있어 완료 처리할 수 없습니다 (E-INPUT-001)');return;}
  w.st='approved'; logAudit('작업 완료 승인',id); renderPage();
  toast(`${id} 완료 승인 · 설비 이력 반영 · 원인 이벤트 상태 갱신 제안`);
}

export function openWoNew(pre){
  state.woDraft=Object.assign({trg:'수동',src:'관리자 등록',nm:'',sp:'',eq:'',pri:'보통',
    assignee:'김성호',due:'08-09 18:00',ver:'CL-EHP-v5'},pre||{});
  drawWoNew();
}

export function drawWoNew(err){
  const CL={'CL-EHP-v5':['프리필터 오염도 확인','실외기 팬 회전 이상음','냉매 압력 측정','소비전력 재측정'],
            'CL-PIPE-v3':['급수 밸브 차단 확인','누수 지점 육안 확인','배관 이음부 토크 점검','주변 절연 상태 확인'],
            'CL-AC-v4':['실내기 필터 상태','설정온도·풍량 확인','일사 차단 상태','냉매 누설 점검'],
            'CL-LED-v1':['안정기 교체','점등 시험','배선 절연 확인'],
            'CL-EV-v6':['가이드레일 정렬','로프 장력','권상기 베어링 소음','제동 시험']};
  dlgOpen('작업 지시 생성','FR-MNT-02 · 트리거 → 대상 → 배정 → 체크리스트',`
    <div class="g2" style="gap:14px">
      <div>
        <div class="fld"><label>생성 트리거</label>
          <div class="chipSel">${['알람','민원','점검','수동'].map(t=>
            `<button class="${state.woDraft.trg===t?'on':''}" onclick="state.woDraft.trg='${t}';drawWoNew()">${t}</button>`).join('')}</div>
          <div class="hint">원인 이벤트: <b>${state.woDraft.src}</b> — 양방향 링크가 생성됩니다</div></div>
        <div class="fld ${err==='nm'?'err':''}"><label>작업명 <span class="req">*</span></label>
          <input value="${state.woDraft.nm}" placeholder="예: EHP 실외기 필터·팬 점검" oninput="state.woDraft.nm=this.value">
          ${err==='nm'?'<div class="emsg">작업명을 입력해 주세요 (E-INPUT-001)</div>':''}</div>
        <div class="fld ${err==='sp'?'err':''}"><label>작업 위치 <span class="req">*</span></label>
          <input value="${state.woDraft.sp}" placeholder="예: ${COMMON.util} 또는 ${MODULE.id}" oninput="state.woDraft.sp=this.value">
          ${err==='sp'?'<div class="emsg">위치를 입력해 주세요</div>':''}</div>
        <div class="fld"><label>대상 설비</label>
          <input value="${state.woDraft.eq}" placeholder="예: EHP-2-03" oninput="state.woDraft.eq=this.value"></div>
      </div>
      <div>
        <div class="fld"><label>우선순위</label>
          <div class="chipSel">${['긴급','높음','보통','낮음'].map(p=>
            `<button class="${state.woDraft.pri===p?'on':''}" onclick="state.woDraft.pri='${p}';drawWoNew()">${p}</button>`).join('')}</div>
          <div class="hint">원인 이벤트의 심각도에서 상속됩니다</div></div>
        <div class="fld"><label>담당자 · 협력사</label>
          <select onchange="state.woDraft.assignee=this.value">
            ${['김성호','박지훈','이재훈','협력사 성진엘리베이터','협력사 한빛전기','협력사 대영설비','협력사 우성공조'].map(a=>
              `<option ${state.woDraft.assignee===a?'selected':''}>${a}</option>`).join('')}</select>
          <div class="hint">협력사 배정 시 <b>작업 범위로 접근 권한이 제한</b>되어 발급됩니다</div></div>
        <div class="fld"><label>완료 기한</label>
          <input value="${state.woDraft.due}" oninput="state.woDraft.due=this.value"></div>
        <div class="fld"><label>체크리스트 버전</label>
          <select onchange="state.woDraft.ver=this.value;drawWoNew()">
            ${Object.keys(CL).map(v=>`<option ${state.woDraft.ver===v?'selected':''}>${v}</option>`).join('')}</select>
          <div class="hint">${(CL[state.woDraft.ver]||[]).length}개 항목 · 진행 중 작업은 생성 시점 버전을 유지합니다</div></div>
      </div>
    </div>
    <div class="sec" style="margin-top:6px">적용 체크리스트</div>
    ${(CL[state.woDraft.ver]||[]).map(n=>`<div class="chk"><span class="cbx"></span><span class="cn2">${n}</span>
      <span class="cs" style="color:var(--muted2)">미점검</span></div>`).join('')}`,
    `<button class="btn" onclick="closeAll()">취소</button>
     <button class="btn pri" onclick="submitWo()">작업 지시 생성</button>`,780);
  window.__CL=CL;
}

export function submitWo(){
  if(!state.woDraft.nm.trim())return drawWoNew('nm');
  if(!state.woDraft.sp.trim())return drawWoNew('sp');
  const id='WO-2608-0'+(19+WORKORDERS.filter(w=>w.id.startsWith('WO-2608')).length-9);
  WORKORDERS.unshift({id,trg:state.woDraft.trg,src:state.woDraft.src,nm:state.woDraft.nm,sp:state.woDraft.sp,eq:state.woDraft.eq||'—',
    pri:state.woDraft.pri,assignee:state.woDraft.assignee,due:state.woDraft.due,st:'planned',ver:state.woDraft.ver,dur:null,
    chk:(window.__CL[state.woDraft.ver]||[]).map(n=>({n,r:null}))});
  state.woSel=id; logAudit('작업 지시 생성',`${id} (${state.woDraft.sp})`);
  closeAll(); state.woTab='list'; renderSideNav(); renderPage();
  toast(`${id} 생성 · ${state.woDraft.assignee} 배정 알림 발송 · 작업 캘린더 반영`);
}


/* ══════════ SCR-08 에너지·환경 ══════════ */
export function pgEnergy8(){
  const anom=UNITS.filter(u=>u.occ&&u.kwh>125).slice(0,6);
  const avg=UNITS.filter(u=>u.occ).reduce((a,u)=>a+u.kwh,0)/UNITS.filter(u=>u.occ).length;
  return pgHead('energy8','계층 집계 · 이상치 탐지 · 생활 환경 데이터 · 위험 구역',
    `<span class="seg"><button class="on">이번 달</button><button onclick="toast('기간 필터 — 데모에서는 이번 달만 제공')">지난 달</button></span>`)+`
  <div class="kpiRow" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi info"><div class="kl2">단지 전력 <span class="srcb meas">계측</span></div>
      <div class="kv2 num">${won(ENG_TREND.reduce((a,e)=>a+ +e.elec,0))}<small>kWh</small></div>
      <div class="ks">30일 누적 · 전월 대비 <b class="up">▲ 8.4%</b></div></div>
    <div class="kpi"><div class="kl2">개체 평균</div><div class="kv2 num">${fx(avg)}<small>kWh</small></div><div class="ks">동일 모듈 타입 기준</div></div>
    <div class="kpi warn"><div class="kl2">이상치 개체 <span class="srcb calc">±2σ</span></div>
      <div class="kv2 num">${anom.length}<small>기</small></div><div class="ks">공실 제외 · 판정 보류 2</div></div>
    <div class="kpi danger"><div class="kl2">환경 위험 알람</div>
      <div class="kv2 num">${ALARMS.filter(a=>['누수 감지','결로 위험','CO₂ 농도 초과','미세먼지 농도 초과'].includes(a.type)&&a.st!=='done').length}<small>건</small></div>
      <div class="ks">누수 1 · 공기질 1 · 결로 1</div></div>
  </div>
  <div class="g21 mb12">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">📈</span>에너지원별 30일 추이</span><span class="cx">전력 · 난방 · 수도</span></div>
      <div class="cb">${svgMulti([{v:ENG_TREND.map(e=>+e.elec),c:'#0877ed'},{v:ENG_TREND.map(e=>+e.heat*6),c:'#e08a12'},
                    {v:ENG_TREND.map(e=>+e.water*18),c:'#0f9b9b'}],640,150)}
        <div style="display:flex;gap:16px;justify-content:center;margin-top:9px;font-size:10.5px;color:var(--muted)">
          <span><i style="display:inline-block;width:10px;height:2px;background:#0877ed;vertical-align:middle;margin-right:5px"></i>전력 kWh</span>
          <span><i style="display:inline-block;width:10px;height:2px;background:#e08a12;vertical-align:middle;margin-right:5px"></i>난방 (×6)</span>
          <span><i style="display:inline-block;width:10px;height:2px;background:#0f9b9b;vertical-align:middle;margin-right:5px"></i>수도 (×18)</span></div>
        <div class="empty" style="text-align:left;margin-top:11px;font-size:10.5px">
          검침 누락 구간은 <b>보간하지 않고 결측으로 표시</b>합니다. 수집 지연 시 관리자 알림이 생성됩니다(E-COMM-002).</div>
      </div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">⚠</span>이상치 개체</span><span class="cx">FR-ENG-02</span></div>
      <div class="cb" style="max-height:330px;overflow-y:auto">
        ${anom.map(u=>{const dev=((u.kwh-avg)/avg*100);
          return `<div class="kv"><span class="k"><b style="color:var(--ink)">${u.id}</b>
            <small>${u.typeNm} · 그룹 평균 ${fx(avg)}kWh 대비</small></span>
            <span class="v"><span style="color:var(--danger)">+${fx(dev)}%</span>
            <div style="font-size:10.5px;color:var(--muted);font-weight:500">${fx(u.kwh)} kWh</div></span></div>`;}).join('')}
        <div style="font-size:10.5px;color:var(--muted2);margin-top:10px;line-height:1.6">
          표본이 적은 그룹은 <b>판정 보류</b>, 공실·입주 전환 급변은 제외합니다.</div>
      </div></div>
  </div>
  <div class="g2">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🌡</span>생활 환경 데이터</span><span class="cx">FR-ENG-03 · 세대 평균</span></div>
      <table class="tbl"><thead><tr><th>항목</th><th class="n">현재</th><th>권장 범위</th><th>상태</th></tr></thead><tbody>
        <tr><td class="str">실내 온도</td><td class="n">28.6 ℃</td><td>18 ~ 26 ℃</td><td><span class="pill warn">주의</span></td></tr>
        <tr><td class="str">실내 습도</td><td class="n">52 %</td><td>40 ~ 60 %</td><td><span class="pill ok">양호</span></td></tr>
        <tr><td class="str">CO₂</td><td class="n">784 ppm</td><td>≤ 800 ppm</td><td><span class="pill ok">양호</span></td></tr>
        <tr><td class="str">PM2.5</td><td class="n">6.2 ㎍/㎥</td><td>≤ 35 ㎍/㎥</td><td><span class="pill ok">양호</span></td></tr>
        <!-- TVOC 는 단위 미확정 (SED TEL 6) — 숫자를 쓰지 않고 등급만 표기한다 -->
        <tr><td class="str">TVOC</td><td class="n">좋음</td><td>단위 확정 대기</td><td><span class="pill ok">양호</span></td></tr>
        <tr><td class="str">누수 감지</td><td class="n">1 건</td><td>0 건</td><td><span class="pill danger">긴급</span></td></tr>
      </tbody></table></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🗺</span>위험 구역</span><span class="cx">FR-ENG-04</span></div>
      <div class="cb">${ALARMS.filter(a=>['누수 감지','결로 위험','CO₂ 농도 초과','미세먼지 농도 초과','실내 온도 상한 초과'].includes(a.type)).slice(0,6).map(a=>`
          <div class="kv"><span class="k"><span class="sevDot sev${a.sev}"></span><b style="color:var(--ink)">${a.type}</b>
            <small>${a.loc}</small></span>
            <span class="v"><span class="pill ${a.st==='done'?'ok':SEV[a.sev].c}">${ASTATUS[a.st]}</span></span></div>`).join('')}
        <div class="empty" style="text-align:left;margin-top:11px;font-size:10.5px">
          단일 센서 순간값 오탐을 줄이기 위해 <b>지속 시간 + 복수 조건</b>을 적용합니다.
          단, <b>누수 감지는 예외적으로 즉시 알람</b>을 생성합니다.</div>
      </div></div>
  </div>`;
}


/* ══════════ SCR-09 리포트·분석 (+ 비용·작업시간) ══════════ */
export function pgReport(){
  const totCost=COSTS.reduce((a,c)=>a+c.v,0);
  return pgHead('report','월간 운영 리포트 · KPI 추세 · 드릴다운 · 비용·작업시간 분석',
    `<button class="btn sm" onclick="toast('내보내기(PDF·Excel)는 데모 범위 밖입니다 — FR-RPT-04')">내보내기</button>
     <button class="btn pri sm" onclick="openReport()">7월 리포트 열기</button>`)+`
  <div class="card mb12"><div class="ch"><span class="ct"><span class="ci">📊</span>KPI 추세</span>
    <span class="cx">최근 7개월 · 급변 구간 강조 · FR-RPT-03</span></div>
    <div class="cb"><div class="g3" style="gap:11px">
      ${KPIS.map(k=>{const good=k.dir==='up'?k.cur>=k.prev:k.cur<=k.prev;
        const chg=((k.cur-k.prev)/k.prev*100), jump=Math.abs(chg)>=8;
        return `<div class="mBox" style="padding:12px 13px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <span class="ml" style="font-weight:600">${k.nm}</span>
            ${jump?'<span class="pill warn" style="font-size:9px">급변</span>':''}</div>
          <div class="mv num" style="color:${good?'var(--ok)':'var(--danger)'}">${fx(k.cur,1)}<small>${k.unit}</small></div>
          <div class="mn">전월 ${fx(k.prev,1)} · 목표 ${k.target}</div>
          ${svgArea(k.series,240,38,good?'#1a9c6a':'#d64545')}</div>`;}).join('')}
    </div></div></div>
  <div class="g2 mb12">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">💰</span>비용 분석</span>
      <span class="cx">이번 달 · IF-ERP 연계 시 실적 대체</span></div>
      <div class="cb" style="display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center">
        ${donut(COSTS.map(c=>({v:c.v,c:c.c})),140,44)}
        <div style="width:100%">${COSTS.map(c=>`
          <div class="kv"><span class="k"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${c.c};margin-right:7px"></i>${c.k}</span>
            <span class="v num">${won(Math.round(c.v/10000))}만원</span></div>`).join('')}
          <div class="kv" style="border-top:2px solid var(--line);padding-top:9px;margin-top:5px">
            <span class="k"><b style="color:var(--ink)">합계</b></span>
            <span class="v num">${won(Math.round(totCost/10000))}만원</span></div></div>
      </div>
      <div class="mnote">개체당 <b>${won(Math.round(totCost/COMPLEX.units/1000))}천원</b> · 전월 대비 <b style="color:var(--danger)">+6.8%</b>
        · <span style="color:var(--purple)">IF-ERP 미연계로 추정 배분값입니다</span></div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🔍</span>드릴다운 분석</span><span class="cx">FR-RPT-02</span></div>
      <div class="cb">
        <div style="display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap">
          <span class="pill info">기간 · 2026-08</span><span class="pill info">모듈 타입 · ${typeNmOf(state.mapType)}</span>
          <span class="pill mute">개체 · 전체</span><span class="pill mute">설비 유형 · 전체</span></div>
        <table class="tbl"><thead><tr><th>모듈 타입</th><th class="n">개체</th><th class="n">알람</th><th class="n">민원</th>
          <th class="n">작업</th><th class="n">전력</th><th>등급</th></tr></thead><tbody>
        ${MODULE_TYPES.map(t=>`<tr class="clk" onclick="state.mapType='${t.id}';goPage('map')">
          <td class="str">${t.nm}</td><td class="n">${t.count}</td><td class="n">${t.al}</td>
          <td class="n">${t.req}</td><td class="n">${t.wo}</td><td class="n">${fx(t.eng)}</td>
          <td><span class="pill" style="background:${t.c}1a;color:${t.c};border-color:${t.c}4d">${t.grade}</span></td></tr>`).join('')}
        <tr style="background:var(--panel2)"><td class="str">합계</td>
          <td class="n">${COMPLEX.units}</td><td class="n">${MODULE_TYPES.reduce((a,t)=>a+t.al,0)}</td>
          <td class="n">${MODULE_TYPES.reduce((a,t)=>a+t.req,0)}</td><td class="n">${MODULE_TYPES.reduce((a,t)=>a+t.wo,0)}</td>
          <td class="n">${fx(MODULE_TYPES.reduce((a,t)=>a+t.eng,0))}</td><td>—</td></tr>
        </tbody></table></div></div>
  </div>
  <div class="g2">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🥧</span>민원 유형 분포</span><span class="cx">이번 달</span></div>
      <div class="cb" style="display:grid;place-items:center">
        ${(()=>{const by={};REQUESTS.forEach(r=>by[r.cat]=(by[r.cat]||0)+1);
          const cols={'설비':'#0877ed','환경':'#e08a12','시설':'#6b57d6','기타':'#96a1b0'};
          const segs=Object.entries(by).map(([k,v])=>({v,c:cols[k]||'#96a1b0',k}));
          return donut(segs,150,46)+`<div style="margin-top:12px;width:100%">${segs.map(s=>
            `<div class="kv"><span class="k"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${s.c};margin-right:7px"></i>${s.k}</span>
             <span class="v num">${s.v}건</span></div>`).join('')}</div>`;})()}
      </div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">⏱</span>분야별 작업 시간</span><span class="cx">최근 90일</span></div>
      <div class="cb">${(()=>{const mxH=Math.max(...WORKTIME.map(w=>w.h));
        return WORKTIME.map(w=>`<div class="costBar"><span style="color:var(--muted);font-weight:600">${w.k}</span>
          <span class="cb2"><i style="width:${(w.h/mxH*100).toFixed(0)}%;background:#6b57d6"></i></span>
          <span class="cvv">${fx(w.h)}h<div style="font-size:9.5px;color:var(--muted2);font-weight:500">${w.n}건</div></span></div>`).join('');})()}
        <button class="btn" style="width:100%;margin-top:11px" onclick="state.woTab='partner';goPage('work')">협력사 성과 보기 ›</button>
      </div></div>
  </div>`;
}


/* ══════════ SCR-10 예측·권고 (승인 → 작업지시 자동 생성) ══════════ */
export function pgRec(){
  return pgHead('rec','환경 리스크 예측 · 운전 최적화 · 업무 최적화 권고 · 승인 반영 연계',
    `<span class="pill purple">승인 대기 ${RECS.filter(r=>r.st==='pending').length}건</span>`)+`
  <div class="g21 mb12">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">✦</span>권고안</span>
      <span class="cx">모든 권고는 운영자 승인 후에만 반영됩니다</span></div>
      <div class="cb">${RECS.map(r=>`
        <div class="recCard ${r.st}">
          <div class="recHead"><span class="rn4">${r.nm}</span>
            <span style="display:flex;gap:6px;align-items:center">
              <span class="pill ${r.type==='운전'?'info':r.type==='정비'?'purple':r.type==='설계'?'warn':'mute'}">${r.type}</span>
              ${/* 설계 권고는 공장 생산 사양 변경이라 반영 시점을 함께 못박는다 */''}
              ${r.target?`<span class="pill ${r.target==='즉시 반영'?'ok':'warn'}">${r.target}</span>`:''}
              <span class="pill ${r.st==='approved'?'ok':r.st==='rejected'?'mute':'warn'}">${r.st==='approved'?'승인':r.st==='rejected'?'반려':'검토 대기'}</span></span></div>
          <div class="recBody">${r.body}</div>
          <div class="recEff">${r.eff.map(e=>`<div><div class="rel">${e.l}</div><div class="rev">${e.v}</div></div>`).join('')}</div>
          <div style="font-size:10.5px;color:var(--muted);margin-bottom:7px;line-height:1.6">
            <b style="color:var(--ink2)">근거</b> · ${r.basis.join(' / ')}<br>
            ${r.cfdCase||r.moduleType?`<b style="color:var(--ink2)">근거 추적</b> ·
              ${r.cfdCase?`CFD 케이스 <b style="font-family:monospace">${r.cfdCase}</b>`:''}
              ${r.cfdCase&&r.moduleType?' · ':''}
              ${r.moduleType?`대상 타입 <b>${typeNmOf(r.moduleType)}</b> <span style="font-family:monospace">${r.moduleType}</span>`:''}<br>`:''}
            <b style="color:var(--warn)">부작용 가능성</b> · ${r.side}</div>
          ${r.applied?`<div class="empty" style="text-align:left;border-color:#b7e6d0;background:var(--ok-soft);margin-bottom:8px;font-size:10.5px">
            <b style="color:var(--ok)">반영 완료</b> · ${r.applied}</div>`:''}
          <div class="recFoot">
            <span class="pill mute" style="font-family:monospace">${r.id}</span>
            <span class="pill mute">${r.fr}</span><span style="flex:1"></span>
            ${r.st==='pending'?`<button class="btn sm" onclick="recSet('${r.id}','rejected')">반려</button>
              <button class="btn blue sm" onclick="recSet('${r.id}','approved')">승인 · 반영</button>`
              :`<button class="btn sm" onclick="recSet('${r.id}','pending')">되돌리기</button>`}
          </div></div>`).join('')}</div></div>
    <div>
      <div class="card mb12"><div class="ch"><span class="ct"><span class="ci">🔮</span>환경 리스크 예측</span><span class="cx">FR-SIM-03</span></div>
        <div class="cb">${RISKS.map(k=>`
          <div style="border:1px solid var(--line);border-radius:var(--r-m);padding:11px 12px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <span style="font-size:12.5px;font-weight:800">${k.nm} <span class="srcb calcwait">산출 예정</span></span>
              <span class="pill" style="background:${k.c}1a;color:${k.c};border-color:${k.c}4d">${k.grade}</span></div>
            <div style="display:flex;align-items:center;gap:9px;margin:8px 0">
              <span class="bar" style="flex:1"><i style="width:${k.score}%;background:${k.c}"></i></span>
              <span class="num" style="font-size:13px;font-weight:800;color:${k.c}">${k.score}</span></div>
            <div style="font-size:11px;color:var(--muted);line-height:1.6">${k.sp} · ${k.why}</div>
            <div style="font-size:11px;color:var(--ink2);margin-top:5px"><b>권고</b> ${k.rec}</div></div>`).join('')}
          <div class="srcNote">온도·습도 계측값 기반, 계산식은 확정 대기</div></div></div>
      <div class="card"><div class="ch"><span class="ct"><span class="ci">🛡</span>제어 가드레일</span><span class="cx">FR-SIM-10</span></div>
        <div class="cb">
          <div class="kv"><span class="k">실내 온도 허용</span><span class="v num">22 ~ 26 ℃</span></div>
          <div class="kv"><span class="k">자동 제어 시간대</span><span class="v num">08:00 ~ 22:00</span></div>
          <div class="kv"><span class="k">대상 설비</span><span class="v">공용부 EHP · AHU</span></div>
          <div class="kv"><span class="k">수동 개입</span><span class="v"><span class="pill ok">항상 가능</span></span></div>
          <div class="empty" style="text-align:left;margin-top:9px;font-size:10.5px">
            범위 밖 명령은 차단되고 <b>E-CTRL-001</b> 긴급 알람이 생성됩니다.
            <span style="color:var(--purple)">자동 제어 실행은 데모 범위 밖</span></div>
        </div></div>
    </div>
  </div>`;
}

export function recSet(id,st){
  const r=RECS.find(x=>x.id===id); if(!r)return;
  r.st=st;
  if(st==='approved'){
    /* FR-SIM-09 승인 권고안 반영 연계 */
    if(r.type==='정비'){
      const wid='WO-2608-0'+(20+WORKORDERS.length-9);
      WORKORDERS.unshift({id:wid,trg:'권고',src:r.id,nm:r.nm,sp:COMMON.util,eq:'EHP-2-03',
        pri:'보통',assignee:'김성호',due:'08-12 18:00',st:'planned',ver:'CL-EHP-v5',dur:null,
        chk:['프리필터 조기 교체','점검 주기 변경 등록','소비전력 재측정'].map(n=>({n,r:null}))});
      r.applied=`작업 지시 <b>${wid}</b> 생성 · 점검 주기 정책 갱신`;
    }else if(r.type==='운전'){
      r.applied='설비 제어 정책 갱신 · 08-09 12:00 선제 운전 예약';
    }else if(r.type==='설계'){
      /* 설계 권고는 작업 지시를 만들지 않는다 — 생산 사양 변경 요청으로 넘어간다 */
      r.applied=`<b>${typeNmOf(r.moduleType)}</b> 생산 사양 변경 요청 등록 · 반영 시점 <b>${r.target}</b> · 근거 <b>${r.cfdCase}</b>`;
    }else{
      r.applied='입주민 공지 예약 · 대상 5세대 · 08-09 09:00 발송';
    }
    logAudit('권고안 승인',`${r.id} ${r.nm}`);
  }else if(st==='rejected'){r.applied=null;logAudit('권고안 반려',r.id);}
  else r.applied=null;
  renderSideNav(); renderPage();
  toast(st==='approved'?`${r.nm} 승인 — ${r.applied.replace(/<[^>]+>/g,'')}`
    :st==='rejected'?`${r.nm} 반려 — 사유가 이력에 기록됩니다`:'검토 대기로 되돌렸습니다');
}


/* ══════════ SCR-13 안전·보안 이벤트 (신설 · PRD 갭) ══════════ */
export function pgSafety(){
  const list=SAFETY.filter(s=>state.safeFilter==='all'||(state.safeFilter==='open'&&s.st!=='done')||(state.safeFilter==='done'&&s.st==='done'));
  const open=SAFETY.filter(s=>s.st!=='done');
  return pgHead('safety','출입 · 화재 · 승강기 · CCTV 이벤트 통합 · PRD KPI「미조치 위험 이벤트」 관리',
    `<span class="seg">${[['all','전체'],['open','미조치'],['done','완료']].map(([k,n])=>
      `<button class="${state.safeFilter===k?'on':''}" onclick="state.safeFilter='${k}';renderPage()">${n}</button>`).join('')}</span>`)+`
  <div class="scopeBanner"><span style="font-size:15px">🛡</span>
    <span>PRD 2.2 KPI <b>「안전 — 미조치 위험 이벤트 수」</b>, 3.1 사용자 <b>「보안·안전 담당자」</b>,
    4.1 모듈2 <b>「보안 이벤트 통합 대시보드」</b>에 근거한 화면이나
    <b>FRD v1.0에 대응 기능이 정의되어 있지 않습니다.</b> v0.7에서 신설했으며 FRD 개정 제안 대상입니다.</span></div>
  <div class="kpiRow" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi ${open.filter(s=>s.sev===1).length?'danger':'ok'}"><div class="kl2">미조치 위험 이벤트 <span class="srcb calc">PRD KPI</span></div>
      <div class="kv2 num">${open.length}<small>건</small></div>
      <div class="ks">긴급 <b class="up">${open.filter(s=>s.sev===1).length}</b> · 목표 0건</div></div>
    <div class="kpi warn"><div class="kl2">기한 임박</div><div class="kv2 num">${open.filter(s=>s.sev<=2).length}<small>건</small></div>
      <div class="ks">대응 기한 4시간 이내</div></div>
    <div class="kpi info"><div class="kl2">CCTV 연동</div><div class="kv2 num">${CCTVS.filter(c=>c.st==='rec').length}<small>/ ${CCTVS.length}</small></div>
      <div class="ks">IF-CCTV · 녹화 중</div></div>
    <div class="kpi ok"><div class="kl2">이번 달 사고</div><div class="kv2 num">0<small>건</small></div><div class="ks">인명·재산 피해 없음</div></div>
  </div>
  <div class="g21">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🛡</span>안전·보안 이벤트</span><span class="cx">${list.length}건</span></div>
      <div class="cb">${list.map(s=>`
        <div class="safeCard ${SAFE_SEV[s.sev].c}">
          <div class="safeHead"><span class="sh2">${s.type}</span>
            <span style="display:flex;gap:6px;align-items:center">
              <span class="pill ${s.sev===1?'danger':s.sev===2?'warn':'info'} dot">${SAFE_SEV[s.sev].nm}</span>
              <span class="pill ${s.st==='done'?'ok':s.st==='acting'?'info':'danger'}">${s.st==='done'?'조치 완료':s.st==='acting'?'조치 중':'미조치'}</span></span></div>
          <div class="safeBody">${s.d}</div>
          <div class="safeMeta">
            <span class="pill mute">${s.loc}</span><span class="pill mute">${s.src}</span>
            <span style="font-size:10.5px;color:var(--muted2)">발생 ${s.at} · 대응기한 ${s.due} · 담당 ${s.owner}</span></div>
          <div style="font-size:11px;color:var(--ink2);margin-top:7px"><b>조치</b> ${s.act}</div>
          <div style="display:flex;gap:6px;margin-top:9px">
            ${s.cctv!=='—'?`<button class="btn sm" onclick="openCctv('${s.cctv}')">📹 영상 확인</button>`:''}
            <button class="btn sm" onclick="openWoNew({trg:'수동',src:'${s.id}',nm:'${s.type} 조치',sp:'${s.loc}'})">작업 지시</button>
            ${s.st!=='done'?`<button class="btn blue sm" onclick="safeNext('${s.id}')">${s.st==='open'?'조치 시작':'조치 완료'}</button>`:''}
          </div></div>`).join('')}</div></div>
    <div>
      <div class="card mb12"><div class="ch"><span class="ct"><span class="ci">📹</span>CCTV</span><span class="cx">IF-CCTV</span></div>
        <div class="cb"><div class="g2" style="gap:8px">${CCTVS.map(c=>`
          <div class="cctv" onclick="openCctv('${c.id}')" style="cursor:pointer">
            <span class="cl">${c.id}</span>
            ${c.st==='rec'?'<span class="crec"><i></i>REC</span>':'<span class="crec" style="color:#5a7a8c">OFF</span>'}
            <span class="cph">📹</span><span class="ct2">${c.nm}</span></div>`).join('')}</div>
          <div class="empty" style="text-align:left;margin-top:10px;font-size:10.5px">
            CCTV 영상은 <b>이벤트 연계 시점만</b> 조회되며 모든 조회는 감사 로그에 기록됩니다 (PRD NF-011·NF-012).</div>
        </div></div>
      <div class="card"><div class="ch"><span class="ct"><span class="ci">📏</span>대응 기준</span><span class="cx">PRD 12.1</span></div>
        <div class="cb">
          <div class="kv"><span class="k"><span class="sevDot sev1"></span>긴급 <small>화재·침수·보안</small></span><span class="v" style="font-size:11px">즉시 호출 + 관리자 통보</span></div>
          <div class="kv"><span class="k"><span class="sevDot sev2"></span>높음</span><span class="v" style="font-size:11px">4시간 내 조치</span></div>
          <div class="kv"><span class="k"><span class="sevDot sev3"></span>보통</span><span class="v" style="font-size:11px">24시간 내 조치</span></div>
          <div class="kv"><span class="k"><span class="sevDot sev4"></span>정보</span><span class="v" style="font-size:11px">기록 · 주간 검토</span></div>
        </div></div>
    </div>
  </div>`;
}

export function safeNext(id){
  const s=SAFETY.find(x=>x.id===id); if(!s)return;
  s.st=s.st==='open'?'acting':'done';
  logAudit('안전 이벤트 상태 변경',`${id} → ${s.st==='done'?'조치 완료':'조치 중'}`);
  renderSideNav(); renderPage();
  toast(`${id} → ${s.st==='done'?'조치 완료':'조치 중'} · 처리자 ${state.loginUser}`);
}

export function openCctv(id){
  const c=CCTVS.find(x=>x.id===id)||{id,nm:'—',st:'off'};
  logAudit('CCTV 영상 조회',`${id} · 이벤트 연계`);
  openDetail({
    title:`📹 ${c.id}`, subtitle:`${c.nm} · IF-CCTV`,
    sections:[{label:'영상 조회', body:`
      <div class="cctv" style="aspect-ratio:16/9;margin-bottom:12px">
        <span class="cl">${c.id}</span>${c.st==='rec'?'<span class="crec"><i></i>REC</span>':''}
        <span class="cph" style="font-size:44px">📹</span>
        <span class="ct2">2026-08-08 02:14:07 ~ 02:16:32</span></div>
      <div class="kv"><span class="k">연계 인터페이스</span><span class="v">IF-CCTV · RTSP</span></div>
      <div class="kv"><span class="k">조회 사유</span><span class="v">안전 이벤트 연계</span></div>
      <div class="kv"><span class="k">조회자</span><span class="v">${state.loginUser} · ${ROLES[state.role].nm}</span></div>
      <div class="empty" style="text-align:left;margin-top:12px;font-size:10.5px">
        영상 스트리밍은 <b>데모 범위 밖</b>입니다. 실 연동 시 이벤트 발생 ±2분 구간만 조회되며,
        조회 이력은 <b>감사 로그</b>에 자동 기록됩니다.</div>`}],
    actions:[{label:'감사 로그 확인 ›',kind:'primary',fn:()=>goPage('audit')}],
  });
}

/* ══════════ SCR-14 감사 로그 (NF-012 · FR-ADM-02) ══════════ */
export function pgAudit(){
  const blocked=AUDIT.filter(a=>a.rs!=='허용').length;
  return pgHead('audit','민감 데이터 접근 · 수정 · 다운로드 이력 · RBAC 차단 기록')+`
  <div class="kpiRow" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi info"><div class="kl2">오늘 기록</div><div class="kv2 num">${AUDIT.length}<small>건</small></div></div>
    <div class="kpi ${blocked?'danger':'ok'}"><div class="kl2">차단</div><div class="kv2 num">${blocked}<small>건</small></div>
      <div class="ks">E-AUTH-001 권한 없음</div></div>
    <div class="kpi ok"><div class="kl2">보존 기간</div><div class="kv2 num">3<small>년</small></div><div class="ks">개인정보 접근 이력</div></div>
    <div class="kpi"><div class="kl2">활성 역할</div><div class="kv2 num">${Object.keys(ROLES).length + 2}<small>종</small></div>
      <div class="ks">보안담당 · 시스템 포함</div></div>
  </div>
  <div class="g21">
    <div class="card"><div class="ch"><span class="ct"><span class="ci">🔐</span>감사 로그</span><span class="cx">시간 역순</span></div>
      <div class="tblWrap" style="max-height:480px">
      <table class="tbl"><thead><tr><th>시각</th><th>사용자</th><th>행위</th><th>대상</th><th>IP</th><th>결과</th></tr></thead><tbody>
      ${AUDIT.map(a=>`<tr class="auditRow">
        <td class="num" style="color:var(--muted)">${a.at}</td>
        <td class="str">${a.u}<div style="font-size:10px;color:var(--muted2);font-weight:400">${a.r}</div></td>
        <td class="aact">${a.act}</td>
        <td style="font-size:11px;color:var(--muted)">${a.tgt}</td>
        <td class="num" style="font-size:10.5px;color:var(--muted2)">${a.ip}</td>
        <td><span class="pill ${a.rs==='허용'?'ok':'danger'}">${a.rs}</span></td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card"><div class="ch"><span class="ct"><span class="ci">👥</span>권한 매트릭스</span><span class="cx">FR-ADM-02</span></div>
      <div class="cb">
        <table class="tbl"><thead><tr><th>역할</th><th>조회 범위</th></tr></thead><tbody>
        ${Object.entries(ROLES).map(([k,r])=>`<tr><td class="str">${r.icon} ${r.nm}</td>
          <td style="font-size:11px;color:var(--muted)">${r.scope}<div style="margin-top:2px">${r.d}</div></td></tr>`).join('')}
        <tr><td class="str">🔒 보안 담당</td><td style="font-size:11px;color:var(--muted)">출입·CCTV·안전 이벤트<div style="margin-top:2px">영상 조회는 이벤트 연계 시점만</div></td></tr>
        </tbody></table>
        <div class="empty" style="text-align:left;margin-top:12px;font-size:10.5px">
          협력사 계정은 <b>작업 배정 기간에만</b> 유효한 범위 권한을 부여받습니다.
          장기 미사용 계정은 자동 잠금 후 관리자 승인으로 해제합니다.
          <span style="color:var(--purple)">계정·권한 편집 UI는 데모 범위 밖 (FR-ADM-02)</span></div>
      </div></div>
  </div>`;
}

export function logAudit(act,tgt){
  AUDIT.unshift({at:'08-08 '+ENVSYS.time.replace('오후 ','1')+':00'.slice(0,3),
    u:state.loginUser,r:ROLES[state.role].nm,act,tgt,ip:'10.20.3.14',rs:'허용'});
  if(AUDIT.length>40)AUDIT.pop();
}


/* ══════════════════════════════════════════════════════════════════
   협력사 · SCR-07 모바일 작업 수행 (FR-MNT-03 · AC-05)
   ══════════════════════════════════════════════════════════════════ */
export function myWos(){return WORKORDERS.filter(w=>w.assignee.includes('성진')||w.assignee==='정우성'||w.st==='progress'||w.st==='reported');}

export function renderPartner(){
  $('phTime').textContent=ENVSYS.time.replace('오후 ','');
  const w=WORKORDERS.find(x=>x.id===state.poWo);
  if(!w){renderPartnerList();return;}
  const done=w.chk.filter(c=>state.poChk[w.id+i2(c)]||c.r).length;
  const allDone=w.chk.every(c=>state.poChk[w.id+i2(c)]||c.r);
  const anyBad=w.chk.some(c=>(state.poChk[w.id+i2(c)]||c.r)==='bad');
  $('phHead').innerHTML=`
    <div style="display:flex;align-items:center;gap:9px;padding-top:8px">
      <button style="color:#fff;font-size:16px" onclick="state.poWo=null;renderPartner()">←</button>
      <div style="flex:1"><div class="ph1">${w.nm}</div>
        <div class="ph2">${w.id} · ${w.sp}</div></div></div>`;
  $('phBody').innerHTML=`
    <div class="offlineBar">📶 오프라인 대비 — 입력 내용은 기기에 임시 저장되며 연결 복구 시 자동 동기화됩니다</div>
    <div class="mCard">
      <div class="mt2">작업 정보</div>
      <div class="kv"><span class="k">대상 설비</span><span class="v">${w.eq}</span></div>
      <div class="kv"><span class="k">우선순위</span><span class="v">${w.pri}</span></div>
      <div class="kv"><span class="k">완료 기한</span><span class="v num">${w.due}</span></div>
      <div class="kv"><span class="k">체크리스트</span><span class="v">${w.ver}</span></div>
      <div class="empty" style="text-align:left;margin-top:9px;font-size:10.5px;border-color:#f5dcae;background:var(--warn-soft);color:#8a5a00">
        <b>⚠ 안전 유의사항</b> · 작업 전 전원 차단 확인, 2인 1조 작업, 개인보호구 착용 필수</div>
    </div>
    <div class="mCard">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px">
        <span class="mt2">체크리스트</span><span class="pill ${allDone?'ok':'mute'}">${done} / ${w.chk.length}</span></div>
      ${w.chk.map((c,i)=>{const v=state.poChk[w.id+i2(c)]||c.r;
        return `<div class="mChk ${v==='ok'?'ok':v==='bad'?'bad':''}">
          <span class="mcn">${c.n}</span>
          <span class="mcb">
            <button class="${v==='ok'?'on':''}" onclick="poSet('${w.id}','${i2(c)}','ok')">✓</button>
            <button class="bad ${v==='bad'?'on':''}" onclick="poSet('${w.id}','${i2(c)}','bad')">!</button></span></div>`;}).join('')}
      ${anyBad?`<div class="mPhoto" onclick="state.poPhoto=Math.min(5,state.poPhoto+1);renderPartner()">
        📷 ${state.poPhoto?`${state.poPhoto}장 첨부됨 · 추가`:'이상 항목 사진 첨부 (필수)'}</div>`:''}
    </div>
    <div class="mCard">
      <div class="mt2">조치 내용</div>
      <textarea style="width:100%;border:1px solid var(--line);border-radius:7px;padding:9px;font-size:12px;
        min-height:70px;margin-top:7px;background:var(--panel2)" placeholder="수행한 조치를 입력하세요"
        oninput="state.poNote=this.value">${state.poNote}</textarea>
      <div class="mPhoto" onclick="state.poPhoto=Math.min(5,state.poPhoto+1);renderPartner()">
        📷 ${state.poPhoto?`완료 사진 ${state.poPhoto}장`:'완료 사진 첨부'}</div>
      <div class="mSign">✍ 서명하여 완료 보고</div>
    </div>`;
  $('phBar').innerHTML=`
    <button class="btn" onclick="toast('임시 저장됨 · 오프라인 큐에 보관')">임시 저장</button>
    <button class="btn pri" onclick="poSubmit('${w.id}')">완료 보고</button>`;
}

export const i2=c=>c.n.slice(0,6);

export function poSet(wid,key,v){
  const k=wid+key; state.poChk[k]=state.poChk[k]===v?null:v; renderPartner();
}

export function poSubmit(wid){
  const w=WORKORDERS.find(x=>x.id===wid); if(!w)return;
  const miss=w.chk.filter(c=>!(state.poChk[w.id+i2(c)]||c.r));
  if(miss.length)return toast(`미점검 항목 ${miss.length}개가 있습니다 — 완료 처리할 수 없습니다 (E-INPUT-001)`);
  const anyBad=w.chk.some(c=>(state.poChk[w.id+i2(c)]||c.r)==='bad');
  if(anyBad&&state.poPhoto===0)return toast('이상 판정 항목은 사진 첨부가 필수입니다');
  if(!state.poNote.trim())return toast('조치 내용을 입력해 주세요 (E-INPUT-001)');
  w.chk.forEach(c=>{const v=state.poChk[w.id+i2(c)]; if(v)c.r=v;});
  w.st='reported'; w.dur=w.dur||Math.round(40+rnd(w.id.length)*70);
  logAudit('작업 완료 보고',`${w.id} · 소요 ${w.dur}분`);
  state.poWo=null; state.poPhoto=0; state.poNote=''; renderPartner();
  toast(`${wid} 완료 보고 · 시설 관리자 승인 대기로 전환되었습니다`);
}

export function renderPartnerList(){
  const list=myWos();
  $('phHead').innerHTML=`<div style="padding-top:8px">
    <div class="ph1">배정 작업</div>
    <div class="ph2">${ROLES.partner.user} · ${list.length}건</div></div>`;
  $('phBody').innerHTML=`
    <div class="offlineBar">📶 연결됨 · 마지막 동기화 ${ENVSYS.time}</div>
    ${list.map(w=>{
      const done=w.chk.filter(c=>state.poChk[w.id+i2(c)]||c.r).length;
      return `<button class="mCard" style="width:100%;text-align:left;display:block" onclick="state.poWo='${w.id}';renderPartner()">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:9px">
          <div><div class="mt2">${w.pri==='긴급'?'🔴 ':w.pri==='높음'?'🟠 ':''}${w.nm}</div>
            <div class="mm">${w.id} · ${w.sp}</div></div>
          <span class="pill ${w.st==='approved'?'ok':w.st==='progress'?'info':w.st==='reported'?'purple':'mute'}">${WSTATUS[w.st]}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px;padding-top:8px;border-top:1px solid #eff3f8">
          <span style="font-size:10.5px;color:var(--muted)">기한 ${w.due}</span>
          <span style="font-size:10.5px;color:var(--muted)">체크 ${done}/${w.chk.length}</span></div>
      </button>`;}).join('')}
    <div class="empty" style="text-align:left;font-size:10.5px;margin-top:4px">
      배정된 작업에 필요한 <b>최소 정보만</b> 표시됩니다. 세대 개인정보·타 작업은 조회할 수 없습니다 (PRD NF-013).</div>`;
  $('phBar').innerHTML=`<button class="btn" onclick="toast('전체 동기화 완료')">🔄 동기화</button>
    <button class="btn pri" onclick="setRole('facility')">데스크톱 전환</button>`;
}


/* 인라인 핸들러가 참조하는 심볼을 window 에 등록 (동작 유지) */
Object.assign(window,{pgDash,pgMap,typeGroupSvg,tgLayer,setType,openUnit,pgAlarm,resetAlarmFilter,openAlarm,alarmNext,openEscalation,escalationBody,pgReq,openReqAdmin,assignReq,reqNext,pgWork,pgPartnerPerf,setChk,woHold,woApprove,openWoNew,drawWoNew,submitWo,pgEnergy8,pgReport,pgRec,recSet,pgSafety,safeNext,openCctv,pgAudit,logAudit,myWos,renderPartner,i2,poSet,poSubmit,renderPartnerList});
