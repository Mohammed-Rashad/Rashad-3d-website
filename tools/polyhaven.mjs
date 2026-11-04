import fs from 'fs'; import path from 'path';
const [,,out,...ids]=process.argv; const UA={headers:{'User-Agent':'rashad-site-builder'}};
for(const id of ids){
  const f=await (await fetch('https://api.polyhaven.com/files/'+id,UA)).json();
  const g=f.gltf['1k'].gltf; const dir=path.join(out,id); fs.mkdirSync(dir,{recursive:true});
  const get=async(url,p)=>{const b=Buffer.from(await (await fetch(url,UA)).arrayBuffer());fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);};
  await get(g.url,path.join(dir,path.basename(g.url)));
  for(const [rel,v] of Object.entries(g.include||{})) await get(v.url,path.join(dir,rel));
  console.log('ok',id);
}
