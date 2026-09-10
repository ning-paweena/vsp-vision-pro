import * as THREE from './vendor/three/three.module.js';
const host=document.createElement('div');host.className='product-3d';host.setAttribute('role','img');host.setAttribute('aria-label','VSP three-dimensional product reveal');
document.querySelector('.portal-scene').append(host);
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
 for(const mesh of meta.meshes){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,...mesh.position),3));geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(buffer,...mesh.uv),2));if(mesh.normal?.[1])geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(buffer,...mesh.normal),3));else geo.computeVertexNormals();pivot.add(new THREE.Mesh(geo,materials[mesh.material]||new THREE.MeshStandardMaterial({color:0xaaaaaa})));}
 const box=new THREE.Box3().setFromObject(pivot),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());for(const mesh of pivot.children)mesh.position.sub(center);
 const extent=Math.max(size.x,size.y,size.z);pivot.scale.setScalar(2.15/extent);
 let current=0;
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.set(0,.45,Math.max(4.6,3.8/camera.aspect));camera.lookAt(0,0,0);camera.updateProjectionMatrix();}
 new ResizeObserver(resize).observe(host);resize();
 host.classList.add('ready');document.querySelector('.room-fallback').style.visibility='hidden';
 renderer.setAnimationLoop(()=>{const state=window.novaState||{};const target=state.reduced?0:Math.max(0,Math.min(1,((state.progress||0)-.85)/.145));current+=(target-current)*.09;
 // Three composed views: front three-quarter, right side, then rear three-quarter.
 const stops=[.65,1.5,2.35],segment=Math.min(1,Math.floor(current*2)),local=Math.min(1,current*2-segment),ease=local*local*(3-2*local);
 pivot.rotation.y=stops[segment]+(stops[segment+1]-stops[segment])*ease;pivot.rotation.x=.08;if((state.progress||0)>.69)renderer.render(scene,camera);});
 window.novaProduct={meshCount:meta.meshes.length,ready:true};
}catch(error){host.remove();console.error('Product 3D fallback:',error);window.novaProduct={ready:false,error:String(error)};}
