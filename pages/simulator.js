/* BEES Home v0.9 · pages/simulator.js — HM-15 에너지 시뮬레이터
   OpenModelica Buildings 12.1.0 물리 시뮬레이션 결과를 시각화한다.
   백엔드 없이 data/simCases.json 사전계산 결과를 정적으로 읽는다.
   전 수치의 계보는 「시뮬」 — 센서 실측이 아니다.                        */
import {fx} from '../data/module.js';
import {MODULE} from '../data/moduleUnit.js';
import {state} from '../data/state.js';
import {svgXY} from '../render/chart.js';
import {pgHead, renderPage, toast} from '../render/shell.js';

/* 방 표시 순서·색상 — 지시서 지정 (침실 파랑 · 욕실 초록 · 주방 노랑 · 거실 빨강) */
const ROOMS = [
  { k:'bedroom', nm:'침실', c:'#0877ed', ts:'T_bed', pv:'PMV_bed' },
  { k:'bath',    nm:'욕실', c:'#1a9c6a', ts:'T_bat', pv:'PMV_bat' },
  { k:'kitchen', nm:'주방', c:'#e0a015', ts:'T_kit', pv:'PMV_kit' },
  { k:'living',  nm:'거실', c:'#d64545', ts:'T_liv', pv:'PMV_liv' },
];

const PMV_LIMIT = 0.5;            // ISO 7730 쾌적범위 ±0.5

/* ── 케이스 로드 ────────────────────────────────────────────────────
   fetch 는 비동기라 렌더 시점에 준비되어 있어야 한다. index.html 부트에서
   한 번 await 하고, 이후 렌더는 이 캐시만 읽는다.                     */
let SIM = null;

export async function loadSimCases(){
  if(SIM) return SIM;
  try{
    const r = await fetch('./data/simCases.json', {cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    SIM = await r.json();
  }catch(e){
    SIM = { cases:[], error:String(e.message||e) };
  }
  return SIM;
}

export const simCases = () => (SIM && SIM.cases) || [];

/* ── 입력값 → 사전계산 케이스 매핑 ─────────────────────────────────
   케이스 id 가 `cool_24to26` 형태로 모드·온도를 담고 있다. data 가 null 인
   케이스도 id 만으로 매핑되므로, 「준비 중」인지 「케이스 없음」인지 구분된다.
   ※ 실서비스 전환 시 이 함수만 POST /api/simulate/run 호출로 바꾸면 된다.  */
const ID_RE = /^(cool|heat)_(\d+)to(\d+)$/;
export const caseSpecs = () => simCases().map(c => {
  const m = ID_RE.exec(c.id);
  return m ? { ...c, mode:m[1]==='cool'?'cooling':'heating', from:+m[2], to:+m[3] } : null;
}).filter(Boolean);

/* 모드별 허용 설정온도 범위 */
export const SIM_RANGE = { cooling:[16,32], heating:[14,28] };
const MODE_NM = { cooling:'냉방', heating:'난방' };

/* 입력 폼 기본값 — 첫 사전계산 케이스에 맞춘다 */
function formInit(){
  const s = caseSpecs()[0];
  const when = (s && s.data && s.data.when) || '2026-08-19 22:00';
  return { mode:(s&&s.mode)||'cooling', from:(s&&s.from)??24, to:(s&&s.to)??26,
           date:when.slice(0,10), time:when.slice(11,16) };
}
function form(){
  if(!state.simForm) state.simForm = formInit();
  return state.simForm;
}

export function simSet(k,v){
  const f = form();
  f[k] = (k==='from'||k==='to') ? Math.round(+v) : v;
  /* 모드를 바꾸면 온도가 새 범위를 벗어날 수 있다 — 즉시 클램프한다 */
  if(k==='mode'){
    const [lo,hi] = SIM_RANGE[f.mode];
    f.from = Math.min(hi, Math.max(lo, f.from));
    f.to   = Math.min(hi, Math.max(lo, f.to));
  }
  state.simRan = null;                       // 입력이 바뀌면 이전 결과를 버린다
  renderPage();
}

/* ── 실행 ── */
export function simRun(){
  const f = form();
  const [lo,hi] = SIM_RANGE[f.mode];
  const nm = MODE_NM[f.mode];
  const bad = v => !Number.isFinite(v) || v < lo || v > hi;

  if(bad(f.from) || bad(f.to)){
    state.simRan = { error:`${nm} 설정온도는 ${lo}~${hi}℃ 범위여야 합니다.` };
  }else if(f.from === f.to){
    state.simRan = { error:'현재온도와 바꿀온도가 같습니다. 다른 값을 입력하세요.' };
  }else{
    const hit = caseSpecs().find(c => c.mode===f.mode && c.from===f.from && c.to===f.to);
    state.simRan = hit ? { caseId:hit.id } : { unmapped:true };
  }
  renderPage();
  const r = state.simRan, hitCase = r.caseId && simCases().find(c => c.id === r.caseId);
  if(r.error) toast(r.error);
  else if(r.unmapped) toast(`${nm} ${f.from}→${f.to}℃ — 사전계산 조합에 없습니다`);
  else if(hitCase && !hitCase.data) toast(`${nm} ${f.from}→${f.to}℃ — 시뮬레이션 준비 중입니다`);
  else toast(`${nm} ${f.from}→${f.to}℃ 결과를 표시합니다`);
}

/* 화면에 표시할 케이스 — **실행하기 전에는 아무 결과도 보여주지 않는다.**
   simRan 에 caseId 가 있을 때만 결과를 낸다. 미실행·오류·미매핑은 전부 null. */
function curCase(){
  const r = state.simRan;
  if(!r || !r.caseId) return null;
  return simCases().find(c => c.id === r.caseId) || null;
}

/* ── 시계열 정리 ────────────────────────────────────────────────────
   구현규칙 4 : h===0 인 행이 여러 개면 첫 번째만 쓴다.
   (예열 3일 종료 시점이 중복 기록되는 경우가 있다)                    */
function rows(d){
  let seenZero = false;
  return (d.timeseries || []).filter(r => {
    if(r.h !== 0) return true;
    if(seenZero) return false;
    seenZero = true; return true;
  });
}

const pts = (rs, xk, yk) => rs.map(r => [r[xk], r[yk]]);

/* 눈금 — 데이터 범위에서 만든다 (임의 상수 없음).
   마지막 눈금이 최대값보다 작으면 선이 차트 위로 벗어나므로,
   눈금을 최대값 이상까지 채운 뒤 그 값을 y1 로 쓴다.                  */
function ticksOf(vals, n){
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const lo = Math.floor(mn), hi = Math.ceil(mx);
  const step = Math.max(1, Math.round((hi - lo) / n));
  const out = [];
  for(let v = lo; v < hi + step; v += step){ out.push(v); if(v >= mx) break; }
  return { y0:lo, y1:out[out.length-1], yTicks:out };
}

/* ══════════ HM-15 화면 ══════════ */
export function pgSimulator(){
  const cs = simCases();
  const c  = curCase();

  if(!cs.length) return pgHead('simulator','설정온도 변경 시 24시간 후 전력·온도·쾌적도 변화')+`
    <div class="empty">시뮬레이션 결과를 불러오지 못했습니다.
      ${SIM && SIM.error ? `<br><small>${SIM.error}</small>` : ''}
      <br><small>data/simCases.json 을 확인하세요.</small></div>`;

  const d  = c && c.data;
  const st = state.simRan;

  return pgHead('simulator','설정온도 변경 시 24시간 후 전력·온도·쾌적도 변화',
    `<span class="srcb sim">시뮬</span>`) + `
  <div class="simGrid">

    <!-- ══════════ 좌측 ══════════ -->
    <div class="simCol">
      <div class="card unitCard">
        <div><div class="un">🏢 ${MODULE.nm} · ${MODULE.bbox.w.toFixed(0)}×${MODULE.bbox.d.toFixed(0)}m</div>
          <div class="ua">인천 기상 기반 물리 시뮬레이션</div></div>
        <span class="pill info">사전계산 ${cs.filter(x=>x.data).length}건</span>
      </div>
      ${formCard()}
      ${d ? condCard(d) : ''}
    </div>

    <!-- ══════════ 중앙 ══════════ -->
    <div class="simCol">
      ${d ? powerCard(d) + cumChart(d) : stateCard(st, c, '전력 비교')}
    </div>

    <!-- ══════════ 우측 ══════════ -->
    <div class="simCol">
      ${d ? pmvCard(d) + tempChart(d) : stateCard(st, c, '쾌적도 판정')}
    </div>
  </div>`;
}

/* ── 입력 폼 ──────────────────────────────────────────────────────
   실서비스 전환 시 「시뮬레이션 실행」 핸들러만 POST 호출로 바꾼다.      */
function formCard(){
  const f = form(), st = state.simRan;
  const [lo,hi] = SIM_RANGE[f.mode];
  const err = st && st.error;
  const num = (k,label) => `
    <div class="simRow">
      <span class="srLbl">${label}</span>
      <span class="srIn">
        <input class="simNum" type="number" min="${lo}" max="${hi}" step="1" value="${f[k]}"
               oninput="simSet('${k}',this.value)" aria-label="${label}"><span class="srU">℃</span>
        <input class="simRange" type="range" min="${lo}" max="${hi}" step="1" value="${f[k]}"
               oninput="simSet('${k}',this.value)" aria-label="${label} 슬라이더">
      </span></div>`;
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">🎛</span>시뮬레이션 설정</span>
      <span class="cx">${lo}~${hi}℃</span></div>
    <div class="cb">
      <div class="simRow"><span class="srLbl">모드</span>
        <span class="srIn"><span class="seg" style="width:100%">
          ${Object.keys(MODE_NM).map(m=>`<button class="${f.mode===m?'on':''}"
            onclick="simSet('mode','${m}')" style="flex:1">${m==='cooling'?'❄':'🔥'} ${MODE_NM[m]}</button>`).join('')}
        </span></span></div>
      ${num('from','현재온도')}
      ${num('to','바꿀온도')}
      <div class="simRow"><span class="srLbl">날짜</span>
        <span class="srIn"><input class="simNum wide" type="date" value="${f.date}"
          oninput="simSet('date',this.value)" aria-label="날짜"></span></div>
      <div class="simRow"><span class="srLbl">시각</span>
        <span class="srIn"><input class="simNum wide" type="time" value="${f.time}"
          oninput="simSet('time',this.value)" aria-label="시각"></span></div>
      ${err?`<div class="simErr">⚠ ${err}</div>`:''}
      <button class="btn blue simRunBtn" onclick="simRun()">▶ 시뮬레이션 실행</button>
      <div class="srcNote">날짜·시각은 사전계산 결과에 반영되지 않습니다 — 실서비스 전환 시
        <b>POST /api/simulate/run</b> 파라미터로 전달됩니다.</div>
      <div class="sec" style="margin-top:10px">사전계산 보유 조합</div>
      <div class="simHave">${caseSpecs().map(s=>`
        <span class="shItem ${s.data?'':'na'}">${MODE_NM[s.mode]} ${s.from}→${s.to}℃
          ${s.data?'':'<small>준비 중</small>'}</span>`).join('')}</div>
    </div></div>`;
}

/* ── 시뮬레이션 기준 ── */
function condCard(d){
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">📐</span>시뮬레이션 기준</span></div>
    <div class="cb">
      <div class="kv"><span class="k">예열</span><span class="v">${d.conditions.warmup_days}일 <small>결과 제외</small></span></div>
      <div class="kv"><span class="k">착의량</span><span class="v">${d.conditions.clo} clo <small>여름</small></span></div>
      <div class="kv"><span class="k">활동량</span><span class="v">${d.conditions.met} met</span></div>
      <div class="kv"><span class="k">PMV 쾌적범위</span><span class="v">±${PMV_LIMIT} <small>ISO 7730</small></span></div>
      <div class="kv"><span class="k">냉방 EER</span><span class="v">${d.conditions.eer_coo}</span></div>
      <div class="kv"><span class="k">난방 COP</span><span class="v">${d.conditions.cop_hea}</span></div>
      <div class="kv"><span class="k">기상 데이터</span><span class="v">${d.conditions.weather}</span></div>
      <div class="kv"><span class="k">기준 시각</span><span class="v">${d.when}</span></div>
      <div class="srcNote">OpenModelica Buildings 12.1.0 물리 시뮬레이션 — 센서 실측이 아닙니다</div>
    </div></div>`;
}

/* ── 결과가 없을 때 — 카드를 숨기지 않고 사유를 남긴다 ──────────────
   상태 4가지를 구분한다.
     ① 입력 오류        범위 밖 · 현재=바꿀
     ② 준비 중          매핑된 케이스는 있으나 data 가 아직 null
     ③ 조합 없음        사전계산 목록에 그 조합 자체가 없다
     ④ 대기             아직 실행하지 않았다                            */
function stateCard(st, c, title){
  const f = form(), nm = MODE_NM[f.mode];
  const combo = `${nm} ${f.from} → ${f.to}℃`;
  let pill, icon = '🧪', head = combo, body;
  if(st && st.error){
    pill = '입력 확인'; icon = '⚠'; head = '입력값을 확인하세요'; body = st.error;
  }else if(st && st.caseId && c && !c.data){
    pill = '준비 중';
    body = `이 조합은 <b>시뮬레이션 준비 중입니다</b>.<br>OpenModelica 해석 결과가 확보되면 자동으로 표시됩니다.`;
  }else if(st && st.unmapped){
    pill = '조합 없음';
    body = `사전계산에 <b>없는 조합</b>입니다.<br>좌측 「사전계산 보유 조합」에서 값을 확인하세요.`;
  }else{
    pill = '대기';
    body = `<b>시뮬레이션 실행</b>을 누르면 결과가 표시됩니다.`;
  }
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">🧪</span>${title}</span>
      <span class="pill ${st&&st.error?'warn':'mute'}">${pill}</span></div>
    <div class="cb" style="padding:26px 12px;text-align:center">
      <div style="font-size:26px;opacity:.35">${icon}</div>
      <div style="font-weight:800;margin-top:8px">${head}</div>
      <div style="font-size:11.5px;color:var(--muted2);margin-top:6px;line-height:1.7">${body}</div>
    </div></div>`;
}

/* ── 전력 비교 ── */
function powerCard(d){
  const p = d.power, save = p.diff_pct < 0;
  const cell = (v, u, col) => `<td class="n" style="${col ? `color:${col};font-weight:800` : ''}">${v}<small>${u}</small></td>`;
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">⚡</span>전력 비교</span>
      <span class="cx">${d.label} · 24시간</span></div>
    <div class="cb">
      <table class="tbl simTbl"><thead><tr>
        <th>항목</th><th class="n">유지</th><th class="n">변경</th><th class="n">차이</th>
      </tr></thead><tbody>
        <tr><td class="str">24시간 전력</td>
          ${cell(fx(p.keep_kwh,2),' kWh')}${cell(fx(p.change_kwh,2),' kWh')}
          ${cell((p.diff_kwh>0?'+':'')+fx(p.diff_kwh,2),' kWh', save?'#1a9c6a':'#d64545')}</tr>
        <tr><td class="str">피크 전력</td>
          ${cell(fx(p.keep_peak_kw,2),' kW')}${cell(fx(p.change_peak_kw,2),' kW')}
          ${cell(fx(p.change_peak_kw-p.keep_peak_kw,2),' kW',
                 p.change_peak_kw<p.keep_peak_kw?'#1a9c6a':'#d64545')}</tr>
      </tbody></table>
      <div class="simHero ${save?'ok':'bad'}">
        <span class="shl">${save?'절감률':'증가율'}</span>
        <span class="shv">${(p.diff_pct>0?'+':'')+fx(p.diff_pct,1)}<small>%</small></span>
      </div>
    </div></div>`;
}

/* ── 누적전력 시계열 ── */
function cumChart(d){
  const rs = rows(d);
  const all = rs.flatMap(r => [r.kWh_keep, r.kWh_change]);
  const ax  = ticksOf(all, 5);
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">📈</span>누적 전력</span>
      <span class="cx">설정 변경 후 경과시간</span></div>
    <div class="cb">
      ${svgXY([
        { pts:pts(rs,'h','kWh_keep'),   c:'#96a1b0', dash:true },
        { pts:pts(rs,'h','kWh_change'), c:'#0877ed', fillTo:0 },
      ], 560, 200, { x0:0, x1:24, xTicks:[0,4,8,12,16,20,24], ...ax })}
      <div class="simLegend">
        <span><i class="lgLine dash" style="background:#96a1b0"></i>유지 (${d.from}℃)</span>
        <span><i class="lgLine" style="background:#0877ed"></i>변경 (${d.to}℃)</span>
        <span class="lgAx">가로 경과시간 h · 세로 누적전력 kWh</span>
      </div>
      ${cumNote(d, rs)}
    </div></div>`;
}

/* 시계열 끝값과 요약 수치가 다르면 이유를 밝힌다 (규칙 §9) */
function cumNote(d, rs){
  const last = rs[rs.length-1];
  if(!last) return '';
  const gapK = Math.abs(last.kWh_keep - d.power.keep_kwh);
  if(gapK < 0.05) return '';
  return `<div class="srcNote">그래프는 표본 19점(0.08~2h 간격) 기준 누적이고,
    위 표는 해석 전 구간 적분값입니다 — 끝값이 ${fx(last.kWh_keep,2)} / ${fx(d.power.keep_kwh,2)} kWh 로 다릅니다.</div>`;
}

/* ── 쾌적도 판정 ── */
function pmvCard(d){
  const ok = v => Math.abs(v) <= PMV_LIMIT;
  const sg = v => (v>0?'+':'')+fx(v,2);
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">🌡</span>쾌적도 판정</span>
      <span class="cx">PMV · 24시간 후</span></div>
    <div class="cb">
      <table class="tbl simTbl"><thead><tr>
        <th>공간</th><th class="n">유지</th><th class="n">변경</th><th>판정</th>
      </tr></thead><tbody>
        ${ROOMS.map(r => { const v = d.pmv_24h[r.k]; if(!v) return '';
          const good = ok(v.change);
          return `<tr>
            <td class="str"><i class="lgDot" style="background:${r.c}"></i>${r.nm}</td>
            <td class="n">${sg(v.keep)}</td>
            <td class="n" style="font-weight:800">${sg(v.change)}</td>
            <td><span class="pill ${good?'ok':'warn'}">${v.grade}${good?' ✓':''}</span></td>
          </tr>`; }).join('')}
      </tbody></table>
      <div class="simScale">
        <span>−${PMV_LIMIT} 서늘</span><span>0 중립</span><span>+${PMV_LIMIT} 따뜻</span>
      </div>
      <div class="srcNote">ISO 7730 쾌적범위 −${PMV_LIMIT} ~ +${PMV_LIMIT} · 착의 ${d.conditions.clo} clo 기준</div>
    </div></div>`;
}

/* ── 실내온도 시계열 (4방 × 유지/변경) ── */
function tempChart(d){
  const rs = rows(d);
  const all = ROOMS.flatMap(r => rs.flatMap(x => [x[r.ts+'_keep'], x[r.ts+'_change']]));
  const ax  = ticksOf(all, 5);
  const series = [];
  ROOMS.forEach(r => {
    series.push({ pts:pts(rs,'h',r.ts+'_keep'),   c:r.c, dash:true, wd:1.3 });
    series.push({ pts:pts(rs,'h',r.ts+'_change'), c:r.c, wd:1.8 });
  });
  return `<div class="card">
    <div class="ch"><span class="ct"><span class="ci">🌡</span>실내온도</span>
      <span class="cx">${d.from}℃ → ${d.to}℃</span></div>
    <div class="cb">
      ${svgXY(series, 560, 200, { x0:0, x1:24, xTicks:[0,4,8,12,16,20,24], ...ax })}
      <div class="simLegend">
        ${ROOMS.map(r => `<span><i class="lgDot" style="background:${r.c}"></i>${r.nm}</span>`).join('')}
        <span class="lgAx">점선 유지 · 실선 변경</span>
      </div>
      <div class="simDelta">${ROOMS.map(r => { const t = d.temp_24h[r.k]; if(!t) return '';
        return `<div><span class="sdN">${r.nm}</span>
          <span class="sdV">${fx(t.keep,1)} → <b style="color:${r.c}">${fx(t.change,1)}</b>℃</span>
          <span class="sdD">${(t.diff>0?'+':'')+fx(t.diff,2)}</span></div>`; }).join('')}</div>
    </div></div>`;
}

/* 인라인 핸들러가 참조하는 심볼을 window 에 등록 (동작 유지) */
Object.assign(window,{pgSimulator,simSet,simRun,loadSimCases,simCases,caseSpecs,SIM_RANGE});
