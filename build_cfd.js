/* ══════════════════════════════════════════════════════════════════
   BEES Home v0.9 · build_cfd.js — 존 모델 CFD 근사 사전계산 (로컬 1회 실행)
     실행 :  node build_cfd.js        →  data/cfdCases.json
   ──────────────────────────────────────────────────────────────────
   정밀 유체역학이 아니다. 목적은 "공간별로 온도가 다르게 계산되고
   조작(에어컨·외기)에 반응한다"를 데이터로 증명하는 것이다.
   방법 : 0.5m 격자 정상상태 열수지 + 가우스-자이델 이완 반복.
     T_i = ( Σ_j k·T_j + S_i + UA_i·T_out ) / ( Σ_j k + UA_i )
       k    셀 간 혼합 컨덕턴스 (CFD_ASSUMED.cellMixingWperK)
       S_i  셀 내부 발열/냉방 (W)  ← 기기 thermal · 재실 · 일사 · 에어컨
       UA_i 셀의 외기 손실 계수 (외벽·창호·환기)
   모든 물성은 data/cfdConstants.js 의 가정값이다.
   ══════════════════════════════════════════════════════════════════ */
const fs=require('fs'), path=require('path');
const DIR=__dirname;

(async()=>{
const {GEO,GEO_ZONES}=await import('file://'+path.join(DIR,'data/geometry3d.js').replace(/\\/g,'/'));
const {DEVICES}   =await import('file://'+path.join(DIR,'data/moduleUnit.js').replace(/\\/g,'/'));
const {CFD_ASSUMED:A,CFD_CASES,caseId,caseLabel}
                  =await import('file://'+path.join(DIR,'data/cfdConstants.js').replace(/\\/g,'/'));

const CELL=0.5;                                   // 격자 크기 (m)
const LAYERS=[0.1,0.6,1.1,1.6,2.1,2.6];           // 슬라이스 높이 — 1.1m 포함
const RHO_CP=1200;                                // 공기 ρ·c ≈ 1200 J/m³K
/* 반복 상한은 지시서의 100회로는 Δ0.15℃ 에서 멈춰 수렴하지 못했다.
   수렴 조건(Δ<0.01℃)을 우선하고 상한을 500회로 올렸다. meta 에 기록한다. */
const MAXIT=500, TOL=0.01;

/* ── 1. 격자 생성 (GEO_ZONES 는 cm 좌표 → m 로) ── */
const cells=[]; const zoneCells={};
GEO_ZONES.forEach(Z=>{
  const x0=Z.x0/100, x1=Z.x1/100, z0=Z.z0/100, z1=Z.z1/100;
  zoneCells[Z.id]=[];
  for(let x=x0+CELL/2; x<x1; x+=CELL)
    for(let z=z0+CELL/2; z<z1; z+=CELL)
      LAYERS.forEach(y=>{
        const i=cells.length;
        cells.push({i,sp:Z.id,x:+x.toFixed(3),y,z:+z.toFixed(3)});
        zoneCells[Z.id].push(i);
      });
});
/* 셀 인덱스 조회용 해시 (이웃 탐색) */
const key=(x,y,z)=>`${x.toFixed(2)}|${y.toFixed(2)}|${z.toFixed(2)}`;
const map=new Map(); cells.forEach(c=>map.set(key(c.x,c.y,c.z),c.i));
cells.forEach(c=>{
  c.nb=[];
  [[CELL,0,0],[-CELL,0,0],[0,CELL,0],[0,-CELL,0],[0,0,CELL],[0,0,-CELL]].forEach(([dx,dy,dz])=>{
    const j=map.get(key(c.x+dx,c.y+dy,c.z+dz));
    if(j!==undefined)c.nb.push(j);      // 존 경계를 넘어 인접하면 그대로 연결 (개방부)
  });
});

/* ── 2. 존별 외피 · 체적 ── */
const ENV={x0:-4.49,x1:4.49,z0:-4.56,z1:4.56};    // 실내 외곽 (OBJ 실측, m)
const near=(a,b)=>Math.abs(a-b)<0.30;
const zoneInfo={};
GEO_ZONES.forEach(Z=>{
  const x0=Z.x0/100,x1=Z.x1/100,z0=Z.z0/100,z1=Z.z1/100;
  const w=x1-x0, d=z1-z0, area=w*d, vol=area*A.ceilingHeight;
  /* 외기와 접하는 변 (길이 m) · 서향 여부 */
  const ext=[];
  if(near(x0,ENV.x0))ext.push({len:d,face:'-X'});
  if(near(x1,ENV.x1))ext.push({len:d,face:'+X'});
  if(near(z0,ENV.z0))ext.push({len:w,face:'-Z'});
  if(near(z1,ENV.z1))ext.push({len:w,face:'+Z'});
  const extLen=ext.reduce((a2,e)=>a2+e.len,0);
  const extArea=extLen*A.ceilingHeight;
  const winArea=extArea*A.windowFracOfExtWall;
  const wallArea=extArea-winArea;
  const westLen=ext.filter(e=>e.face===A.westAxis).reduce((a2,e)=>a2+e.len,0);
  const westWin=westLen*A.ceilingHeight*A.windowFracOfExtWall;
  zoneInfo[Z.id]={x0,x1,z0,z1,area,vol,ext,extArea,wallArea,winArea,westWin,
    UA:wallArea*A.wallU + winArea*A.windowU,
    ventUA:vol*A.infiltrationACH/3600*RHO_CP};
});

/* ── 3. 케이스별 계산 ── */
const nearestCell=(sp,p)=>{
  let best=-1,bd=1e9;
  zoneCells[sp].forEach(i=>{const c=cells[i];
    const d=(c.x-p.x)**2+(c.y-p.y)**2+(c.z-p.z)**2;
    if(d<bd){bd=d;best=i;}});
  return best;
};
/* 기기 위치는 OBJ 실측(geometry3d.js 의 device 면 중심)을 쓴다.
   DEVICES[].thermal.pos 는 P2 단계에서 임시 plan 좌표(0~9m)로 만든 값이라
   GEO_ZONES(OBJ 중심 좌표 −4.49~+4.49)와 좌표계가 어긋난다.               */
const DEVPOS=(()=>{
  const acc={};
  GEO.filter(f=>f.dev).forEach(f=>{
    const a=acc[f.dev]=acc[f.dev]||{x:0,y:0,z:0,n:0};
    f.p.forEach(p=>{a.x+=p[0];a.y+=p[1];a.z+=p[2];a.n++;});
  });
  const o={};
  Object.entries(acc).forEach(([k,a])=>o[k]={x:a.x/a.n,y:a.y/a.n,z:a.z/a.n});
  return o;
})();
console.log('OBJ 실측 기기 위치 '+Object.keys(DEVPOS).length+'개 사용: '
  +Object.entries(DEVPOS).map(([k,p])=>`${k}(${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)})`).join(' '));

const out={};
CFD_CASES.forEach(CS=>{
  const Tout=CS.outdoorTemp;
  const acOn={living:CS.ac==='living'||CS.ac==='living+bedroom', bedroom:CS.ac==='living+bedroom'};
  const S=new Float64Array(cells.length);          // 셀 발열 (W)
  const UA=new Float64Array(cells.length);         // 셀 외기 손실 (W/K)

  /* 3-a 기기 발열 — thermal.sensibleW 를 위치에서 가장 가까운 셀에 넣는다.
         에어컨(mode:'sink')은 여기서 제외하고 시나리오 냉방으로만 반영한다. */
  DEVICES.forEach(d=>{
    if(!d.meas.on)return;
    if(d.thermal.mode==='sink')return;
    if(d.thermal.mode==='boundary')return;
    const sp=d.space; if(!zoneCells[sp])return;
    const pos=DEVPOS[d.id]||d.thermal.pos;    // OBJ 실측 우선
    const i=nearestCell(sp,pos);
    if(i<0)return;
    /* 주방 조리 발열은 후드가 포집해 배출하는 몫을 뺀다 */
    const cap=(sp==='kitchen'&&d.thermal.sensibleW>300)?(1-A.hoodCaptureRatio):1;
    S[i]+=d.thermal.sensibleW*cap;
  });

  /* 3-b 재실 발열 — 존 셀에 균등 분배 (주간 기준) */
  GEO_ZONES.forEach(Z=>{
    const n=(A.occupancy[Z.id]||{}).day||0;
    if(!n)return;
    const W=n*A.occupantSensibleW, list=zoneCells[Z.id];
    list.forEach(i=>S[i]+=W/list.length);
  });

  /* 3-c 일사 — 서향 창이 있는 존의 서쪽 1.5m 이내 셀에 분배 */
  GEO_ZONES.forEach(Z=>{
    const zi=zoneInfo[Z.id]; if(zi.westWin<=0)return;
    /* 전동커튼(SEC)이 가동 중인 공간은 일사를 차폐 계수만큼 줄인다 */
    const shade=DEVICES.some(d=>d.space===Z.id&&d.type==='SEC'&&d.meas.on)?A.curtainShadingFactor:1;
    const solarW=zi.westWin*A.solarIrradianceW*A.windowSHGC*shade;
    const edge=A.westAxis==='+X'?zi.x1:zi.x0;
    const band=zoneCells[Z.id].filter(i=>Math.abs(cells[i].x-edge)<=1.5);
    const tgt=band.length?band:zoneCells[Z.id];
    tgt.forEach(i=>S[i]+=solarW/tgt.length);
  });

  /* 3-d 외기 손실 — 외벽 접한 셀에 UA 배분 + 환기는 전 셀 균등 */
  GEO_ZONES.forEach(Z=>{
    const zi=zoneInfo[Z.id], list=zoneCells[Z.id];
    const peri=list.filter(i=>{const c=cells[i];
      return zi.ext.some(e=>
        (e.face==='-X'&&near(c.x-CELL/2,zi.x0))||(e.face==='+X'&&near(c.x+CELL/2,zi.x1))||
        (e.face==='-Z'&&near(c.z-CELL/2,zi.z0))||(e.face==='+Z'&&near(c.z+CELL/2,zi.z1)));});
    const tgt=peri.length?peri:list;
    tgt.forEach(i=>UA[i]+=zi.UA/tgt.length);
    /* 침기(0.5 ACH) + 국소 배기(후드·환기팬, 자재 명세 실측 풍량)
       + 냉방 OFF 케이스는 창 개방 자연환기를 더한다 (가정) */
    const exh=(A.exhaustM3h||{})[Z.id]||0;
    const exhUA=exh/3600*RHO_CP;
    const natUA=(CS.ac==='off')?zi.vol*A.naturalVentACH_acOff/3600*RHO_CP:0;
    list.forEach(i=>UA[i]+=(zi.ventUA+exhUA+natUA)/list.length);
  });

  /* 3-e 에어컨 냉방 — 설정온도(§8 재실 냉방 상한) 초과분만 정격 한도 내에서 제거.
         정격을 고정 흡열로 넣으면 과냉각(영하)이 나오므로 반복 안에서 계산한다. */
  const acCells={};
  A.acUnits.forEach(u=>{
    if(!acOn[u.space])return;
    const dev=DEVICES.find(d=>d.space===u.space&&d.thermal.mode==='sink');
    const pos=(dev&&DEVPOS[dev.id])||(dev?dev.thermal.pos:null)||{x:(zoneInfo[u.space].x0+zoneInfo[u.space].x1)/2,y:2.0,
                                   z:(zoneInfo[u.space].z0+zoneInfo[u.space].z1)/2};
    const list=zoneCells[u.space].filter(i=>{const c=cells[i];
      return (c.x-pos.x)**2+(c.y-pos.y)**2+(c.z-pos.z)**2 <= 2.0**2;});
    acCells[u.space]={cells:list.length?list:zoneCells[u.space], capW:u.capacityKw*1000,
      zone:zoneCells[u.space]};
  });

  /* 3-f 가우스-자이델 이완 반복 */
  const k=A.cellMixingWperK;
  let T=new Float64Array(cells.length).fill(Tout);
  const Sac=new Float64Array(cells.length);
  let it=0, maxd=0;
  for(it=1;it<=MAXIT;it++){
    /* 냉방량 갱신 : 존 평균이 설정온도를 넘는 만큼만, 정격 이내로 */
    Sac.fill(0);
    Object.values(acCells).forEach(u=>{
      const mean=u.zone.reduce((a2,i)=>a2+T[i],0)/u.zone.length;
      const need=Math.max(0,(mean-A.coolingSetpoint))*A.cellMixingWperK*u.zone.length*0.25;
      const q=Math.min(u.capW,need);
      u.cells.forEach(i=>Sac[i]-=q/u.cells.length);
    });
    maxd=0;
    for(let i=0;i<cells.length;i++){
      const c=cells[i];
      let num=S[i]+Sac[i]+UA[i]*Tout, den=UA[i];
      for(const j of c.nb){num+=k*T[j]; den+=k;}
      const nv=den>0?num/den:T[i];
      const d=Math.abs(nv-T[i]); if(d>maxd)maxd=d;
      T[i]=nv;
    }
    if(maxd<TOL)break;
  }

  /* 3-g 저장 */
  const id=caseId(CS);
  const zoneMean={};
  GEO_ZONES.forEach(Z=>{const l=zoneCells[Z.id];
    zoneMean[Z.id]=+(l.reduce((a2,i)=>a2+T[i],0)/l.length).toFixed(2);});
  out[id]={
    grid:[CELL],
    cells:cells.map((c,i)=>({x:c.x,y:c.y,z:c.z,temp:+T[i].toFixed(2)})),
    meta:{ac:CS.ac, outdoorTemp:Tout, label:caseLabel(CS),
      layers:LAYERS, iterations:it, maxDelta:+maxd.toFixed(4),
      zoneMean, lineage:'시뮬', assumed:true,
      tMin:+Math.min(...T).toFixed(2), tMax:+Math.max(...T).toFixed(2)},
  };
  console.log(id.padEnd(28)+`반복 ${String(it).padStart(3)}회 (Δ${maxd.toFixed(4)}℃)  `
    +GEO_ZONES.map(Z=>`${Z.id} ${zoneMean[Z.id]}℃`).join(' · '));
});

const file=path.join(DIR,'data/cfdCases.json');
fs.writeFileSync(file,JSON.stringify(out),'utf8');
console.log('\n케이스 '+Object.keys(out).length+'개 · 셀 '+cells.length+'개/케이스 → data/cfdCases.json ('
  +(fs.statSync(file).size/1024).toFixed(0)+' KB)');
console.log('※ 전 수치는 data/cfdConstants.js 의 가정값 기반 — 계보 「시뮬」 + 「가정」');
})();
