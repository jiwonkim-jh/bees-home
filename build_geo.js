/* ══════════════════════════════════════════════════════════════════
   OBJ → data/geometry3d.js 빌드
   입력 : ModularHouseInternal_Internal.obj (구조) + _Appiances.obj (기기)
   출력 : 미터 단위 · 바닥 y=0 · 면별 공간/기기 태그 · 법선 포함
   ══════════════════════════════════════════════════════════════════ */
const fs=require('fs'), readline=require('readline'), path=require('path');
const [DIR,OUT]=process.argv.slice(2);

/* 모델 좌표(cm) 기준 공간 영역 — 칸막이 벽 세그먼트에서 유도 */
const ZONES=[
  {id:'living',  x0:  15, x1: 445, z0:   80, z1: 440},
  {id:'kitchen', x0:  15, x1: 445, z0: -295, z1:  80},
  {id:'bedroom', x0:-435, x1:   0, z0:   40, z1: 440},
  {id:'bath',    x0:-435, x1:-240, z0: -215, z1:  40},
];
/* 기기 그룹 → DEVICES id */
const DEVMAP={
  TV:'SEO_35', AirConditionerStand:'SEO_36', AirConditionerdWall:'SEO_22',
  Refrigerator:'SEO_42', CeilingLight01:'SEL_6', CeilingLight02:'SEL_3',
  CeilingLight03:'SEL_12', CeilingLight06:'SEL_15',
};
/* 냉기 토출 볼륨 → 해당 에어컨의 jet 시각화 */
const JETMAP={ AirConditionerStand_Cold:'SEO_36', AirConditionerdWall_Cold:'SEO_22' };
/* 구조 요소 분류 (렌더 레이어) */
const LAYER={ Flooring:'floor', Ceiling:'ceiling', Ceiling_Bathroom:'ceiling',
  Ceiling_Coffered:'ceiling', Wall:'wall', BathroomTile:'wall', Wardrobe:'fix',
  Frame:'frame', Door:'door', Enter:'porch' };

const FLOOR_Y=23;                                   // 바닥 마감면 (cm)
const zoneOf=(x,z)=>{
  for(const Z of ZONES) if(x>=Z.x0&&x<=Z.x1&&z>=Z.z0&&z<=Z.z1) return Z.id;
  return null;
};
(async()=>{
  const V=[], FACES=[];
  const load=async(file,kind)=>{
    const base=V.length;
    const rl=readline.createInterface({input:fs.createReadStream(path.join(DIR,file)),crlfDelay:Infinity});
    let cur=null, localV=[];
    for await(const L of rl){
      if(L.startsWith('v ')){const p=L.split(/\s+/);localV.push([+p[1],+p[2],+p[3]]);}
      else if(/^[og]\s/.test(L)) cur=L.slice(2).trim();
      else if(L.startsWith('f ')){
        const idx=L.trim().split(/\s+/).slice(1).map(t=>{
          let i=parseInt(t.split('/')[0],10); return i<0?localV.length+i:i-1;});
        FACES.push({g:cur,kind,idx:idx.map(i=>i+base)});
      }
    }
    localV.forEach(p=>V.push(p));
  };
  await load('ModularHouseInternal_Internal.obj','struct');
  await load('ModularHouseInternal_Appiances.obj','dev');

  /* 미터 변환 · 바닥 y=0 */
  const P=V.map(p=>[+(p[0]/100).toFixed(3), +((p[1]-FLOOR_Y)/100).toFixed(3), +(p[2]/100).toFixed(3)]);

  const out=[]; const stat={};
  FACES.forEach(f=>{
    const pts=f.idx.map(i=>P[i]).filter(Boolean);
    if(pts.length<3)return;
    /* 중심 · 법선 */
    const c=[0,0,0]; pts.forEach(p=>{c[0]+=p[0];c[1]+=p[1];c[2]+=p[2];});
    c[0]/=pts.length; c[1]/=pts.length; c[2]/=pts.length;
    const a=pts[0], b=pts[1], d=pts[2];
    const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]], v=[d[0]-a[0],d[1]-a[1],d[2]-a[2]];
    let nx=u[1]*v[2]-u[2]*v[1], ny=u[2]*v[0]-u[0]*v[2], nz=u[0]*v[1]-u[1]*v[0];
    const len=Math.hypot(nx,ny,nz)||1; nx/=len; ny/=len; nz/=len;
    /* 태그 */
    const cx=c[0]*100, cz=c[2]*100;
    let layer, sp=null, dev=null, jet=null;
    if(f.kind==='dev'){
      dev=DEVMAP[f.g]||null; jet=JETMAP[f.g]||null;
      layer=jet?'jet':'device';
      sp=zoneOf(cx,cz);
    }else{
      layer=LAYER[f.g]||'other';
      sp=zoneOf(cx,cz);
    }
    stat[layer]=(stat[layer]||0)+1;
    out.push({g:f.g,l:layer,sp,dev,jet,
      n:[+nx.toFixed(3),+ny.toFixed(3),+nz.toFixed(3)],
      p:pts.map(p=>[p[0],p[1],p[2]])});
  });

  /* 공간별 실측 bbox */
  const spBox={};
  out.filter(f=>f.sp&&(f.l==='wall'||f.l==='floor')).forEach(f=>{
    const b=spBox[f.sp]=spBox[f.sp]||{x0:1e9,x1:-1e9,y1:-1e9,z0:1e9,z1:-1e9};
    f.p.forEach(p=>{b.x0=Math.min(b.x0,p[0]);b.x1=Math.max(b.x1,p[0]);
      b.z0=Math.min(b.z0,p[2]);b.z1=Math.max(b.z1,p[2]);b.y1=Math.max(b.y1,p[1]);});
  });

  /* 파일 출력 — 좌표는 소수 3자리로 반올림해 크기를 줄인다 */
  const body=`/* BEES Home · data/geometry3d.js — 자동 생성 파일. 직접 수정하지 말 것.
   출처 : BEES Home 화면설계/OBJ확장자/ModularHouseInternal_{Internal,Appiances}.obj
   변환 : cm → m · 바닥면 y=0 · Y-up 유지 · 면별 공간(sp)/기기(dev) 태그
   면 ${out.length}개 (${Object.entries(stat).map(([k,v])=>k+' '+v).join(' · ')})
   ZONES : 칸막이 벽 세그먼트에서 유도한 공간 경계 (모델 cm 좌표)
${ZONES.map(z=>`     ${z.id.padEnd(8)} x ${z.x0}~${z.x1}  z ${z.z0}~${z.z1}`).join('\n')}
   ─ 유도된 공간별 실측 치수 (m)
${Object.entries(spBox).map(([k,b])=>`     ${k.padEnd(8)} ${(b.x1-b.x0).toFixed(2)} × ${(b.z1-b.z0).toFixed(2)} × h ${b.y1.toFixed(2)}`).join('\n')}
*/
export const GEO_ZONES=${JSON.stringify(ZONES)};
export const GEO_BOX=${JSON.stringify(spBox,null,0)};
export const GEO=${JSON.stringify(out)};
`;
  fs.writeFileSync(OUT,body,'utf8');
  console.log('면 '+out.length+'개 → '+OUT+'  ('+(fs.statSync(OUT).size/1024).toFixed(0)+' KB)');
  console.log('레이어: '+Object.entries(stat).map(([k,v])=>k+' '+v).join(' · '));
  console.log('공간별 실측:');
  Object.entries(spBox).forEach(([k,b])=>console.log('  '+k.padEnd(8)+(b.x1-b.x0).toFixed(2)+' × '+(b.z1-b.z0).toFixed(2)+' m · 최고 y '+b.y1.toFixed(2)));
  const unmapped=[...new Set(out.filter(f=>f.kind!=='struct'&&f.l==='device'&&!f.dev).map(f=>f.g))];
  if(unmapped.length)console.log('DEVICES 미매핑 기기 그룹: '+unmapped.join(', '));
})();
