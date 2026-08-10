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

/* env / kwh 는 IoT 실측을 이관한 값이다. 출처 공간 → 모듈러 공간 매핑은
   adapters/dongbaek.js 의 SPACE_MAP 에만 존재한다 (이 파일에 두지 않는다).
   계보 = 계측. 유닛 합계 정합은 에너지 재산출 단계에서 맞춘다.          */
export const SPACES = [
  { id:'living',  nm:'거실·식당', plan:{x:0,  y:38, w:90, h:32},
    bbox:{x:0,y:0,z:0,w:0,d:0,h:2.4},
    env:{temp:29.1,humi:51,co2:903,pm25:5.0, tvoc:100}, kwh:1.12 },
  { id:'kitchen', nm:'주방',     plan:{x:57, y:0,  w:33, h:38},
    bbox:{x:0,y:0,z:0,w:0,d:0,h:2.4},
    env:{temp:30.8,humi:47,co2:812,pm25:12.4,tvoc:186}, kwh:0.86 },
  { id:'bedroom', nm:'침실',     plan:{x:0,  y:0,  w:35, h:38},
    bbox:{x:0,y:0,z:0,w:0,d:0,h:2.4},
    env:{temp:28.4,humi:53,co2:742,pm25:5.8, tvoc:92},  kwh:0.54 },
  { id:'bath',    nm:'욕실',     plan:{x:35, y:0,  w:22, h:20},
    bbox:{x:0,y:0,z:0,w:0,d:0,h:2.4},
    env:{temp:28.2,humi:62,co2:604,pm25:4.2, tvoc:58},  kwh:0.10 },
];
// plan 좌표계: 0~90 x 0~70 (모듈 9m x 7m 를 데시미터로).
// 위 plan 값은 임시. 3D 좌표 확정 시 교체 예정.

/* ── DEVICES 스키마 원형 (참조용 · 빈 레코드) ─────────────────────
export const DEVICE_SHAPE = {
  id:'', space:'', type:'',        // type: SEO|SEL|SES|SEC|SEA
  product:{ brand:'', model:'', ratedW:null, standbyW:null,
            effGrade:null, labelKwhMonth:null },
  meas:{ w:0, kwhToday:0, on:false, ts:null, srcUnit:null },
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
    meas:{ w:96, kwhToday:0, on:true, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:96, latentW:0, cop:null,
              pos:{x:1.2,y:6.9,z:0.3}, jet:null },
  },
  { id:'SEO_36', space:'living', nm:'스탠드 에어컨 콘센트', type:'SEO',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:1150, kwhToday:0, on:true, ts:null, srcUnit:null },
    // 냉방 = sink. 소비전력 1150W × COP 3.5 ≈ 4.0kW 제거, SHR 0.75 가정
    thermal:{ mode:'sink', sensibleW:-3020, latentW:-1010, cop:3.5,
              pos:{x:8.6,y:4.2,z:1.5}, jet:{ supplyT:14, vel:2.6, dir:[-1,0.2,-0.1], spread:40 } },
  },
  { id:'SEL_6',  space:'living', nm:'거실 메인조명', type:'SEL',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:42, kwhToday:0, on:true, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:42, latentW:0, cop:null,
              pos:{x:4.5,y:5.4,z:2.3}, jet:null },
  },
  { id:'SEC_1',  space:'living', nm:'거실 전동커튼', type:'SEC',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:6, kwhToday:0, on:true, ts:null, srcUnit:null },
    // 서향 창 일사 차폐 → 발열원이 아니라 경계조건
    thermal:{ mode:'boundary', sensibleW:0, latentW:0, cop:null,
              pos:{x:0.1,y:5.4,z:2.2}, jet:null },
  },
  { id:'SEA_2',  space:'living', nm:'거실 환경센서', type:'SEA',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:0.8, kwhToday:0, on:true, ts:null, srcUnit:null },
    // 환경센서 발열은 무시 가능 수준. pos z=1.1 은 실내 측정 기준고
    thermal:{ mode:'source', sensibleW:0.8, latentW:0, cop:null,
              pos:{x:4.5,y:4.0,z:1.1}, jet:null },
  },

  /* ── kitchen · 주방 ───────────────────────────────────────── */
  { id:'SEO_41', space:'kitchen', nm:'인덕션 콘센트', type:'SEO',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:1800, kwhToday:0, on:true, ts:null, srcUnit:null },
    // 조리 열은 조리기구·후드로 상당량 빠진다. 실내 유입분 임시 배분(현열 50%·잠열 25%)
    thermal:{ mode:'source', sensibleW:900, latentW:450, cop:null,
              pos:{x:7.2,y:0.6,z:0.9}, jet:null },
  },
  { id:'SEO_42', space:'kitchen', nm:'냉장고 콘센트', type:'SEO',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:145, kwhToday:0, on:true, ts:null, srcUnit:null },
    // 정상상태에서 소비전력 전량이 실내로 방출
    thermal:{ mode:'source', sensibleW:145, latentW:0, cop:null,
              pos:{x:8.7,y:1.8,z:0.9}, jet:null },
  },
  { id:'SEL_12', space:'kitchen', nm:'주방 조명', type:'SEL',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:28, kwhToday:0, on:true, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:28, latentW:0, cop:null,
              pos:{x:7.3,y:1.9,z:2.3}, jet:null },
  },
  { id:'SES_14', space:'kitchen', nm:'후드 스위치', type:'SES',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:65, kwhToday:0, on:true, ts:null, srcUnit:null },
    // 배기 = 환기 경계조건. 배기 풍량은 자재 사양 확보 후 확정
    thermal:{ mode:'boundary', sensibleW:0, latentW:0, cop:null,
              pos:{x:7.2,y:0.6,z:1.6}, jet:null },
  },
  { id:'SEA_6',  space:'kitchen', nm:'주방 환경센서', type:'SEA',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:0.8, kwhToday:0, on:true, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:0.8, latentW:0, cop:null,
              pos:{x:6.2,y:2.6,z:1.1}, jet:null },
  },

  /* ── bedroom · 침실 ───────────────────────────────────────── */
  { id:'SEO_21', space:'bedroom', nm:'침대 협탁 콘센트', type:'SEO',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:18, kwhToday:0, on:true, ts:null, srcUnit:null },
    // 가습기: 증발 잠열은 실내 현열에서 흡수된다. 부호 처리는 CFD 단계에서 확정
    thermal:{ mode:'source', sensibleW:18, latentW:200, cop:null,
              pos:{x:0.4,y:1.0,z:0.3}, jet:null },
  },
  { id:'SEO_22', space:'bedroom', nm:'벽걸이 에어컨 콘센트', type:'SEO',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:780, kwhToday:0, on:true, ts:null, srcUnit:null },
    // 소비전력 780W × COP 3.6 ≈ 2.8kW 제거, SHR 0.75 가정
    thermal:{ mode:'sink', sensibleW:-2106, latentW:-702, cop:3.6,
              pos:{x:1.7,y:0.2,z:2.0}, jet:{ supplyT:15, vel:2.2, dir:[0,1,-0.3], spread:35 } },
  },
  { id:'SEL_3',  space:'bedroom', nm:'침실 메인조명', type:'SEL',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:0, kwhToday:0, on:false, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:0, latentW:0, cop:null,
              pos:{x:1.7,y:1.9,z:2.3}, jet:null },
  },
  { id:'SEA_3',  space:'bedroom', nm:'침실 환경센서', type:'SEA',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:0.8, kwhToday:0, on:true, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:0.8, latentW:0, cop:null,
              pos:{x:0.6,y:2.8,z:1.1}, jet:null },
  },

  /* ── bath · 욕실 ──────────────────────────────────────────── */
  { id:'SEL_15', space:'bath', nm:'욕실 조명', type:'SEL',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:0, kwhToday:0, on:false, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:0, latentW:0, cop:null,
              pos:{x:4.6,y:1.0,z:2.3}, jet:null },
  },
  { id:'SES_18', space:'bath', nm:'환기팬 스위치', type:'SES',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:22, kwhToday:0, on:true, ts:null, srcUnit:null },
    // 배기 = 환기 경계조건
    thermal:{ mode:'boundary', sensibleW:0, latentW:0, cop:null,
              pos:{x:5.4,y:0.3,z:2.3}, jet:null },
  },
  { id:'SEA_7',  space:'bath', nm:'욕실 환경센서', type:'SEA',
    product:{ brand:'', model:'', ratedW:null, standbyW:null,
              effGrade:null, labelKwhMonth:null },
    meas:{ w:0.8, kwhToday:0, on:true, ts:null, srcUnit:null },
    thermal:{ mode:'source', sensibleW:0.8, latentW:0, cop:null,
              pos:{x:3.7,y:1.5,z:1.1}, jet:null },
  },
];
/* 이관 제외 — SPACE_MAP 미매핑 출처 공간(adapters/dongbaek.js 참조) 소속
   기기 전량, 그리고 모듈러 4공간 대상 중 데모 범위 밖 항목:
     living  SEL_7(간접조명) · SES_11(벽 스위치)
     kitchen SEO_43(식기세척기)
     bedroom SES_4(스위치) · SEC_2(전동커튼)
     bath    SEO_51(세탁기) · SEW_1(누수 감지)                        */
