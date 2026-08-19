/* ══════════════════════════════════════════════════════════════════
   BEES Home v0.8 · adapters/dongbaek.js
   동백 IoT 실측 → 모듈러 DEVICES[].meas 주입 어댑터

   동백은 화면에 표시되는 대상이 아니다. 실측값 출처일 뿐이다.
   동백 공간명(안방 / 침실1 / 침실2 / 현관 / 화장실1)은 이 파일 안에만 존재한다.
   product / thermal / SPACES 는 절대 건드리지 않는다.

   P2 단계: 파일 신설만. 아직 어느 화면도 이 파일을 호출하지 않는다.
   ══════════════════════════════════════════════════════════════════ */

import { DEVICES } from '../data/moduleUnit.js';

/* 확정 매핑 — bedroom 은 '안방' 이 아니라 '침실1' 이다.
   침실1 이 재실감지(Radar, TEL 10) 센서를 보유하고 실측 데이터 상태가 유효하다. */
export const SPACE_MAP = {
  '거실':'living',
  '주방':'kitchen',
  '침실1':'bedroom',      // 확정 — Radar 보유, 실측 데이터 상태 반영
  '화장실1':'bath',
  // 미매핑(사용 안 함): 안방, 침실2, 현관
};

/* 계보 표기용 문자열 — meas.srcUnit 에 기록되어 화면에 노출될 수 있다.
   출처 단지·세대명은 화면에 쓰지 않는다 (규칙 §2). 표기는 계측 방식만 남긴다. */
const SRC_LABEL = 'SED 센서 5초 주기 실측';

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

/* 커튼(SEC): 별도 커튼 서버(192.168.0.51) 경유
   ThingsBoard 직접 조회 불가 — Lambda 구현 시 별도 처리 필요 */
const isCurtain = d => d.type === 'SEC';

export function adapt(payload) {
  // IoT API 응답 → DEVICES[].meas 에만 주입.
  // product / thermal / SPACES 는 절대 건드리지 않는다.
  // 데모 단계에서는 payload 가 없으면 목업값을 반환한다.
  const patch = payload ? fromPayload(payload) : mock();
  DEVICES.forEach(d => {
    if (isCurtain(d)) return;               // 커튼은 이 경로로 주입하지 않는다
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

/* 실 payload 경로 — 출처 공간명을 모듈러 공간으로 매핑한 뒤 기기 id 로 대조 */
function fromPayload(payload) {
  const ts = payload.ts || DEMO_TS;
  const srcUnit = SRC_LABEL;                  // payload.unit(출처 세대명)은 화면에 쓰지 않는다
  const patch = {};
  (payload.spaces || []).forEach(sp => {
    const space = SPACE_MAP[sp.nm];
    if (!space) return;                       // 미매핑 출처 공간은 버린다
    (sp.devices || []).forEach(dv => {
      const target = DEVICES.find(d => d.id === dv.id && d.space === space);
      if (!target || isCurtain(target)) return; // 이관 제외 기기 · 커튼은 버린다
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
    if (isCurtain(d)) return;                 // 커튼은 커튼 서버 소관 — 목업도 만들지 않는다
    const k = seedOf(d.id);
    const w = d.meas.on ? +(d.meas.w * (0.96 + rnd(k)*0.08)).toFixed(1) : 0;
    patch[d.id] = {
      w,
      kwhToday: d.meas.kwhToday,              // 산출값 — 어댑터가 만들지 않는다
      on: d.meas.on,
      ts: DEMO_TS,
      srcUnit: SRC_LABEL,
    };
  });
  return patch;
}
