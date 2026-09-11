import * as THREE from './vendor/three/three.module.js';
const host=document.createElement('div');host.className='assembly-view';host.setAttribute('role','region');host.setAttribute('aria-label','VSP three-dimensional product reveal');
const figure=document.querySelector('#collection .wide-image');figure.append(host);
try {
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.01,100),pivot=new THREE.Group();scene.add(pivot);
 scene.add(new THREE.HemisphereLight(0xffffff,0x777780,3));
 for(const [x,y,z,power] of [[3,4,5,5],[-4,2,1,3],[0,3,-4,4]]){const light=new THREE.DirectionalLight(0xffffff,power);light.position.set(x,y,z);scene.add(light);}
 // A studio environment gives the real glass and metal broad reflected highlights.
 const studio=new THREE.Scene();studio.background=new THREE.Color(0x999999);
 for(const [x,y,z,sx,sy] of [[-3,3,2,3,5],[4,2,0,2,6],[0,5,-2,7,2]]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),new THREE.MeshBasicMaterial({color:0xffffff}));panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);}
 const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(studio);scene.environment=env.texture;pmrem.dispose();
 const [meta,buffer]=await Promise.all([fetch('/assets/apple/model/model.json').then(r=>r.json()),fetch('/assets/apple/model/geometry.bin').then(r=>r.arrayBuffer())]);
 const loader=new THREE.TextureLoader();const textures=new Map();
 function texture(file,color=false){if(!file)return null;const key=file+color;if(!textures.has(key)){const t=loader.load('/assets/apple/model/'+file);if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.set(key,t);}return textures.get(key);}
 const materials={};for(const [id,m] of Object.entries(meta.materials)){materials[id]=new THREE.MeshStandardMaterial({color:new THREE.Color(...(m.diffuseColor||[.8,.8,.8])),map:texture(m.diffuseColorMap,true),roughness:m.roughness??.45,roughnessMap:texture(m.roughnessMap),metalness:m.metallic??.05,metalnessMap:texture(m.metallicMap),normalMap:texture(m.normalMap),side:THREE.DoubleSide});}
 // Lift near-black surfaces to graphite while retaining textures and reflections.
 for(const material of Object.values(materials)){
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',"#include <map_fragment>\nfloat shadeLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));\ndiffuseColor.rgb += vec3(max(0.0, 0.085 - shadeLuma));");};
  material.customProgramCacheKey=()=> 'graphite-contrast-v1';
 }
 for(const mesh of meta.meshes){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,...mesh.position),3));geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(buffer,...mesh.uv),2));if(mesh.normal?.[1])geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(buffer,...mesh.normal),3));else geo.computeVertexNormals();pivot.add(new THREE.Mesh(geo,materials[mesh.material]||new THREE.MeshStandardMaterial({color:0xaaaaaa})));}
 const box=new THREE.Box3().setFromObject(pivot),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());for(const mesh of pivot.children)mesh.position.sub(center);
 const extent=Math.max(size.x,size.y,size.z);pivot.scale.setScalar(2/extent);
 const parts=pivot.children.map((mesh,index)=>{mesh.geometry.computeBoundingBox();const c=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());return {mesh,home:mesh.position.clone(),center:c,index};});
 const ordered=[...parts].sort((a,b)=>b.mesh.geometry.boundingBox.getSize(new THREE.Vector3()).length()-a.mesh.geometry.boundingBox.getSize(new THREE.Vector3()).length());
 ordered.forEach((part,i)=>{part.tileScale=Math.min(1,extent*.17/Math.max(...part.mesh.geometry.boundingBox.getSize(new THREE.Vector3()).toArray()));part.grid=new THREE.Vector3((i%13-6)*extent*.24,(5.8-Math.floor(i/13))*extent*.2,0);});
 let target=0,amount=0,grid=false,yaw=-.6,pitch=.12,visible=false;
 const controls=document.createElement('div');controls.className='assembly-controls';controls.innerHTML='<button type="button" data-assemble>Assemble</button><label>Explode <output>0%</output><input type="range" min="0" max="100" value="0" aria-label="Explode VSP"></label><button type="button" data-pieces aria-pressed="false">All pieces</button><button type="button" data-reset>Reset view</button>';host.append(controls);
 const hint=document.createElement('p');hint.className='assembly-hint';hint.textContent='Drag to rotate · Explore the individual parts';host.append(hint);
 const slider=controls.querySelector('input'),output=controls.querySelector('output'),all=controls.querySelector('[data-pieces]');
 function setAmount(value){target=value;slider.value=Math.round(value*100);output.value=Math.round(value*100)+'%';}
 slider.addEventListener('input',()=>{grid=false;all.setAttribute('aria-pressed','false');setAmount(+slider.value/100);});
 controls.querySelector('[data-assemble]').onclick=()=>{grid=false;all.setAttribute('aria-pressed','false');setAmount(0);};
 all.onclick=()=>{grid=!grid;all.setAttribute('aria-pressed',String(grid));setAmount(grid?1:0);};
 let drag=null;const canvas=renderer.domElement;canvas.style.touchAction='pan-y';
 controls.querySelector('[data-reset]').onclick=()=>{
  // Restore every view control; the render loop eases parts and camera back home.
  drag=null;
  grid=false;
  all.setAttribute('aria-pressed','false');
  setAmount(0);
  yaw=-.6;
  pitch=.12;
 };
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.004,-.65,.65);drag={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 new ResizeObserver(resize).observe(host);resize();new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;}).observe(host);
 host.classList.add('ready');figure.classList.add('has-assembly');
 const destination=new THREE.Vector3();let spread=0;
 renderer.setAnimationLoop(()=>{if(!visible)return;const reduced=window.novaState?.reduced;amount+=(target-amount)*(reduced?1:.08);spread+=((grid?1:0)-spread)*(reduced?1:.08);
 for(const part of parts){const radial=part.center.clone().sub(center);if(radial.lengthSq()>.000001)radial.normalize();destination.copy(part.home).addScaledVector(radial,extent*.55*amount);const flat=part.grid.clone().addScaledVector(part.center,-part.tileScale);part.mesh.scale.setScalar(1+(part.tileScale-1)*spread);destination.lerp(flat,spread);part.mesh.position.copy(destination);}
 pivot.rotation.set(pitch*(1-spread),yaw*(1-spread),0);const distance=Math.max(5,3.9/camera.aspect)*(1+amount*.65+spread*.5);camera.position.set(0,.35,distance);camera.lookAt(0,0,0);renderer.render(scene,camera);});
 window.novaAssembly={ready:true,meshCount:parts.length};

}catch(error){host.remove();console.error('Product 3D fallback:',error);window.novaAssembly={ready:false,error:String(error)};}
