/* BEES Home v0.9 · pages/simulator.js — HM-15 에너지 시뮬레이터
   OpenModelica Buildings 12.1.0 사전계산 결과(JSON 4케이스)를 시각화한다.
   백엔드 없음 · 실시간 해석 호출 없음 — data/simulator/*.json 정적 로드.
   전 수치의 계보는 「시뮬」이며 센서 실측이 아니다.
   기준 문서 : BEES_HOME_에너지시뮬레이터_Cursor지시서.md §3~§6            */
import {MYUNIT, RATE, fx, occupancyOf, won} from '../data/module.js';
import {state} from '../data/state.js';
import {svgXY} from '../render/chart.js';
import {pgHead, renderPage, toast} from '../render/shell.js';

/* ── 사전계산 케이스 (지시서 §4) ──────────────────────────────────── */
export const PRESET_CASES = [
  { mode:'냉방', from:24, to:26, file:'cold_24to26.json', tag:'절감' },
  { mode:'냉방', from:24, to:18, file:'cold_24to18.json', tag:'증가' },
  { mode:'난방', from:27, to:24, file:'heat_27to24.json', tag:'절감' },
  { mode:'난방', from:22, to:25, file:'heat_22to25.json', tag:'증가' },
];

/* 모드별 허용 설정온도 범위 (지시서 §3-2) */
export const SIM_RANGE = { '냉방':[16,32], '난방':[14,28] };

/* 공간 표시 순서·색상 (지시서 §3-4 : 침실 파랑 · 욕실 주황 · 주방 노랑 · 거실 빨강) */
const ROOMS = [
  { nm:'침실', c:'#0877ed' },
  { nm:'욕실', c:'#e8730c' },
  { nm:'주방', c:'#e0a015' },
  { nm:'거실', c:'#d64545' },
];

const PMV_LIMIT = 0.5;                      // ISO 7730 쾌적범위 ±0.5
const DOWNSAMPLE_H = 0.5;                   // 30분 간격 표시 (원본 5분 · 지시서 §3-3)

/* 시뮬레이션 기준 — 4케이스 JSON 의 conditions 가 동일하다.
   「항상 표시」 요구(지시서 §3-2 카드 3) 때문에 로드 전에도 쓸 값이 필요하다. */
const BASE_COND = {
  preheat:'3일 (결과 제외)', clothing:'0.5 clo (냉방) / 1.0 clo (난방)',
  activity:'1.2 met', pmvRange:'±0.5 ISO 7730', eer:3.2, cop:3.5,
  weather:'San Francisco TMY3', model:'OpenModelica Buildings 12.1.0',
};

/* 전기요금 환산 — 주택용 누진 2단계 전력량요금 단가.
   data/module.js RATE.energy[1] (214.6 원/kWh) 과 같은 값을 쓴다.
   ※ 전력량요금만 곱한 참고용 추정값이다. 기본요금·기후환경·연료비조정·
     부가세·전력기금은 넣지 않았다 (HM-07 절감 시나리오는 이들을 포함한
     한계단가 258.8 원/kWh 를 쓰므로 두 화면의 금액이 다르다).           */
const TARIFF_WON = RATE.energy[1];
const BILL_DAYS  = 30;
const monthWon = diffKwh => Math.round(diffKwh * BILL_DAYS * TARIFF_WON);

/* ── 케이스 JSON 로드 (파일 단위 캐시) ────────────────────────────── */
const CACHE = {};
export async function loadCase(file){
  if(CACHE[file]) return CACHE[file];
  const r = await fetch('./data/simulator/' + file, {cache:'no-store'});
  if(!r.ok) throw new Error(`${file} — HTTP ${r.status}`);
  CACHE[file] = await r.json();
  return CACHE[file];
}

/* ── PMV 판정 (지시서 §5) ─────────────────────────────────────────── */
export function pmvJudge(pmv){
  if(Math.abs(pmv) <= PMV_LIMIT) return { label:'쾌적',   cls:'ok',     c:'#1a9c6a' };
  if(pmv < -PMV_LIMIT)           return { label:'서늘함', cls:'info',   c:'#0877ed' };
  return                                { label:'더움',   cls:'danger', c:'#d64545' };
}

/* ── 케이스 매칭 — 정확 일치만 ─────────────────────────────────────
   근사 매칭은 쓰지 않는다. 입력값이 사전계산 4조합과 정확히 같지 않으면
   결과를 만들지 않고 조합 버튼을 쓰도록 안내한다.
   (없는 조건을 이웃 케이스 결과로 대신 보여주면 오해를 준다)           */
export const NO_MATCH_MSG =
  '사전계산 조합을 선택하세요. 위 4개 버튼 중 하나를 클릭하면 즉시 결과를 확인할 수 있습니다.';

export function matchCase(mode, fromTemp, toTemp){
  return PRESET_CASES.find(c => c.mode===mode && c.from===fromTemp && c.to===toTemp) || null;
}

/* ── 입력 폼 상태 ──────────────────────────────────────────────────── */
function formInit(){
  const c = PRESET_CASES[0];
  const now = new Date();                   // 기본값 = 오늘·현재 시각 (지시서 §3-2)
  const p2 = n => String(n).padStart(2,'0');
  return { mode:c.mode, from:c.from, to:c.to,
           date:`${now.getFullYear()}-${p2(now.getMonth()+1)}-${p2(now.getDate())}`,
           time:`${p2(now.getHours())}:${p2(now.getMinutes())}` };
}
function form(){
  if(!state.simForm) state.simForm = formInit();
  return state.simForm;
}

export function simSet(k,v){
  const f = form();
  f[k] = (k==='from'||k==='to') ? Math.round(+v) : v;
  if(k==='mode'){                           // 모드가 바뀌면 새 범위로 클램프
    const [lo,hi] = SIM_RANGE[f.mode];
    f.from = Math.min(hi, Math.max(lo, f.from));
    f.to   = Math.min(hi, Math.max(lo, f.to));
  }
  state.simRun = null;                      // 입력이 바뀌면 이전 결과를 버린다
  renderPage();
}

/* ── 실행 — 케이스가 확정된 뒤 JSON 을 받아 결과를 세운다 ── */
async function loadInto(hit){
  state.simRun = { loading:true, hit };
  renderPage();
  try{
    const data = await loadCase(hit.file);
    state.simRun = { hit, data };
  }catch(e){
    state.simRun = { error:`결과를 불러오지 못했습니다 — ${e.message}` };
  }
  renderPage();
  const r = state.simRun;
  if(r.error) toast(r.error);
  else toast(`${hit.mode} ${hit.from}→${hit.to}℃ 결과를 표시합니다`);
}

/* 실행 버튼 — 입력값이 4조합과 정확히 일치할 때만 결과를 낸다.
   일치하지 않으면 결과 없이 안내 메시지만 표시한다.                     */
export function simRun(){
  const f = form();
  const hit = matchCase(f.mode, f.from, f.to);
  if(!hit){
    state.simRun = { noMatch:true };
    renderPage();
    toast(NO_MATCH_MSG);
    return;
  }
  return loadInto(hit);
}

/* 사전계산 조합 버튼 — 입력값을 세팅하고 즉시 결과 표시 (지시서 §3-2) */
export function simPreset(i){
  const c = PRESET_CASES[i]; if(!c) return;
  const f = form();
  f.mode = c.mode; f.from = c.from; f.to = c.to;
  return loadInto(c);
}

/* ── 시계열 정리 ───────────────────────────────────────────────────
   h===0 행이 중복이면 첫 번째만 쓰고, 30분 간격으로 내려 표시한다.     */
function rows(d){
  let zero = false;
  const uniq = (d.timeseries || []).filter(r => {
    if(r.h !== 0) return true;
    if(zero) return false;
    zero = true; return true;
  });
  const out = [];
  let next = 0;
  uniq.forEach((r,i) => {
    if(r.h >= next - 1e-6 || i === uniq.length-1){ out.push(r); next = r.h + DOWNSAMPLE_H; }
  });
  return out;
}

/* 눈금 — 데이터 범위에서 만든다. 마지막 눈금은 최대값 이상까지 채운다. */
function ticksOf(vals, n){
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const lo = Math.floor(mn), hi = Math.ceil(mx);
  const step = Math.max(1, Math.round((hi - lo) / n));
  const out = [];
  for(let v = lo; v < hi + step; v += step){ out.push(v); if(v >= mx) break; }
  return { y0:lo, y1:out[out.length-1], yTicks:out };
}

const SIM = `<span class="srcb sim">시뮬</span>`;

/* ══════════ HM-15 화면 ══════════ */
export function pgSimulator(){
  const r = state.simRun;
  const d = r && r.data;
  return pgHead('simulator','설정온도 변경 시 24시간 후 전력·온도·쾌적도 변화', SIM) + `
  <div class="simGrid">
    <div class="simCol">${unitCard()}${formCard()}${condCard(d)}</div>
    <div class="simCol">${d ? centerResult(r,d) : centerEmpty(r)}</div>
    <div class="simCol">${d ? pmvCard(d) + tempChart(d) : ''}</div>
  </div>`;
}

/* ── 좌측 카드 1 : 세대 정보 (HM-01 과 동일 형태) ── */
function unitCard(){
  const occ = occupancyOf();
  return `<div class="card unitCard">
    <div><div class="un">🏢 ${MYUNIT.nm}</div>
      <div class="ua">전용 ${MYUNIT.area}㎡ · ${MYUNIT.household}인 가구 · ${MYUNIT.movedIn} 입주</div></div>
    ${occ ? `<span class="pill ${occ.on?'ok':'mute'} dot">${occ.on?'재실 중':'부재 중'}</span>`
          : `<span class="pill mute">재실 센서 없음</span>`}
  </div>`;
}

/* ── 좌측 카드 2 : 시뮬레이션 설정 ── */
function formCard(){
  const f = form(), r = state.simRun;
  const [lo,hi] = SIM_RANGE[f.mode];
  const num = (k,label) => `
    <div class="simRow"><span class="srLbl">${label}</span>
      <span class="srIn">
        <input class="simNum" type="number" min="${lo}" max="${hi}" step="1" value="${f[k]}"
               oninput="simSet('${k}',this.value)" aria-label="${label}"><span class="srU">℃</span>
        <input class="simRange" type="range" min="${lo}" max="${hi}" step="1" value="${f[k]}"
               oninput="simSet('${k}',this.value)" aria-label="${label} 슬라이더">
      </span></div>`;
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">🎛</span>시뮬레이션 설정</span>
      <span class="cx">${lo}–${hi}℃</span></div>
    <div class="cb">
      <div class="simRow"><span class="srLbl">모드</span>
        <span class="srIn"><span class="seg" style="width:100%">
          ${Object.keys(SIM_RANGE).map(m => `<button class="${f.mode===m?'on':''}" style="flex:1"
            onclick="simSet('mode','${m}')">${m==='냉방'?'☀':'🔥'} ${m}</button>`).join('')}
        </span></span></div>
      ${num('from','현재온도')}
      ${num('to','바꿀온도')}
      <div class="simRow"><span class="srLbl">날짜</span>
        <span class="srIn"><input class="simNum wide" type="date" value="${f.date}"
          oninput="simSet('date',this.value)" aria-label="날짜"></span></div>
      <div class="simRow"><span class="srLbl">시각</span>
        <span class="srIn"><input class="simNum wide" type="time" value="${f.time}"
          oninput="simSet('time',this.value)" aria-label="시각"></span></div>
      ${r && r.noMatch ? `<div class="simErr">${NO_MATCH_MSG}</div>` : ''}
      ${r && r.error ? `<div class="simErr">⚠ ${r.error}</div>` : ''}
      <button class="btn blue simRunBtn" onclick="simRun()">▶ 시뮬레이션 실행</button>

      <div class="sec" style="margin-top:12px">사전계산 보유 조합</div>
      <div class="simPresets">${PRESET_CASES.map((c,i) => {
        const on = r && r.hit && r.hit.file===c.file;
        return `<button class="simPreset ${on?'on':''}" onclick="simPreset(${i})">
          <b>${c.mode} ${c.from}→${c.to}℃</b>
          <span class="pill ${c.tag==='절감'?'ok':'danger'}">${c.tag}</span></button>`;}).join('')}</div>
      <div class="srcNote">결과는 위 4개 조합에 대해서만 제공됩니다.
        실행 버튼은 입력값이 이 중 하나와 정확히 같을 때만 결과를 표시합니다.
        날짜·시각은 사전계산 결과에 반영되지 않습니다.</div>
    </div></div>`;
}

/* ── 좌측 카드 3 : 시뮬레이션 기준 (항상 표시) ── */
function condCard(d){
  const c = (d && d.conditions) || BASE_COND;
  const row = (k,v) => `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">📐</span>시뮬레이션 기준</span></div>
    <div class="cb">
      ${row('예열', c.preheat)}
      ${row('착의량', c.clothing)}
      ${row('활동량', c.activity)}
      ${row('PMV 쾌적범위', c.pmvRange)}
      ${row('냉방 EER', c.eer)}
      ${row('난방 COP', c.cop)}
      ${row('기상 데이터', c.weather)}
      <div class="srcNote">${c.model} 물리 시뮬레이션 — 센서 실측이 아닙니다</div>
    </div></div>`;
}

/* ── 중앙 : 실행 전 · 로딩 · 미일치 · 오류 ── */
function centerEmpty(r){
  const box = (icon,title,desc) => `<div class="card"><div class="cb simBlank">
    <div class="sbI">${icon}</div><div class="sbT">${title}</div>
    <div class="sbD">${desc}</div></div></div>`;
  if(r && r.loading)
    return box('⏳','결과를 불러오는 중입니다',`${r.hit.mode} ${r.hit.from}→${r.hit.to}℃`);
  if(r && r.error)
    return box('⚠','결과를 표시할 수 없습니다', r.error);
  if(r && r.noMatch)
    return box('🧪','사전계산 조합이 아닙니다', NO_MATCH_MSG);
  return box('🧪','시뮬레이션 결과가 없습니다',
    '좌측 <b>사전계산 보유 조합</b> 4개 버튼 중 하나를 클릭하세요.');
}

/* ── 중앙 : 결과 ── */
function centerResult(r,d){
  const m = d.meta, p = d.summary.power24h, pk = d.summary.peakPower;
  const save = p.diff < 0;
  const col  = save ? '#1a9c6a' : '#d64545';
  const rm   = d.summary.rooms;
  /* 전체 쾌적도 — 4개 방 판정이 모두 같으면 그 값, 다르면 가장 나쁜 쪽 */
  const judges = ROOMS.map(x => rm[x.nm] && pmvJudge(rm[x.nm].pmvChange)).filter(Boolean);
  const worst = judges.find(j => j.label !== '쾌적') || judges[0] || pmvJudge(0);
  const allOk = judges.every(j => j.label === '쾌적');
  const sg = (v,n=2) => (v>0?'+':'') + fx(v,n);

  return `
  <div class="card">
    <div class="ch"><span class="ct"><span class="ci">🧪</span>${m.mode} ${m.fromTemp}℃ → ${m.toTemp}℃ 변경 시나리오</span>${SIM}</div>
    <div class="cb">
      <div class="simSub">${m.date} ${m.time} 기준 · 이후 24시간 · ${m.season}</div>
      <div class="simKpi">
        <div class="skCard">
          <div class="skT">24시간 전력사용량</div>
          <div class="skR"><span>유지</span><b>${fx(p.keep,3)} kWh</b></div>
          <div class="skR"><span>변경</span><b>${fx(p.change,3)} kWh</b></div>
          <div class="skD" style="color:${col}">${sg(p.diff,2)} kWh <small>(${sg(p.diffPct,1)}%)</small></div>
          ${/* 월 전기요금 환산 — 24시간 차이 × 30일 × 전력량요금 */''}
          <div class="skBill" style="color:${col}">월 약 <b>${won(Math.abs(monthWon(p.diff)))}원</b>
            ${save?'절감':'증가'} 예상</div>
          <div class="skNote">누진 2단계(${fx(TARIFF_WON,1)}원/kWh) 기준 참고용 추정값</div>
        </div>
        <div class="skCard">
          <div class="skT">피크 전력</div>
          <div class="skR"><span>유지</span><b>${fx(pk.keep,3)} kW</b></div>
          <div class="skR"><span>변경</span><b>${fx(pk.change,3)} kW</b></div>
          <div class="skD" style="color:${pk.diff<0?'#1a9c6a':'#d64545'}">${sg(pk.diff,3)} kW</div>
        </div>
        <div class="skCard">
          <div class="skT">쾌적도 판정</div>
          <div class="skR"><span>전체</span><b style="color:${worst.c}">${worst.label}${allOk?' ✓':''}</b></div>
          <div class="skD" style="font-size:11px;color:var(--muted2);font-weight:600">
            ${allOk ? '4개 공간 모두 쾌적' : `${judges.filter(j=>j.label!=='쾌적').length}개 공간 범위 밖`}</div>
        </div>
      </div>
    </div></div>
  ${cumChart(d,save)}`;
}

/* ── 중앙 : 누적전력 시계열 ── */
function cumChart(d,save){
  const rs = rows(d), m = d.meta;
  const ax = ticksOf(rs.flatMap(x => [x.cumKeep, x.cumChange]), 5);
  const cc = save ? '#1a9c6a' : '#d64545';
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">📈</span>누적 전력</span>
      <span class="cx">설정 변경 후 경과시간</span></div>
    <div class="cb">
      ${svgXY([
        { pts:rs.map(x=>[x.h,x.cumKeep]),   c:'#96a1b0', dash:true },
        { pts:rs.map(x=>[x.h,x.cumChange]), c:cc, fillTo:0 },
      ], 560, 210, { x0:0, x1:24, xTicks:[0,4,8,12,16,20,24], ...ax })}
      <div class="simLegend">
        <span><i class="lgLine dash"></i>유지 (${m.fromTemp}℃)</span>
        <span><i class="lgLine" style="background:${cc}"></i>변경 (${m.toTemp}℃)</span>
        <span class="lgAx">세로 kWh · 30분 간격 (원본 5분 ${d.timeseries.length}행)</span>
      </div>
    </div></div>`;
}

/* ── 우측 카드 1 : 공간별 PMV 쾌적도 ── */
function pmvCard(d){
  const rm = d.summary.rooms;
  const sg = v => (v>0?'+':'') + fx(v,2);
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">🌡</span>공간별 쾌적도</span>${SIM}</div>
    <div class="cb">
      ${/* 유지·변경 두 열 각각에 PMV 값 + 판정 라벨을 붙인다 */''}
      <table class="tbl simTbl pmvTbl"><thead><tr>
        <th>공간</th><th>유지</th><th>변경</th>
      </tr></thead><tbody>
        ${ROOMS.map(x => { const v = rm[x.nm]; if(!v) return '';
          const cell = pmv => { const j = pmvJudge(pmv);
            return `<td><span class="pmvV">${sg(pmv)}</span>
              <span class="pill ${j.cls}">${j.label}${j.label==='쾌적'?' ✓':''}</span></td>`; };
          return `<tr>
            <td class="str"><i class="lgDot" style="background:${x.c}"></i>${x.nm}</td>
            ${cell(v.pmvKeep)}${cell(v.pmvChange)}
          </tr>`;}).join('')}
      </tbody></table>
      <div class="simScale"><span>−${PMV_LIMIT} 서늘함</span><span>0 중립</span><span>+${PMV_LIMIT} 더움</span></div>
      <div class="srcNote">ISO 7730 쾌적범위 −${PMV_LIMIT} ~ +${PMV_LIMIT} ·
        착의량 ${d.meta.mode==='냉방'?'0.5':'1.0'} clo 기준</div>
    </div></div>`;
}

/* ── 우측 카드 2 : 실내온도 시계열 (4공간 × 유지/변경) ── */
function tempChart(d){
  const rs = rows(d), m = d.meta;
  const all = rs.flatMap(x => ROOMS.flatMap(o => [x.tempKeep[o.nm], x.tempChange[o.nm]]));
  const ax  = ticksOf(all, 5);
  const series = [];
  ROOMS.forEach(o => {
    series.push({ pts:rs.map(x=>[x.h,x.tempKeep[o.nm]]),   c:o.c, dash:true, wd:1.3 });
    series.push({ pts:rs.map(x=>[x.h,x.tempChange[o.nm]]), c:o.c, wd:1.8 });
  });
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">🌡</span>실내온도</span>
      <span class="cx">${m.fromTemp}℃ → ${m.toTemp}℃</span>${SIM}</div>
    <div class="cb">
      ${svgXY(series, 560, 210, { x0:0, x1:24, xTicks:[0,4,8,12,16,20,24], ...ax })}
      <div class="simLegend">
        ${ROOMS.map(o => `<span><i class="lgDot" style="background:${o.c}"></i>${o.nm}</span>`).join('')}
        <span class="lgAx">점선 유지 · 실선 변경</span>
      </div>
      <div class="simDelta">${ROOMS.map(o => { const v = d.summary.rooms[o.nm]; if(!v) return '';
        return `<div><span class="sdN">${o.nm}</span>
          <span class="sdV">${fx(v.tempKeep,1)} → <b style="color:${o.c}">${fx(v.tempChange,1)}</b>℃</span>
          <span class="sdD">${(v.tempDiff>0?'+':'')+fx(v.tempDiff,2)}</span></div>`;}).join('')}</div>
    </div></div>`;
}

/* 인라인 핸들러가 참조하는 심볼을 window 에 등록 (동작 유지) */
Object.assign(window,{pgSimulator,simSet,simRun,simPreset,matchCase,pmvJudge,loadCase,
  PRESET_CASES,SIM_RANGE});
