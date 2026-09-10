import http from 'node:http';
import {createReadStream, existsSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.svg':'image/svg+xml','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.bin':'application/octet-stream'};
http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');return;}
  const size=statSync(file).size, headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache'};
  if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),size-1):size-1;if(start>=size||start>end){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res);return;}
  res.writeHead(200,{...headers,'Content-Length':size});if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
}).listen(3000,'127.0.0.1',()=>console.log('NOVA X2 ready at http://127.0.0.1:3000'));
