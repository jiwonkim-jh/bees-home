/* BEES Home v0.9 로컬 실행용 정적 서버 (Node 내장 모듈만 사용)
   ES 모듈은 file:// 에서 CORS 로 차단되므로 http 로 열어야 한다.
     실행 :  node serve.js        →  http://localhost:8790
   외부 라이브러리·설치 불필요.                                        */
const http=require('http'), fs=require('fs'), path=require('path');
const ROOT=__dirname, PORT=8790;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css',
            '.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/index.html';
  const file=path.join(ROOT,path.normalize(p).replace(/^([/\\])+/,''));
  if(!file.startsWith(ROOT)){res.writeHead(403);return res.end('403');}
  fs.readFile(file,(err,buf)=>{
    if(err){res.writeHead(404);return res.end('404 '+p);}
    res.writeHead(200,{'Content-Type':(MIME[path.extname(file)]||'application/octet-stream')+'; charset=utf-8'});
    res.end(buf);
  });
}).listen(PORT,()=>console.log('BEES Home v0.9  →  http://localhost:'+PORT));
