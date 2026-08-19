/* BEES Home v0.9 · render/scene3d.js — 3D 실내 뷰 (외부 라이브러리 없음)
   OBJ 지오메트리를 직접 투영해 인라인 SVG 폴리곤으로 그린다.
   · 회전  : 드래그 (yaw / pitch)      · 확대 : 휠
   · 절단  : 카메라와 중심 사이의 벽·천장을 숨겨 내부가 보이게 한다
   · 선택  : 폴리곤 onclick → 2D 평면도와 동일한 selectRoom / selectSensor
   규칙 §10 에 따라 three.js 등 외부 라이브러리를 쓰지 않는다.          */
import {state} from '../data/state.js';
import {GEO,GEO_ZONES} from '../data/geometry3d.js';
import {$,fx,spaceOf,devicesOf,aqiOf,SPACES} from '../data/module.js';
import {GRADE_E,GRADE_C,GRADE_A,gradeOf} from '../data/const.js';
import {CFD_CASES,caseId,caseLabel} from '../data/cfdConstants.js';

/* ── 모델 범위 · 카메라 기본값 ── */
const B=(()=>{const b={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9,z0:1e9,z1:-1e9};
  GEO.forEach(f=>f.p.forEach(p=>{
    b.x0=Math.min(b.x0,p[0]);b.x1=Math.max(b.x1,p[0]);
    b.y0=Math.min(b.y0,p[1]);b.y1=Math.max(b.y1,p[1]);
    b.z0=Math.min(b.z0,p[2]);b.z1=Math.max(b.z1,p[2]);}));
  return b;})();
const CEN=[(B.x0+B.x1)/2,(B.y0+B.y1)/2,(B.z0+B.z1)/2];
const VIEW={w:520,h:430};
const LIGHT=(()=>{const v=[0.42,0.86,0.30];const l=Math.hypot(...v);return v.map(n=>n/l);})();

/* ── 레이어 색 ── */
const COL={
  floor:'#e7ebf0', wall:'#f2f5f9', ceiling:'#dde4ec', frame:'#cfe0f2',
  door:'#e4d9c6', fix:'#dcc9a8', porch:'#e9edf1', device:'#8fa6bd', other:'#eceff3',
};
const rad=d=>d*Math.PI/180;

/* ── 3D → 2D 투영 ── */
function projector(){
  const v=state.view3d, cy=Math.cos(rad(v.yaw)), sy=Math.sin(rad(v.yaw));
  const cp=Math.cos(rad(v.pitch)), sp=Math.sin(rad(v.pitch));
  const sc=38*v.zoom, D=26;
  const rot=p=>{
    const x=p[0]-CEN[0], y=p[1]-CEN[1], z=p[2]-CEN[2];
    const x1= x*cy - z*sy, z1= x*sy + z*cy;
    const y2= y*cp - z1*sp;
    /* 카메라는 위·앞쪽에 있으므로 (y·sp + z1·cp) 가 클수록 가깝다.
       깊이는 "클수록 멀다"로 쓰이므로 부호를 뒤집는다.
       이 부호를 빼면 정렬·원근이 함께 반전돼 모델이 뒤집혀 보인다.      */
    const z2= -(y*sp + z1*cp);
    return [x1,y2,z2];
  };
  const to2=r=>{const k=D/(D+r[2]);
    return [VIEW.w/2 + r[0]*sc*k + v.panX, VIEW.h/2 - r[1]*sc*k + v.panY];};
  return {rot,to2,
    project:p=>to2(rot(p)),
    depth:p=>rot(p)[2]};
}

/* ── 공간별 색 : 2D 평면도와 같은 지표·등급을 쓴다 ── */
function zoneColor(sp){
  if(state.planTab==='energy')  return gradeOf(GRADE_E,sp.kwh).c;
  if(state.planTab==='comfort') return gradeOf(GRADE_C,sp.env.temp).c;
  if(state.planTab==='air')     return gradeOf(GRADE_A,aqiOf(sp)).c;
  const on=devicesOf(sp.id).filter(d=>d.meas.on).length;
  return on?'#0877ed':'#96a1b0';
}
function zoneLabel(sp){
  if(state.planTab==='energy')  return fx(sp.kwh,2)+' kWh';
  /* 측정원이 없는 공간은 숫자 대신 '센서 없음' — 2D 평면도와 같은 규칙 */
  if(state.planTab==='comfort') return sp.env.temp==null?'센서 없음':fx(sp.env.temp)+'°C';
  if(state.planTab==='air')     {const a=aqiOf(sp);return a==null?'센서 없음':'지수 '+a;}
  const l=devicesOf(sp.id); return l.filter(d=>d.meas.on).length+' / '+l.length;
}

/* ── 렌더 ── */
export function render3D(){
  const sv=$('scene3d'); if(!sv)return;
  const v=state.view3d, P=projector();
    const items=[];

  /* 1) 구조·기기 폴리곤 */
  GEO.forEach(f=>{
    if(!v.layers[f.l] && v.layers[f.l]!==undefined) return;      // 레이어 꺼짐
    if(v.layers[f.l]===undefined && (f.l==='ceiling'||f.l==='porch')) return;
    if(f.l==='jet' && !v.layers.jet) return;
    /* 드래그 중에는 문·창호를 생략해 프레임을 가볍게 한다 (놓으면 복원) */
    if(DRAGGING && (f.l==='door'||f.l==='frame')) return;
    /* 바닥 슬래브는 상부면만 (밑면·측면이 위로 올라오는 것을 막는다) */
    if(f.l==='floor' && f.n[1]<0.5) return;
    /* 단면 보기 : 벽·문·창호·붙박이장을 허리 높이에서 자른다(도리집 방식).
       앞벽이 낮아져 내부가 그대로 보이고 바닥 존도 가려지지 않는다.      */
    let P3=f.p;
    if(v.cutaway && ['wall','frame','door','fix'].includes(f.l)){
      const ymin=Math.min(...f.p.map(p=>p[1]));
      if(ymin>=v.wallCut) return;                       // 잘린 높이보다 위면 생략
      P3=f.p.map(p=>p[1]>v.wallCut?[p[0],v.wallCut,p[2]]:p);
    }
    if(v.cutaway && f.l==='ceiling') return;            // 단면에서는 천장 숨김
    const R=P3.map(P.rot);
    const dep=R.reduce((a,r)=>a+r[2],0)/R.length;
    const pts=R.map(P.to2);
    /* 음영 : 고정 광원 램버트. 법선 방향이 일관되지 않은 메시라 절댓값을 쓴다 */
    const lam=0.72+0.33*Math.abs(f.n[0]*LIGHT[0]+f.n[1]*LIGHT[1]+f.n[2]*LIGHT[2]);
    let base=COL[f.l]||COL.other, op=1, cls='s3f';
    if(f.l==='device'){ base=f.dev&&state.selSensor===f.dev?'#0877ed':COL.device; }
    if(f.l==='jet'){ base='#38a3f5'; op=0.20; cls='s3jet'; }
    const col=shade(base,lam);
    /* 기기 클릭도 2D 평면도와 같은 경로 — 우측 패널 3단으로 진입한다 */
    const click=f.l==='device'&&f.dev&&f.sp
      ? `selectRoom('${f.sp}');selectSensor('${f.dev}')`
      : (f.sp?`selectRoom('${f.sp}')`:'');
    /* tier : 0 바닥 → 1 공간 존 → 2 벽·기기 → 3 라벨.
       면 크기 차이가 커서 깊이 정렬만으로는 존이 바닥에 덮인다.
       욕실 바닥 타일처럼 바닥 높이의 수평면도 tier 0 으로 내린다.      */
    const floorish=f.n[1]>0.5 && Math.max(...f.p.map(p=>p[1]))<0.12;
    items.push({tier:(f.l==='floor'||floorish)?0:2,dep,svg:`<polygon class="${cls}" points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}"
      fill="${col}" fill-opacity="${op}" ${click?`onclick="${click}"`:''}/>`});
  });

  /* 2) 공간 바닥 존 — 클릭 대상이자 지표 색면 */
  GEO_ZONES.forEach(Z=>{
    const sp=spaceOf(Z.id); if(!sp)return;
    const y=0.012, q=[[Z.x0/100,y,Z.z0/100],[Z.x1/100,y,Z.z0/100],[Z.x1/100,y,Z.z1/100],[Z.x0/100,y,Z.z1/100]];
    const R=q.map(P.rot), pts=R.map(P.to2);
    const dep=R.reduce((a,r)=>a+r[2],0)/R.length;
    const c=zoneColor(sp), sel=state.selRoom===Z.id;
    items.push({tier:1,dep,svg:`<polygon class="s3zone ${sel?'sel':''}" points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}"
      fill="${c}" fill-opacity="${sel?0.62:0.46}" stroke="${c}" stroke-width="${sel?2.6:1.4}"
      onclick="selectRoom('${Z.id}')"><title>${sp.nm}</title></polygon>`});
    /* 윤곽선은 최상위에 한 번 더 — 벽에 가리는 공간도 경계·선택이 보이게 */
    items.push({tier:3,dep:dep+1,svg:`<polygon class="s3edge ${sel?'sel':''}" points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}"
      fill="none" stroke="${c}" stroke-width="${sel?3:1.6}" stroke-dasharray="${sel?'':'6 4'}"
      onclick="selectRoom('${Z.id}')"/>`});
    /* 라벨은 존 중심 위 1.1m */
    const lp=P.project([(Z.x0+Z.x1)/200,1.1,(Z.z0+Z.z1)/200]);
    items.push({tier:3,dep,svg:`<g class="s3lbl" onclick="selectRoom('${Z.id}')">
      <text x="${lp[0].toFixed(1)}" y="${lp[1].toFixed(1)}" text-anchor="middle">${sp.nm}</text>
      <text x="${lp[0].toFixed(1)}" y="${(lp[1]+13).toFixed(1)}" text-anchor="middle" class="s3v">${zoneLabel(sp)}</text></g>`});
  });

  /* 2-b) CFD 근사 슬라이스 (선택된 케이스가 있을 때만) */
  const CASE=cfdSliceItems(P,items);

  /* 3) 계층 우선 · 계층 안에서는 화가 알고리즘(먼 것부터) */
  items.sort((a,b)=>a.tier-b.tier || b.dep-a.dep);
  sv.innerHTML=items.map(i=>i.svg).join('');
  cfdLegend(CASE);
  bindDrag(sv);
  const tip=$('planTip');
  if(tip)tip.textContent = state.selRoom
    ? `${spaceOf(state.selRoom).nm} 선택됨 — 좌클릭 선택 · 우클릭 드래그 회전 · 휠 줌 · 가운데 드래그 이동`
    : '좌클릭 선택 · 우클릭 드래그 회전 · 휠 줌 · 가운데 드래그 이동';
  const bar=$('s3dBar'); if(bar)bar.innerHTML=barHtml();
}

/* ══════════ 존 모델 CFD 근사 오버레이 ══════════════════════════════
   build_cfd.js 가 만든 data/cfdCases.json 의 격자를 1.1m 수평 슬라이스로
   반투명 색 사각형 배열로 표시한다. 레이마칭이 아니라 단순 색 격자다.
   전 수치는 가정 상수 기반 — 계보 「시뮬」 + 「가정」.                */
const CFD_SCALE={min:24,max:44};                 // 색상 고정 범위 (케이스 비교용)
/* state.js 가 낡은 캐시로 로드돼 state.cfd 가 없어도 조작바가 깨지지 않게 한다 */
function cfdState(){
  if(!state.cfd)state.cfd={caseId:'',data:null,loading:false,sliceY:1.1};
  return state.cfd;
}
function cfdColor(t){
  const u=Math.max(0,Math.min(1,(t-CFD_SCALE.min)/(CFD_SCALE.max-CFD_SCALE.min)));
  const stops=[[0,[43,108,214]],[0.35,[15,155,155]],[0.6,[224,138,18]],[1,[214,69,69]]];
  let a=stops[0],b=stops[stops.length-1];
  for(let i=0;i<stops.length-1;i++) if(u>=stops[i][0]&&u<=stops[i+1][0]){a=stops[i];b=stops[i+1];break;}
  const f=(u-a[0])/((b[0]-a[0])||1);
  const c=a[1].map((v,i)=>Math.round(v+(b[1][i]-v)*f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
export async function selectCfdCase(id){
  const st=cfdState(); st.caseId=id||'';
  if(!id){render3D();return;}
  if(!state.cfd.data&&!state.cfd.loading){
    state.cfd.loading=true; render3D();
    try{ state.cfd.data=await (await fetch('./data/cfdCases.json')).json(); }
    catch(e){ state.cfd.caseId=''; }
    state.cfd.loading=false;
  }
  render3D();
}
/* 선택된 케이스의 1.1m 슬라이스를 items 에 넣는다 */
function cfdSliceItems(P,items){
  const c=cfdState(); if(!c.caseId||!c.data)return null;
  const CASE=c.data[c.caseId]; if(!CASE)return null;
  const g=(CASE.grid&&CASE.grid[0])||0.5, h=g/2;
  const y=c.sliceY;
  CASE.cells.filter(cell=>Math.abs(cell.y-y)<0.01).forEach(cell=>{
    const q=[[cell.x-h,y,cell.z-h],[cell.x+h,y,cell.z-h],[cell.x+h,y,cell.z+h],[cell.x-h,y,cell.z+h]];
    const R=q.map(P.rot), pts=R.map(P.to2);
    const dep=R.reduce((a,r)=>a+r[2],0)/R.length;
    items.push({tier:1.5,dep,svg:`<polygon class="s3cfd" points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}"
      fill="${cfdColor(cell.temp)}" fill-opacity="0.5"><title>${cell.temp.toFixed(1)}℃ (시뮬·가정)</title></polygon>`});
  });
  return CASE;
}

/* 색 밝기 조절 (#rrggbb × 계수) */
function shade(hex,k){
  const n=parseInt(hex.slice(1),16);
  const r=Math.min(255,Math.round((n>>16)*k)), g=Math.min(255,Math.round(((n>>8)&255)*k)), b=Math.min(255,Math.round((n&255)*k));
  return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}

/* CFD 범례 — 케이스 정보 · 색 스케일 · 계보 배지 */
function cfdLegend(CASE){
  const el=$('cfdLegend'); if(!el)return;
  if(!CASE){el.classList.add('hidden');el.innerHTML='';return;}
  const m=CASE.meta, steps=[24,28,32,36,40,44];
  el.innerHTML=`<span class="cfdT">${m.label}</span>
    <span class="srcb sim">시뮬</span><span class="srcb assume">가정</span>
    <span class="cfdBar">${steps.map(t=>`<i style="background:${cfdColor(t)}" title="${t}℃"></i>`).join('')}</span>
    <span class="cfdSc">${CFD_SCALE.min}℃</span><span class="cfdSc">${CFD_SCALE.max}℃</span>
    <span class="cfdMeta">1.1m 슬라이스 · 격자 ${(CASE.grid&&CASE.grid[0])||0.5}m ·
      공간 평균 ${Object.entries(m.zoneMean).map(([k,v])=>v+'℃').join(' / ')} ·
      반복 ${m.iterations}회</span>`;
  el.classList.remove('hidden');
}

/* ── 레이어 · 시점 조작 바 ── */
const LAYERS=[['frame','창호'],['door','문'],['fix','붙박이장'],['ceiling','천장'],['jet','냉기 흐름'],['porch','현관 포치']];
function barHtml(){
  const v=state.view3d, c=cfdState();
  const opts=CFD_CASES.map(x=>{const id=caseId(x);
    return `<option value="${id}" ${c.caseId===id?'selected':''}>${caseLabel(x)}</option>`;}).join('');
  return `<div class="s3grp">${LAYERS.map(([k,nm])=>
    `<button class="lchip ${v.layers[k]?'on':''}" onclick="toggle3DLayer('${k}')">${nm}</button>`).join('')}
    <button class="lchip ${v.cutaway?'on':''}" onclick="toggle3DCut()">단면 보기</button></div>
   <div class="s3grp s3cfdSel">
     <span class="s3lab">CFD 근사 <span class="srcb sim">시뮬</span><span class="srcb assume">가정</span></span>
     <select onchange="selectCfdCase(this.value)">
       <option value="">표시 안 함</option>${opts}</select>
     ${c.loading?'<span class="s3lab">불러오는 중…</span>':''}
     <span class="s3lab" title="이 표시가 보이면 최신 scene3d.js 가 로드된 것">3D v0.9.1</span></div>
   <div class="s3grp">${[['-30','↺'],['30','↻']].map(([d,i])=>
    `<button class="s3btn" onclick="spin3D(${d})">${i}</button>`).join('')}
    <button class="s3btn" onclick="zoom3D(1.2)">＋</button>
    <button class="s3btn" onclick="zoom3D(0.83)">－</button>
    <button class="s3btn" onclick="reset3D()">시점 초기화</button></div>`;
}
export function toggle3DLayer(k){state.view3d.layers[k]=!state.view3d.layers[k];render3D();}
export function toggle3DCut(){state.view3d.cutaway=!state.view3d.cutaway;render3D();}
export function spin3D(d){state.view3d.yaw=(state.view3d.yaw+d+360)%360;render3D();}
export function zoom3D(k){state.view3d.zoom=Math.max(0.4,Math.min(3.5,state.view3d.zoom*k));render3D();}
export function reset3D(){Object.assign(state.view3d,{yaw:-34,pitch:36,zoom:1,panX:0,panY:0});render3D();}

/* ── 마우스 조작 (한 번만 바인딩) ────────────────────────────────
   좌클릭      선택 (공간 · 기기)
   휠          줌 인 / 아웃
   가운데 드래그 이동(팬)
   우클릭 드래그 회전
   터치는 한 손가락 드래그를 회전으로 본다.                          */
let DRAGGING=false;
function bindDrag(sv){
  if(sv.dataset.bound)return; sv.dataset.bound='1';
  let drag=null;
  const end=()=>{
    drag=null; sv.classList.remove('rotating','panning');
    if(DRAGGING){DRAGGING=false;render3D();}          // 문·창호 복원
  };
  sv.addEventListener('pointerdown',e=>{
    const touch=e.pointerType!=='mouse';
    const mode = e.button===2||(touch&&e.button===0) ? 'rot'
               : e.button===1                        ? 'pan' : null;
    if(!mode)return;                                  // 좌클릭은 선택에 넘긴다
    e.preventDefault();                               // 가운데 버튼 자동 스크롤 차단
    drag={mode,x:e.clientX,y:e.clientY,moved:0,
      yaw:state.view3d.yaw,pitch:state.view3d.pitch,
      panX:state.view3d.panX,panY:state.view3d.panY};
    sv.classList.add(mode==='rot'?'rotating':'panning');
    sv.setPointerCapture(e.pointerId);
  });
  sv.addEventListener('pointermove',e=>{
    if(!drag)return;
    const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    drag.moved=Math.max(drag.moved,Math.abs(dx)+Math.abs(dy));
    if(drag.moved>6)DRAGGING=true;
    if(drag.mode==='rot'){
      state.view3d.yaw=(drag.yaw - dx*0.45+360)%360;
      state.view3d.pitch=Math.max(-8,Math.min(78,drag.pitch + dy*0.35));
    }else{
      /* 화면 픽셀 → viewBox 좌표로 환산해 1:1 로 끌린다 */
      const r=sv.getBoundingClientRect(), k=VIEW.w/(r.width||VIEW.w);
      state.view3d.panX=drag.panX + dx*k;
      state.view3d.panY=drag.panY + dy*k;
    }
    if(!drag.raf){drag.raf=requestAnimationFrame(()=>{drag.raf=0;render3D();});}
  });
  sv.addEventListener('pointerup',end);
  sv.addEventListener('pointercancel',end);
  /* 우클릭 메뉴 · 가운데 버튼 클릭 기본동작 차단 */
  sv.addEventListener('contextmenu',e=>e.preventDefault());
  sv.addEventListener('auxclick',e=>e.preventDefault());
  sv.addEventListener('wheel',e=>{e.preventDefault();zoom3D(e.deltaY<0?1.12:0.89);},{passive:false});
}
