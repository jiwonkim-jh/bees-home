/* ══════════════════════════════════════════════════════════════════
   BEES Home v0.8 · adapters/dongbaek.js
   동백 IoT 실측 → 모듈러 DEVICES[].meas 주입 어댑터

   동백은 화면에 표시되는 대상이 아니다. 실측값 출처일 뿐이다.
   동백 공간명(안방 / 침실1 / 침실2 / 현관 / 화장실1)은 이 파일 안에만 존재한다.
   product / thermal / SPACES 는 절대 건드리지 않는다.

   P2 단계: 파일 신설만. 아직 어느 화면도 이 파일을 호출하지 않는다.
   ══════════════════════════════════════════════════════════════════ */

import { DEVICES } from '../data/moduleUnit.js';

export const SPACE_MAP = {
  '거실':'living', '주방':'kitchen', '안방':'bedroom', '화장실1':'bath',
  // 미매핑: 침실1, 침실2, 현관 — 사용하지 않음
};

/* 실측 출처 세대 — srcUnit 에 기록되는 계보 표기용 */
const SRC_UNIT = '동백래미안 1동 202호';

/* 데모 기준 시각 (v0.7 NOW 와 동일 · 고정) */
const DEMO_TS = '2026-08-07T17:43:00+09:00';

/* 시드 고정 의사난수 — 새로고침해도 동일값 */
const rnd = n => { const x = Math.sin(n*12.9898+78.233)*43758.5453; return x-Math.floor(x); };
const seedOf = s => String(s).split('').reduce((a,c)=>a+c.charCodeAt(0),0);

/* payload 스키마 (TODO: 동백 API 명세 확보 후 확정)
   {
     ts: '2026-08-07T17:43:00+09:00',
     unit: '1동 202호',
     spaces: [ { nm:'거실', devices:[ {id:'SEO_35', w:96, kwhToday:0.31, on:true} ] } ]
   }                                                                    */

export function adapt(payload) {
  // 동백 API 응답 → DEVICES[].meas 에만 주입.
  // product / thermal / SPACES 는 절대 건드리지 않는다.
  // 데모 단계에서는 payload 가 없으면 목업값을 반환한다.
  const patch = payload ? fromPayload(payload) : mock();
  DEVICES.forEach(d => {
    const p = patch[d.id];
    if (!p) return;
    d.meas.w        = p.w;
    d.meas.kwhToday = p.kwhToday;
    d.meas.on       = p.on;
    d.meas.ts       = p.ts;
    d.meas.srcUnit  = p.srcUnit;
  });
  return patch;
}

/* 실 payload 경로 — 동백 공간명을 모듈러 공간으로 매핑한 뒤 기기 id 로 대조 */
function fromPayload(payload) {
  const ts = payload.ts || DEMO_TS;
  const srcUnit = payload.unit ? `동백래미안 ${payload.unit}` : SRC_UNIT;
  const patch = {};
  (payload.spaces || []).forEach(sp => {
    const space = SPACE_MAP[sp.nm];
    if (!space) return;                       // 미매핑 동백 공간은 버린다
    (sp.devices || []).forEach(dv => {
      const target = DEVICES.find(d => d.id === dv.id && d.space === space);
      if (!target) return;                    // 이관 제외 기기는 버린다
      patch[dv.id] = {
        w: Number(dv.w) || 0,
        kwhToday: Number(dv.kwhToday) || 0,
        on: !!dv.on,
        ts, srcUnit,
      };
    });
  });
  return patch;
}

/* 목업 경로 — DEVICES 초기 meas 를 기준으로 ±8% 흔들고 계보만 채운다.
   기기 목록·on 상태는 발명하지 않는다. 값의 출처는 moduleUnit.js 초기값이다. */
function mock() {
  const patch = {};
  DEVICES.forEach(d => {
    const k = seedOf(d.id);
    const w = d.meas.on ? +(d.meas.w * (0.96 + rnd(k)*0.08)).toFixed(1) : 0;
    patch[d.id] = {
      w,
      kwhToday: d.meas.kwhToday,              // 산출값 — 어댑터가 만들지 않는다
      on: d.meas.on,
      ts: DEMO_TS,
      srcUnit: SRC_UNIT,
    };
  });
  return patch;
}
