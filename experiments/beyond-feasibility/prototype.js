import * as THREE from 'three';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x132d30);document.body.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,100);camera.position.set(0,0,10);
const texture=await new THREE.TextureLoader().loadAsync('../../template-lab/public/images/flagship-lighthouse-v1.webp');texture.colorSpace=THREE.SRGBColorSpace;
const geo=new THREE.PlaneGeometry(4,6,100,150),material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}),mesh=new THREE.Mesh(geo,material);scene.add(mesh);
const position=geo.attributes.position, original=new Float32Array(position.array);let progress=0;
function update(){for(let i=0;i<position.count;i++){const x=original[i*3],y=original[i*3+1];const tower=Math.exp(-((x/.54)**2+((y-.35)/1.3)**2)*1.1);const island=Math.exp(-((x/1.45)**2+((y+1.55)/.65)**2));position.setZ(i,progress*(tower*1.35+island*.62));}position.needsUpdate=true;camera.position.set(progress*.9,progress*.12,10-progress*1.8);camera.lookAt(0,0,0);renderer.render(scene,camera);}
document.querySelector('input').addEventListener('input',e=>{progress=Number(e.target.value)/100;update()});window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);update()});window.feasibility={renderer,scene,camera};update();

