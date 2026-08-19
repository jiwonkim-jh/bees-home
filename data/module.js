/* BEES Home v0.9 · data/module.js — 모듈러 유닛·단지 공간 계층 + 공용 헬퍼
   v0.8 단일 파일에서 분할. 함수 본문 로직은 그대로다.
   MODULE / SPACES / DEVICES 는 data/moduleUnit.js 를 재수출한다
   — v0.8 에 있던 인라인 사본은 이 분할로 사라졌다.                    */
import {DEVICES,MODULE,SPACES} from './moduleUnit.js';
export {MODULE,SPACES,DEVICES};

/* ══════════════════════════════════════════════════════════════════
   BEES HOME · 모듈러 주택 단지 운영 디지털트윈 데모 v0.6
   기준 : 260708 FRD v1.0 / 스마트홈_주택_센서정보_필드_260807
          BEES_Home_기능요구사항체크(데모기준)_260807
   데이터: 시드 고정 의사난수 — 새로고침해도 동일. BMS·DCIM 연계 자리
   ══════════════════════════════════════════════════════════════════ */
export const $=id=>document.getElementById(id);

export const app=$('app');

export const rnd=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};

export const fx=(v,d=1)=>Number(v).toFixed(d);

export const won=v=>Number(v).toLocaleString('ko-KR');

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));


/* ── 기준 시각 (데모 고정) ── */
export const NOW={y:2026,m:8,d:7,dow:'금',hh:17,mm:43};

export const NOWTXT=`${NOW.m}월 ${NOW.d}일 (${NOW.dow})`;

export const TIMETXT=`오후 ${String(NOW.hh-12).padStart(2,'0')}:${String(NOW.mm).padStart(2,'0')}`;


/* 유닛 표시명 · 전용면적 — 전부 MODULE 파생 */
export const MODULE_NM=`${MODULE.nm} ${MODULE.serial}`;

export const MODULE_AREA=+(MODULE.bbox.w*MODULE.bbox.d).toFixed(1);


/* ══════════ 1. 상단 헤더 · 환경/시스템 (센서필드 §1) ══════════ */
export const ENVSYS={ outTemp:34.0, pm10:8, pm10Grade:'좋음', unit:MODULE.id,
  date:NOWTXT, time:TIMETXT, wifi:'연결됨', battery:100, lang:'KO' };


/* ══════════ 2. 단지 · 유닛 계층 (FRD Space) ══════════
   모듈러 단지는 동·호 체계가 없다. 유닛 코드(MOD-<타입>-<번호>)로 표기한다.
   ※ COMPLEX.nm 은 MODULE 에서 파생할 근거가 없는 유일한 표시 문자열이다.
     실제 단지명 확정 시 이 한 곳만 고치면 전 화면에 반영된다.              */
/* units 는 MODULE_TYPES 합계로 덮어쓴다 (공간 계층 블록 참조) */
export const COMPLEX={ id:'CX-BEES', nm:'BEES 모듈러 단지', addr:'—', units:0 };

/* occupancy 는 상수로 두지 않는다 — 재실감지 실측값이므로 occupancyOf() 로 읽는다 */
export const MYUNIT={ id:MODULE.id, no:MODULE.serial, nm:MODULE_NM,
  area:MODULE_AREA, household:MODULE.household, movedIn:MODULE.installedAt };

/* ── 공간 계층 : 단지 > 모듈 타입 > 개체 ──
   모듈러 단지에는 동·층이 없다. 타입 아래 개체가 평면으로 놓인다.
   개체 배열(UNITS)과 타입별 집계는 작업 지시 데이터 이후에 만든다.       */
export const MODULE_TYPES=[{id:'MODULAR-A',nm:'A타입',count:12},
                    {id:'MODULAR-B',nm:'B타입',count:8},
                    {id:'MODULAR-C',nm:'C타입',count:4}];

export const typeNmOf=id=>(MODULE_TYPES.find(t=>t.id===id)||{}).nm||'단지 공용';

/* 위치 문자열 → 모듈 타입 역산 (유닛 코드 MOD-<타입>-<번호> 기준) */
export const typeOfLoc=s=>{const m=String(s).match(/MOD-([A-Z])-/); return m?`MODULAR-${m[1]}`:null;};


/* 타 유닛 코드 — 우리 유닛과 동일한 코드 체계에서 파생 */
export const unitCode=(t,n)=>`MOD-${t}-${String(n).padStart(2,'0')}`;

export const UNIT_REF={ a03:unitCode('A',3), a04:unitCode('A',4), a05:unitCode('A',5),
  b03:unitCode('B',3), b04:unitCode('B',4), c01:unitCode('C',1),
  c02:unitCode('C',2), c04:unitCode('C',4) };

/* 단지 공용부 — 동 표기 없음 */
export const COMMON={ mech:'단지 기계실', vent:'단지 환기실', park1:'단지 주차장 B1',
  park2:'단지 주차장 B2', util:'단지 공용 설비실', lobby:'단지 공용 로비',
  corr:'단지 공용 복도', ev:'단지 승강기 EV-2', stair:'단지 비상계단',
  westLine:`서향 배치 ${MODULE.typeNm} 유닛` };


/* plan 좌표계: 0~90 x 0~70 (모듈 9m x 7m 를 데시미터로) → SVG 520x430 사상 */
export const PLAN={sc:5.4, ox:17, oy:26};

export const plX=v=>PLAN.ox+v*PLAN.sc, plY=v=>PLAN.oy+v*PLAN.sc, plL=v=>v*PLAN.sc;

/* 구조 외곽 — MODULE.bbox 외곽 사각형 1개 (v0.7 벽체 배열 대체) */
export const planShell=()=>`<rect class="roomShell" x="${plX(0)}" y="${plY(0)}"
  width="${plL(MODULE.bbox.w*10)}" height="${plL(MODULE.bbox.d*10)}" rx="4"/>`;

/* ══════════ 전기 요금 (한국 주택용 저압) — 규칙 §8 도메인 상수 ══════════
   임의 단가(예: 720원/kWh)를 쓰지 않는다. 금액은 전부 이 엔진을 거친다.     */
export const RATE={
  base:    [910, 1600, 7300],       // 단계별 기본요금 (원)
  energy:  [120.0, 214.6, 307.3],   // 단계별 전력량요금 (원/kWh)
  climate: 9.0,                     // 기후환경요금 (원/kWh)
  fuel:    5.0,                     // 연료비조정요금 (원/kWh)
  vatRate: 0.10,                    // 부가가치세
  fundRate:0.032,                   // 전력산업기반기금
};
/* 누진 구간은 계절에 따라 다르다 (규칙 §8)
   하계 7~8월 : ~300 / 301~450 / 450 초과      기타 : ~200 / 201~400 / 400 초과 */
export const TIER_LIMITS={ summer:[300,450,9999], other:[200,400,9999] };
export const seasonOf=m=>(m===7||m===8)?'summer':'other';
export const tiersOf=m=>TIER_LIMITS[seasonOf(m)].map((to,i)=>({n:i+1,to,won:RATE.energy[i]}));
export const tierOf=(kwh,m)=>{
  const lim=TIER_LIMITS[seasonOf(m)];
  for(let i=0;i<lim.length;i++) if(kwh<=lim[i]) return i+1;
  return lim.length;
};
/* 청구액 = (기본 + 전력량 + 기후환경 + 연료비조정) × (1 + vatRate + fundRate)
   전력량요금은 단계별 누진으로 구간마다 해당 단가를 적용한다. */
export function billOf(kwh,m){
  const lim=TIER_LIMITS[seasonOf(m)];
  let energy=0, n=1;
  for(let i=0;i<lim.length;i++){
    const prev=i?lim[i-1]:0;
    const span=Math.max(0,Math.min(kwh,lim[i])-prev);
    if(span>0){energy+=span*RATE.energy[i]; n=i+1;}
  }
  const base=RATE.base[n-1], climate=kwh*RATE.climate, fuel=kwh*RATE.fuel;
  const sub=base+energy+climate+fuel;
  return {kwh,tier:n,base,
    energy:Math.round(energy), climate:Math.round(climate), fuel:Math.round(fuel),
    sub:Math.round(sub), vat:Math.round(sub*RATE.vatRate), fund:Math.round(sub*RATE.fundRate),
    total:Math.round(sub*(1+RATE.vatRate+RATE.fundRate)/10)*10};
}
/* 한계 단가 (원/kWh) — 절감 금액은 해당 세대의 누진 단계 단가로 계산한다 */
export const marginalWon=(kwh,m)=>
  (RATE.energy[tierOf(kwh,m)-1]+RATE.climate+RATE.fuel)*(1+RATE.vatRate+RATE.fundRate);

/* 기존 TIERS 는 계절 무시 상수였다 → 하계/기타를 구분하는 tiersOf(월) 로 대체 */
export const TIERS=tiersOf(8);

/* 공간 아이콘 — 표시 전용 UI 상수 (스키마 아님) */
export const SPACE_ICON={living:'🛋', kitchen:'🍳', bedroom:'🛏', bath:'🚿'};

export const iconOf=id=>SPACE_ICON[id]||'▦';


/* ══════════ 센서 · 디바이스 (센서필드 §5.1.5 / §5.3) ══════════ */
export const STYPE={
  SEO:{nm:'SMART OUTLET', k:'콘센트', icon:'🔌', ctrl:'onoff'},
  SEL:{nm:'SMART LIGHT',  k:'조명',   icon:'💡', ctrl:'dim'},
  SES:{nm:'SMART SWITCH', k:'스위치', icon:'🎚', ctrl:'onoff'},
  SEC:{nm:'SMART BLIND',  k:'전동커튼',icon:'🪟', ctrl:'blind'},
};
/* 환경 측정은 별도 기기가 아니라 SEL(온습도·재실) / SES(공기질) 의 부가 항목이다.
   SED 전문의 Category 도 전등 L / 스위치 S / 콘센트 P 세 종류뿐이다.        */

/* 공간 소속 기기 조회 — v0.7 공간별 센서 맵을 대체 */
export const devicesOf=sid=>DEVICES.filter(d=>d.space===sid);

export const deviceOf=did=>DEVICES.find(d=>d.id===did);

export const spaceOf=sid=>SPACES.find(s=>s.id===sid);

/* 조광·개폐 초기값 — 제어 상태는 스키마에 슬롯이 없어 UI 상태로만 보관 */
export const DEV_CTRL_INIT={SEL_6:70, SEL_12:100, SEC_1:50};


/* 종합 공기질 지수 — 산출값. PM2.5(한국 CAI 구간) · CO₂(기준 1000ppm) ·
   TVOC(기준 400ppb) 부지수 중 최댓값. 임의 상수 없이 기준값에서만 파생한다. */
export const CAI_PM25=[[0,15,0,50],[15,35,51,100],[35,75,101,250],[75,500,251,500]];

/* 공기질 측정원(SES)이 없는 공간은 지수를 만들지 않는다 → null (센서 없음) */
export function aqiOf(sp){
  const e=sp.env;
  if(e.pm25==null||e.co2==null||e.tvoc==null) return null;
  const b=CAI_PM25.find(r=>e.pm25<=r[1])||CAI_PM25[CAI_PM25.length-1];
  const iPm=b[2]+(e.pm25-b[0])/(b[1]-b[0])*(b[3]-b[2]);
  const iCo2=(e.co2-400)/6;            // 400ppm(외기) → 0 · 1000ppm(실내 기준) → 100
  const iTvoc=e.tvoc/4;                // 400ppb(기준) → 100
  return Math.max(0,Math.round(Math.max(iPm,iCo2,iTvoc)));
}

/* TVOC 등급 — 단위(ppb/mg㎥/index)가 미확정이라 숫자를 화면에 쓰지 않는다.
   등급 텍스트만 사용한다 (SED 전문 TEL 6 · 단위 tbd).                     */
export const TVOC_GRADE=[{k:'좋음',c:'#1a9c6a',max:200},{k:'보통',c:'#e08a12',max:400},
                         {k:'나쁨',c:'#d64545',max:Infinity}];
export const tvocGradeOf=v=>v==null?{k:'센서 없음',c:'#96a1b0'}:TVOC_GRADE.find(g=>v<=g.max);

/* 재실 상태 — 침실 SEL 의 재실감지(Radar · SED TEL 10 presence_state) 실측값.
   Radar 보유 기기가 없으면 null 을 반환한다 (문자열을 만들지 않는다).      */
export function occupancyOf(){
  const d=DEVICES.find(x=>x.meas.occupied!=null);
  return d?{on:d.meas.occupied, src:d.id, space:d.space}:null;
}

/* 센서 상세 실측값 (센서필드 §5.2)
   측정 기기 자신(SEL=온습도 · SES=공기질)은 실측을 그대로 쓴다.
   같은 공간의 다른 기기는 공간 파생값에 시드 고정 소폭 편차만 갖는다.
   측정원이 없는 항목은 null 을 그대로 흘려보낸다 — 화면이 '센서 없음' 처리. */
export const seedOf=s=>String(s).split('').reduce((a,c)=>a+c.charCodeAt(0),0);

export function sensorReading(sid){
  const d=deviceOf(sid), sp=(d&&spaceOf(d.space))||SPACES[0], e=sp.env;
  const m=(d&&d.meas)||{}, oTh=m.temp!=null, oAq=m.co2!=null;
  const k=seedOf(sid);
  const dv=(n,r)=>(rnd(k+n)-0.5)*2*r;              // ±r 편차
  const rt=(n,r)=>1+dv(n,r);                       // ±r 비율 편차
  const add=(v,own,n,r,p=1)=>v==null?null:+(own?v:v+dv(n,r)).toFixed(p);
  const mul=(v,own,n,r,p=1)=>v==null?null:+(own?v:v*rt(n,r)).toFixed(p);
  return {
    hasTh:e.temp!=null, hasAq:e.co2!=null,
    temp:add(e.temp,oTh,1,0.4),        humi:add(e.humi,oTh,3,2),
    tempAvg:add(e.temp,oTh,2,0.2),     humiAvg:add(e.humi,oTh,4,1),
    tvoc:mul(e.tvoc,oAq,5,0.08),       tvocAvg:mul(e.tvoc,oAq,6,0.04),
    co2:mul(e.co2,oAq,7,0.05,2),       co2Avg:e.co2==null?null:Math.round(oAq?e.co2:e.co2*rt(8,0.03)),
    pm25:mul(e.pm25,oAq,9,0.08,2),     pm25Avg:mul(e.pm25,oAq,10,0.04),
  };
}

/* ══════════ 개체 — 타입 아래 평면 배열 (동·층 필드 없음 · serial 보유) ══════════ */
export const UNITS=(()=>{const a=[];
  MODULE_TYPES.forEach((t,ti)=>{
    const tc=t.id.split('-')[1];                       // A | B | C
    for(let n=1;n<=t.count;n++){
      const seed=(ti+1)*100+n, r=rnd(seed);
      const mine=(t.id===MODULE.type&&n===1);          // 우리 유닛 = MODULE
      a.push({type:t.id, typeNm:t.nm, no:String(n).padStart(2,'0'),
        id:mine?MODULE.id:unitCode(tc,n),
        serial:mine?MODULE.serial:`${tc}-2026-${1000+seed}`,
        kwh:+(58+r*82).toFixed(1), al:r>0.955?2:r>0.86?1:0, req:r>0.93?1:0,
        occ:mine?true:r>0.06, mine});      // 우리 유닛은 항상 재실 (MYUNIT.occupancy)
    }});
  return a;})();

COMPLEX.units=MODULE_TYPES.reduce((a,t)=>a+t.count,0);   // 단지 개체 수 = 타입 합계


/* ══════════ 타입별 상태 (FR-MON-01) — 개체 배열에서 집계 ══════════ */
MODULE_TYPES.forEach(t=>{
  const us=UNITS.filter(u=>u.type===t.id), occ=us.filter(u=>u.occ);
  t.al=us.reduce((a,u)=>a+u.al,0); t.req=us.reduce((a,u)=>a+u.req,0);
  t.eng=+(occ.reduce((a,u)=>a+u.kwh,0)/(occ.length||1)).toFixed(1);
  const score=t.al*2+t.req;                              // 심각도 가중 합산
  Object.assign(t, score>=10?{grade:'경고',c:'#d64545'}
                 :score>=6 ?{grade:'주의',c:'#e08a12'}
                            :{grade:'양호',c:'#1a9c6a'});
});

/* ── 자재·마감 (modular F-03 · PRD 범위 밖) ── */
export const MATERIALS={
  living:[{k:'바닥',v:'강마루 · 오크 내추럴',m:'동화자연마루 · 7.5T · 2025.02 시공',c:'#c9a87c'},
          {k:'벽',v:'실크벽지 · 웜화이트',m:'개나리벽지 · 방염 1급',c:'#efe9e0'},
          {k:'천장',v:'석고보드 + 수성도장',m:'9.5T 2겹 · 친환경 도장',c:'#f6f4f1'},
          {k:'창호',v:'PVC 3중 유리 시스템창',m:'LX하우시스 · 열관류율 0.98 W/㎡K',c:'#dfe6ee'},
          {k:'조명',v:'LED 매입등 6개소',m:'색온도 3000K/5700K 조절',c:'#fff3d6'}],
  bedroom:[{k:'바닥',v:'강마루 · 오크 내추럴',m:'동화자연마루 · 7.5T',c:'#c9a87c'},
          {k:'벽',v:'실크벽지 · 라이트베이지',m:'개나리벽지 · 방염 1급',c:'#ece4d8'},
          {k:'붙박이장',v:'무광 화이트 · 3연동',m:'한샘 · 2025.02 설치',c:'#f4f4f4'},
          {k:'창호',v:'PVC 3중 유리 시스템창',m:'LX하우시스',c:'#dfe6ee'}],
  kitchen:[{k:'상판',v:'엔지니어드 스톤',m:'칸스톤 · 20T · 내열 등급 A',c:'#e8e4dc'},
           {k:'싱크',v:'스테인리스 언더싱크',m:'304 스테인리스',c:'#cdd3d8'},
           {k:'바닥',v:'포세린 타일 600×600',m:'미끄럼 저항 R10',c:'#d8d2c8'},
           {k:'후드',v:'하향식 인덕션 후드',m:'배기 풍량 500㎥/h',c:'#c8ccd0'}],
  bath:[{k:'바닥',v:'논슬립 자기질 타일',m:'300×300 · R11',c:'#cfd6d9'},
         {k:'벽',v:'광택 자기질 타일',m:'300×600',c:'#e6ecef'},
         {k:'방수',v:'우레탄 도막 방수 2회',m:'2025.01 시공 · 담수 시험 합격',c:'#b8c6cc'},
         {k:'환기',v:'천장 매입 환기팬',m:'풍량 100㎥/h · 습도 연동',c:'#dde3ea'}],
};

/* 이관 제외: 모듈러 4공간에 없는 출처 공간의 자재 항목 (adapters 미매핑 공간) */
/* ── 배관·전선 경로 (modular F-04 · PRD 범위 밖) ── */
export const PIPES=[
 {k:'water', nm:'급수 배관', c:'#0877ed', d:'M60,300 L60,120 L200,120 L200,60 M200,120 L330,120 L330,180'},
 {k:'drain', nm:'배수 배관', c:'#6b57d6', d:'M78,300 L78,140 L214,140 L214,72 M214,140 L346,140'},
 {k:'elec',  nm:'전기 배선', c:'#e08a12', d:'M40,290 L40,90 L150,90 L150,200 L280,200 L280,110 L400,110'},
 {k:'hvac',  nm:'냉난방 덕트', c:'#0f9b9b', d:'M120,320 L120,240 L260,240 L260,300 M260,240 L380,240 L380,150'},
 {k:'comm',  nm:'통신 배선', c:'#1a9c6a', d:'M46,282 L46,168 L188,168 L188,268 L318,268'},
];

/* ── 설비 수명 예측 (modular F-16 · PRD F-704) ── */
export const LIFESPAN=[
 {nm:'스탠드 에어컨',loc:spaceOf('living').nm,code:'AC-LV-01',run:4820,std:15000,inst:MODULE.installedAt,rep:'2033.06',risk:'낮음'},
 {nm:'벽걸이 에어컨',loc:spaceOf('bedroom').nm,code:'AC-BR-01',run:3960,std:15000,inst:MODULE.installedAt,rep:'2034.02',risk:'낮음'},
 {nm:'냉장고',loc:spaceOf('kitchen').nm,code:'RF-KT-01',run:12480,std:52000,inst:MODULE.installedAt,rep:'2036.08',risk:'낮음'},
 {nm:'환기팬',loc:spaceOf('bath').nm,code:'FN-BT-01',run:6240,std:9000,inst:MODULE.installedAt,rep:'2027.04',risk:'주의'},
 {nm:'전동커튼',loc:spaceOf('living').nm,code:'SEC_1',run:1840,std:8000,inst:MODULE.installedAt,rep:'2031.11',risk:'낮음'},
 {nm:'인덕션',loc:spaceOf('kitchen').nm,code:'IH-KT-01',run:412,std:6000,inst:MODULE.installedAt,rep:'2040.01',risk:'낮음'},
];

/* 인라인 핸들러가 참조하는 심볼을 window 에 등록 (동작 유지) */
Object.assign(window,{$,app,rnd,fx,won,clamp,NOW,NOWTXT,TIMETXT,MODULE_NM,MODULE_AREA,ENVSYS,COMPLEX,MYUNIT,MODULE_TYPES,typeNmOf,typeOfLoc,unitCode,UNIT_REF,COMMON,PLAN,plX,plY,plL,planShell,SPACE_ICON,iconOf,STYPE,devicesOf,deviceOf,spaceOf,DEV_CTRL_INIT,CAI_PM25,aqiOf,TVOC_GRADE,tvocGradeOf,occupancyOf,seedOf,sensorReading,UNITS,MATERIALS,PIPES,LIFESPAN});
