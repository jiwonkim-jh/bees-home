/* ══════════════════════════════════════════════════════════════════
   BEES Home v0.8 · data/moduleUnit.js
   모듈러 유닛 1호 도메인 상수 — MODULE / SPACES / DEVICES

   P2 단계: 스키마 신설만. 아직 어느 화면도 이 파일을 참조하지 않는다.
   DEVICES 는 v0.7 SENSORS 중 모듈러 4공간에 해당하는 항목만 이관했다.
   ══════════════════════════════════════════════════════════════════ */

export const MODULE = {
  id:'MOD-A-01', type:'MODULAR-A', typeNm:'A타입',
  nm:'BEES 모듈러 A타입', serial:'A-2026-0412',
  bbox:{ w:9.0, d:7.0, h:2.4 },   // TODO: 실측 확보 후 교체
  orient:'W', producedAt:'2024.10', installedAt:'2025.03', household:2,
};

/* env / kwh 는 파생값이다. env 는 이 파일 하단 deriveSpaceEnv() 가
   DEVICES[].meas 에서 채우고, kwh 는 data/ops.js 가 채운다.
   출처 공간 → 모듈러 공간 매핑은 adapters/dongbaek.js 의 SPACE_MAP 에만
   존재한다 (이 파일에 두지 않는다).                                     */
export const SPACES = [
  { id:'living',  nm:'거실·식당', plan:{x:0,  y:38, w:90, h:32},
    bbox:{x:0,y:0,z:0,w:0,d:0,h:2.4}, env:null, kwh:1.12 },
  { id:'kitchen', nm:'주방',     plan:{x:57, y:0,  w:33, h:38},
    bbox:{x:0,y:0,z:0,w:0,d:0,h:2.4}, env:null, kwh:0.86 },
  { id:'bedroom', nm:'침실',     plan:{x:0,  y:0,  w:35, h:38},
    bbox:{x:0,y:0,z:0,w:0,d:0,h:2.4}, env:null, kwh:0.54 },
  { id:'bath',    nm:'욕실',     plan:{x:35, y:0,  w:22, h:20},
    bbox:{x:0,y:0,z:0,w:0,d:0,h:2.4}, env:null, kwh:0.10 },
];
// plan 좌표계: 0~90 x 0~70 (모듈 9m x 7m 를 데시미터로).
// 위 plan 값은 임시. 3D 좌표 확정 시 교체 예정.

/* ── SED 규격 · 타입별 측정 항목 ────────────────────────────────────
   출처: 「용인 덕성 API 정보 v0.5」 5~6매 Telegram Format 표의 열 표기.
   V 가 찍힌 열만 그 타입이 보고한다. 표에 없는 항목은 meas 에 두지 않는다.

     TEL  항목              콘센트 SEO  전등 SEL  스위치 SES
      0   순간 전력 (W)         V         V          —
      1   소비 전력 (kWh)       V         V          —
      2   온도 (℃)             V         V          —
      3   습도 (%)             —         V          —
      4   기압 (Pa)            —         V          —
      5   TVOCs (tbd)          —         —          V
      6   CO₂ (ppm)            —         —          V
      7   먼지 (㎍/㎥)          —         —          V
      9   조명 상태             —         V          —
     10   재실 (Radar)          —         V          —
     11   스위치 상태           —         —          V
     12   누전 알림             V         V          —
     13   콘센트 ON/OFF        명령        —          —
     14   스위치 ON/OFF         —         —         명령
     15   콘센트 모드          명령        —          —
     30~33 커튼               커튼 서버(192.168.0.51) · SEC — ThingsBoard 밖

   ※ TEL 8 음성 Signal · TEL 20 AI_VOICE 는 데모 범위에서 제외한다.
     화면에 표시하지 않으며 meas 필드도 만들지 않는다.
   ※ 스위치(SES)는 규격상 전력을 보고하지 않는다 — w / kwhToday 를 두지 않는다. */
export const MEASURES = {
  SEO:['w','kwhToday','on','temp','leak','plugMode'],
  SEL:['w','kwhToday','on','temp','humi','pressure','occupied','leak'],
  SES:['on','co2','tvoc','pm25'],
  SEC:['on'],                       // 개폐율은 state.devState — 커튼 서버 소관
};
export const PLUG_MODES = ['재실','상시','CO2'];   // TEL 15 · 1.0/2.0/3.0

/* ── DEVICES 스키마 원형 (참조용 · 빈 레코드) ─────────────────────
export const DEVICE_SHAPE = {
  id:'', space:'', type:'',        // type: SEO|SEL|SES|SEC
  product:{ brand:'', model:'', ratedW:null, standbyW:null,
            effGrade:null, labelKwhMonth:null },
  meas:{ ...MEASURES[type] 에 해당하는 항목만, ts:null, srcUnit:null },
  thermal:{ mode:'source', sensibleW:0, latentW:0, cop:null,
            pos:{x:0,y:0,z:0}, jet:null },
};
   ───────────────────────────────────────────────────────────────── */
// thermal.mode: 'source'(발열) | 'sink'(냉방) | 'boundary'(경계조건)
// 에어컨은 반드시 sink. sensibleW 는 음수.
// jet 은 에어컨만: {supplyT, vel, dir:[x,y,z], spread}

/* product 전 항목 미확보 상태다 — 자재 마스터(브랜드·모델·정격·효율등급)를
   받기 전까지 null / '' 을 유지한다. 임의 브랜드·정격을 채우지 않는다.
   meas.w / meas.on 은 v0.7 SENSORS 값을 그대로 이관한 초기 목업이며,
   adapters/dongbaek.js 의 adapt() 가 덮어쓴다.
   meas.kwhToday 는 산출값이므로 0 유지 — 발열원 산출 단계에서 채운다.
   thermal.pos 는 SPACES.plan 을 미터로 환산해 배치했다 (모듈 9m x 7m).
     living  x 0~9.0 · y 3.8~7.0    kitchen x 5.7~9.0 · y 0~3.8
     bedroom x 0~3.5 · y 0~3.8      bath    x 3.5~5.7 · y 0~2.0
   MODULE.orient='W' 이므로 창호·전동커튼은 x≈0 (서향) 면에 둔다.
   thermal.sensibleW / latentW 는 정격이 아닌 현재 meas.w 기준 임시 산출값이며,
   CFD 사전계산 단계에서 정격·효율 확보 후 재산출한다.                    */
export const DEVICES = [
  /* ── living · 거실·식당 ───────────────────────────────────── */
  { id:'SEO_35', space:'living', nm:'TV·셋톱 콘센트', type:'SEO',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:96, on:true, temp:29.1, leak:false, plugMode:"상시", kwhToday:0, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:96, latentW:0, cop:null,
              pos:{x:1.2,y:6.9,z:0.3}, jet:null },
  },
  /* 가전 3종(냉장고·TV·공기청정기) 중 공기청정기.
     ※ 기기 id 는 v0.7 이관 목록에 없다 — 실 API 연동 시 실제 id 대조 필요. */
  { id:'SEO_37', space:'living', nm:'공기청정기 콘센트', type:'SEO',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:38, on:true, temp:29.2, leak:false, plugMode:"CO2", kwhToday:0, ts:null, srcUnit:null },
    // 소비전력 전량이 실내로 방출된다 (송풍기 발열)
    thermal:{ mode:'source', sensibleW:38, latentW:0, cop:null,
              pos:{x:0.8,y:6.2,z:0.3}, jet:null },
  },
  { id:'SEL_6',  space:'living', nm:'거실 메인조명', type:'SEL',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:42, on:true, temp:29.1, humi:51, pressure:101325, occupied:true, leak:false, kwhToday:0, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:42, latentW:0, cop:null,
              pos:{x:4.5,y:5.4,z:2.3}, jet:null },
  },
  /* 공기질(TEL 5·6·7)은 스위치가 측정한다 — 거실에 SES 가 없으면 공기질이 빈다.
     P2 에서 데모 범위 밖으로 뒀던 벽 스위치를 이관해 규격과 화면을 일치시킨다. */
  { id:'SES_11', space:'living', nm:'거실 벽 스위치', type:'SES',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ on:true, co2:903, tvoc:100, pm25:5, ts:null, srcUnit:null },
    // 스위치 자체 발열은 무시 가능
    thermal:{ mode:'source', sensibleW:0, latentW:0, cop:null,
              pos:{x:0.4,y:4.2,z:1.3}, jet:null },
  },
  { id:'SEC_1',  space:'living', nm:'거실 전동커튼', type:'SEC',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ on:true, ts:null, srcUnit:null },
    // 서향 창 일사 차폐 → 발열원이 아니라 경계조건
    thermal:{ mode:'boundary', sensibleW:0, latentW:0, cop:null,
              pos:{x:0.1,y:5.4,z:2.2}, jet:null },
  },

  /* ── kitchen · 주방 ───────────────────────────────────────── */
  { id:'SEO_42', space:'kitchen', nm:'냉장고 콘센트', type:'SEO',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:145, on:true, temp:30.6, leak:false, plugMode:"상시", kwhToday:0, ts:null, srcUnit:null },
    // 정상상태에서 소비전력 전량이 실내로 방출
    thermal:{ mode:'source', sensibleW:145, latentW:0, cop:null,
              pos:{x:8.7,y:1.8,z:0.9}, jet:null },
  },
  { id:'SEL_12', space:'kitchen', nm:'주방 조명', type:'SEL',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:28, on:true, temp:30.8, humi:47, pressure:101325, occupied:false, leak:false, kwhToday:0, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:28, latentW:0, cop:null,
              pos:{x:7.3,y:1.9,z:2.3}, jet:null },
  },
  { id:'SES_14', space:'kitchen', nm:'후드 스위치', type:'SES',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ on:true, co2:812, tvoc:186, pm25:12.4, ts:null, srcUnit:null },
    // 배기 = 환기 경계조건. 배기 풍량은 자재 사양 확보 후 확정
    thermal:{ mode:'boundary', sensibleW:0, latentW:0, cop:null,
              pos:{x:7.2,y:0.6,z:1.6}, jet:null },
  },

  /* ── bedroom · 침실 ───────────────────────────────────────── */
  { id:'SEL_3',  space:'bedroom', nm:'침실 메인조명', type:'SEL',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:0, on:false, temp:28.4, humi:53, pressure:101325, occupied:true, leak:false, kwhToday:0, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:0, latentW:0, cop:null,
              pos:{x:1.7,y:1.9,z:2.3}, jet:null },
  },
  /* 침실 공기질 측정원 — 출처는 동백 '침실1' (SPACE_MAP 확정값).
     ※ 기기 id 는 v0.7 이관 목록에서 가져왔다. 실 API 연동 시
       '침실1' 소속 스위치의 실제 id 와 대조 필요 (연동 착수 항목). */
  { id:'SES_4',  space:'bedroom', nm:'침실 벽 스위치', type:'SES',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ on:true, co2:742, tvoc:92, pm25:5.8, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:0, latentW:0, cop:null,
              pos:{x:0.4,y:3.4,z:1.3}, jet:null },
  },

  /* ── bath · 욕실 ──────────────────────────────────────────── */
  { id:'SEL_15', space:'bath', nm:'욕실 조명', type:'SEL',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:0, on:false, temp:28.2, humi:62, pressure:101325, occupied:false, leak:false, kwhToday:0, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:0, latentW:0, cop:null,
              pos:{x:4.6,y:1.0,z:2.3}, jet:null },
  },
  { id:'SES_18', space:'bath', nm:'환기팬 스위치', type:'SES',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ on:true, co2:604, tvoc:58, pm25:4.2, ts:null, srcUnit:null },
    // 배기 = 환기 경계조건
    thermal:{ mode:'boundary', sensibleW:0, latentW:0, cop:null,
              pos:{x:5.4,y:0.3,z:2.3}, jet:null },
  },
];
/* 이관 제외 — SPACE_MAP 미매핑 출처 공간(adapters/dongbaek.js 참조) 소속
   기기 전량, 그리고 모듈러 4공간 대상 중 데모 범위 밖 항목:
     living  SEL_7(간접조명) · SES_11(벽 스위치)
     kitchen SEO_43(식기세척기)
     bedroom SES_4(스위치) · SEC_2(전동커튼)
     bath    SEO_51(세탁기) · SEW_1(누수 감지)                        */

/* ══════════ 세대 설비 — SED 계측 대상이 아니다 ══════════════════════
   출처: 「용인 덕성 API 정보 v0.4」 2매 아이소메트릭 — 천장 덕트 공조.
   급기 그릴(거실·침실) · 환기 그릴(거실·침실) · 배기 그릴(욕실·주방) 구성이며
   실내기(스탠드/벽걸이 에어컨)가 없다. 따라서 냉방 전력은 **콘센트에 잡히지
   않는다.** SED 콘센트·전등 계측 합계 ≠ 세대 총 사용량이다.

   ※ 이 항목은 계측이 아니라 정격 × 가동시간 가정 산출이다 (계보 「가정」).
     세대 계량기 또는 설비 전력 계측 경로가 확보되면 실측으로 교체한다.
   ※ 정격은 data/cfdConstants.js centralHeatPump 와 같은 값을 쓴다.
   ※ 히트펌프의 3.75kW 는 냉방능력(열량)이다. 소비전력이 아니다.
     소비전력 = 냉방부하(열량) / COP 이므로 그대로 쓰면 3.5배 과대계상된다.  */
export const HOUSE_EQUIP = [
  { id:'HP-A-01', nm:'중앙 덕트 히트펌프', kind:'냉난방',
    /* 소비전력 = coolingLoadKw / cop  (cfdConstants.centralHeatPump 와 같은 값) */
    loadKw:3.2,             // 냉방부하 (열량) — capacityKw 3.75 의 실사용 부하
    cop:3.5,                // 가정 — 제거한 실내기(SEO_36)에 쓰던 값과 동일
    runtimeH:6.5,           // 가정 — 하계 오후 집중 가동 (등가 전부하 시간)
    serves:['living','bedroom'],
    note:'급기·환기 그릴 4개소 담당. 실내기 없음' },
  { id:'ERV-A-01', nm:'환기 유닛 (MVHR)', kind:'환기',
    /* 송풍기 전력이라 열량 개념이 없다 — 소비전력을 직접 쓴다 */
    fanW:45,                // 가정 — 306㎥/h 급 전열교환기의 상시(저속) 운전 전력
    runtimeH:24,            // 상시 가동
    serves:['living','kitchen','bedroom','bath'],
    note:'열회수율 0.70 · 배기는 욕실·주방 그릴' },
];

/* 세대 설비 일일 전력량 — 열량 기반이면 COP 로 나눈다 */
export const equipKwhOf = e =>
  +((e.fanW!=null ? e.fanW : e.loadKw*1000/e.cop) * e.runtimeH / 1000).toFixed(3);

/* ══════════ 규격 적합성 자체 검사 ══════════════════════════════════
   MEASURES 에 없는 항목이 meas 에 들어가면 즉시 드러나게 한다.
   (규격에 없는 값을 화면에 올리는 것이 이 프로젝트의 최대 리스크다)   */
export const measViolations = () => DEVICES.flatMap(d=>{
  const allow=[...(MEASURES[d.type]||[]),'ts','srcUnit'];
  return Object.keys(d.meas).filter(k=>!allow.includes(k))
    .map(k=>`${d.id}(${d.type}) 규격 외 항목 ${k}`);
});

/* ══════════ SPACES[].env 파생 ══════════════════════════════════════
   env 는 상수가 아니다. DEVICES[].meas 에서 읽는다.
     온도  전등(SEL) 우선 → 없으면 콘센트(SEO)   ※ TEL 2 는 둘 다 보고한다
     습도·기압·재실  전등(SEL) 만
     공기질(CO₂·TVOC·먼지)  스위치(SES) 만
   한 공간에 같은 항목을 보고하는 기기가 여럿이면 **첫 번째 기기**를 대표로
   쓴다 (평균 내지 않는다). 어느 기기에서 왔는지는 envSrc 에 남긴다.
   측정원이 없는 항목은 null 로 둔다 — 숫자를 만들어 채우지 않는다.     */
export function deriveSpaceEnv(){
  SPACES.forEach(sp=>{
    const ds=DEVICES.filter(d=>d.space===sp.id);
    const pick=(types,key)=>{
      for(const t of types){ const d=ds.find(x=>x.type===t&&x.meas[key]!=null); if(d)return d; }
      return null;
    };
    const th=pick(['SEL','SEO'],'temp');      // 온도 — 전등 우선, 콘센트 폴백
    const hu=pick(['SEL'],'humi');            // 습도 — 전등만
    const pr=pick(['SEL'],'pressure');        // 기압 — 전등만
    const oc=pick(['SEL'],'occupied');        // 재실 — 전등(Radar)만
    const aq=pick(['SES'],'co2');             // 공기질 — 스위치만
    sp.envSrc={ th:th?th.id:null, hu:hu?hu.id:null, pr:pr?pr.id:null,
                oc:oc?oc.id:null, aq:aq?aq.id:null };
    sp.env={
      temp: th?th.meas.temp:null, humi: hu?hu.meas.humi:null,
      pressure: pr?pr.meas.pressure:null,
      co2 : aq?aq.meas.co2 :null, tvoc: aq?aq.meas.tvoc:null,
      pm25: aq?aq.meas.pm25:null,
    };
    sp.occupied = oc?oc.meas.occupied:null;
    /* 누전(TEL 12) — 콘센트·전등 중 하나라도 감지되면 공간 경보 */
    sp.leak = ds.some(d=>d.meas.leak===true);
  });
}
deriveSpaceEnv();
