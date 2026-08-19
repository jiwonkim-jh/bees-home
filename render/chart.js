/* BEES Home v0.9 · render/chart.js — 인라인 SVG 차트 헬퍼 (외부 라이브러리 없음) */
import {clamp} from '../data/module.js';

/* ══════════════════════════════════════════════════════════════════
   차트 헬퍼 (외부 라이브러리 없음)
   ══════════════════════════════════════════════════════════════════ */
export function svgArea(vals,w,h,col){
  const mx=Math.max(...vals)||1, n=vals.length;
  const pt=vals.map((v,i)=>[i/(n-1)*w, h-2-(v/mx)*(h-6)]);
  const d=pt.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const gid='g'+col.slice(1)+n;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" height="${h}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${col}" stop-opacity=".28"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${d} L${w},${h} L0,${h} Z" fill="url(#${gid})"/>
    <path d="${d}" fill="none" stroke="${col}" stroke-width="1.8" vector-effect="non-scaling-stroke"
      stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

export function svgBars(vals,w,h,colFn,hi){
  const mx=Math.max(...vals)||1, n=vals.length, bw=w/n;
  const bar=Math.min(bw*0.68,34), off=(bw-bar)/2;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" height="${h}">`+
    vals.map((v,i)=>{const bh=v>0?Math.max(1.5,(v/mx)*(h-3)):0;
      return `<rect x="${(i*bw+off).toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${bar.toFixed(1)}"
        height="${bh.toFixed(1)}" rx="1.5" fill="${colFn?colFn(v,i):(hi===i?'#062b5c':'#0877ed')}"/>`;}).join('')+
    `</svg>`;
}

export function svgMulti(series,w,h,limit){
  const all=series.flatMap(s=>s.v).concat(limit?[limit.v]:[]);
  const mx=Math.max(...all)||1, mn=Math.min(...all,0);
  const sc=v=>h-4-((v-mn)/((mx-mn)||1))*(h-10);
  return `<svg class="miniChart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" height="${h}">`+
    [0.25,0.5,0.75].map(f=>`<line x1="0" y1="${(h*f).toFixed(1)}" x2="${w}" y2="${(h*f).toFixed(1)}"
      stroke="#eef2f7" stroke-width="1"/>`).join('')+
    (limit?`<line x1="0" y1="${sc(limit.v).toFixed(1)}" x2="${w}" y2="${sc(limit.v).toFixed(1)}"
      stroke="${limit.c}" stroke-width="1.4" stroke-dasharray="5 4"/>`:'')+
    series.map(s=>{const n=s.v.length;
      const d=s.v.map((v,i)=>`${i?'L':'M'}${(i/(n-1)*w).toFixed(1)},${sc(v).toFixed(1)}`).join(' ');
      return `<path d="${d}" fill="none" stroke="${s.c}" stroke-width="1.8" vector-effect="non-scaling-stroke"
        stroke-linejoin="round" stroke-linecap="round" ${s.dash?'stroke-dasharray="5 4"':''}/>`;}).join('')+`</svg>`;
}

/* ── x 간격이 일정하지 않은 시계열 ─────────────────────────────────
   svgArea·svgMulti 는 인덱스를 x 로 쓴다. 시뮬레이션 결과는 표본 간격이
   0.083h ~ 2h 로 불균일하므로 (x,y) 쌍을 그대로 받는 헬퍼가 따로 필요하다.
     series : [{pts:[[x,y],...], c:색, dash:점선여부, fillTo:다른계열index}]
     ax     : {x0,x1,y0,y1, xTicks:[], yTicks:[], xUnit, yUnit}          */
export function svgXY(series,w,h,ax){
  const PL=42,PR=8,PT=8,PB=20;                       // 축 여백
  const iw=w-PL-PR, ih=h-PT-PB;
  const sx=v=>PL+(v-ax.x0)/((ax.x1-ax.x0)||1)*iw;
  const sy=v=>PT+ih-(v-ax.y0)/((ax.y1-ax.y0)||1)*ih;
  const path=pts=>pts.map((p,i)=>`${i?'L':'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(' ');
  let out='';
  /* 격자 + y 눈금 */
  (ax.yTicks||[]).forEach(t=>{
    out+=`<line x1="${PL}" y1="${sy(t).toFixed(1)}" x2="${w-PR}" y2="${sy(t).toFixed(1)}" stroke="#eef2f7" stroke-width="1"/>
      <text x="${PL-5}" y="${(sy(t)+3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#96a1b0">${t}</text>`;
  });
  /* x 눈금 */
  (ax.xTicks||[]).forEach(t=>{
    out+=`<text x="${sx(t).toFixed(1)}" y="${h-6}" text-anchor="middle" font-size="9" fill="#96a1b0">${t}</text>`;
  });
  /* 두 계열 사이 영역 채우기 (fillTo 지정 시) */
  series.forEach((s,i)=>{
    if(s.fillTo===undefined)return;
    const b=series[s.fillTo]; if(!b)return;
    const d=path(s.pts)+' '+b.pts.slice().reverse()
      .map(p=>`L${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(' ')+' Z';
    out+=`<path d="${d}" fill="${s.c}" fill-opacity=".12"/>`;
  });
  series.forEach(s=>{
    out+=`<path d="${path(s.pts)}" fill="none" stroke="${s.c}" stroke-width="${s.wd||1.8}"
      vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"
      ${s.dash?'stroke-dasharray="5 4"':''}/>`;
  });
  /* 축선 */
  out+=`<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT+ih}" stroke="#dde4ec" stroke-width="1"/>
    <line x1="${PL}" y1="${PT+ih}" x2="${w-PR}" y2="${PT+ih}" stroke="#dde4ec" stroke-width="1"/>`;
  return `<svg class="miniChart" viewBox="0 0 ${w} ${h}" width="100%" height="${h}"
    preserveAspectRatio="none" role="img">${out}</svg>`;
}

export function gaugeArc(pct,label,sub){
  const R=52,cx=68,cy=64, a0=Math.PI*0.82, a1=Math.PI*2.18;
  const ang=a0+(a1-a0)*clamp(pct,0,1);
  const p=(a,r)=>[cx+Math.cos(a)*r, cy+Math.sin(a)*r];
  const arc=(f,t,r,col,wd)=>{const s=p(f,r),e=p(t,r);
    return `<path d="M${s[0].toFixed(1)},${s[1].toFixed(1)} A${r},${r} 0 ${t-f>Math.PI?1:0} 1 ${e[0].toFixed(1)},${e[1].toFixed(1)}"
      fill="none" stroke="${col}" stroke-width="${wd}" stroke-linecap="round"/>`;};
  const seg=(a1-a0)/3;
  return `<svg viewBox="0 0 136 106" width="136" height="106">
    ${arc(a0,a0+seg,R,'#1a9c6a',9)}${arc(a0+seg*1.02,a0+seg*2,R,'#e08a12',9)}${arc(a0+seg*2.02,a1,R,'#d64545',9)}
    <circle cx="${p(ang,R)[0].toFixed(1)}" cy="${p(ang,R)[1].toFixed(1)}" r="6" fill="#fff" stroke="#062b5c" stroke-width="2.5"/>
    <text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="19" font-weight="800" fill="#152033">${label}</text>
    <text x="${cx}" y="${cy+20}" text-anchor="middle" font-size="9.5" fill="#6d7787">${sub}</text></svg>`;
}

export function donut(segs,size,inner){
  const R=size/2, r=inner, cx=R, cy=R, tot=segs.reduce((a,s)=>a+s.v,0)||1;
  let acc=-Math.PI/2, out='';
  segs.forEach(s=>{const a=s.v/tot*Math.PI*2, e=acc+a;
    const p=(ang,rr)=>[cx+Math.cos(ang)*rr, cy+Math.sin(ang)*rr];
    const s1=p(acc,R-2),e1=p(e,R-2),s2=p(e,r),e2=p(acc,r);
    out+=`<path d="M${s1[0].toFixed(1)},${s1[1].toFixed(1)} A${R-2},${R-2} 0 ${a>Math.PI?1:0} 1 ${e1[0].toFixed(1)},${e1[1].toFixed(1)}
      L${s2[0].toFixed(1)},${s2[1].toFixed(1)} A${r},${r} 0 ${a>Math.PI?1:0} 0 ${e2[0].toFixed(1)},${e2[1].toFixed(1)} Z" fill="${s.c}"/>`;
    acc=e;});
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${out}</svg>`;
}


/* 인라인 핸들러가 참조하는 심볼을 window 에 등록 (동작 유지) */
Object.assign(window,{svgArea,svgBars,svgMulti,svgXY,gaugeArc,donut});
