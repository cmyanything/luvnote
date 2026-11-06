import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.smoothstep;
export const graphemes = (text: string) => typeof Intl.Segmenter === 'function'
  ? Array.from(new Intl.Segmenter('th', {granularity:'grapheme'}).segment(text), item => item.segment)
  : Array.from(text);

/** A single textured relief, rather than two independently projected lighthouse images. */
export class BeyondWorld {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  art!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  edges: THREE.Mesh[] = [];
  water!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  beacon!: THREE.Group;
  beam!: THREE.Mesh;
  memory!: THREE.Group;
  texture!: THREE.Texture;
  frame = 0;
  progress = 0;
  disposed = false;
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  last = 0;
  frameTimes: number[] = [];
  pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
  lookX = 0;
  lookY = 0;
  targetX = 0;
  targetY = 0;
  messagePlane?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  messageTexture?: THREE.CanvasTexture;
  software = false;
  lastRender = 0;
  dirty = true;
  constructor(private canvas: HTMLCanvasElement, private onLost: () => void) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    const gl=this.renderer.getContext(), debug=gl.getExtension('WEBGL_debug_renderer_info');
    this.software=!!debug && /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)));
    if(this.software)this.pixelRatio=Math.min(this.pixelRatio,.75);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setClearColor(0x102a2d);
    this.scene.background = new THREE.Color(0x102a2d);
    this.canvas.addEventListener('webglcontextlost', this.contextLost);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.visibility);
  }
  async init(url: string) {
    const texture = await new THREE.TextureLoader().loadAsync(url);
    if (this.disposed) { texture.dispose(); return; }
    this.texture = texture;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.renderer.initTexture(texture);
    const geometry = new THREE.PlaneGeometry(3.4, 5.1, 48, 72);
    const p = geometry.attributes.position;
    const base = new Float32Array(p.array as ArrayLike<number>);
    const relief = new Float32Array(base.length), bend = new Float32Array(base.length);
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      const lighthouse = Math.exp(-((x / .47) ** 2 + ((y - .25) / 1.06) ** 2));
      const island = Math.exp(-((x / 1.2) ** 2 + ((y + 1.3) / .62) ** 2));
      relief[i * 3] = x; relief[i * 3 + 1] = y;
      relief[i * 3 + 2] = lighthouse * 1.25 + island * .55;
      bend[i * 3] = x * .91; bend[i * 3 + 1] = y * (1 - .035 * Math.abs(x));
      bend[i * 3 + 2] = Math.pow(Math.abs(x) / 1.7, 1.65) * 1.65;
    }
    geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(relief, 3), new THREE.Float32BufferAttribute(bend, 3)];
    this.art = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    this.scene.add(this.art);
    const paper = new THREE.MeshBasicMaterial({ color: 0xefe5ce, side: THREE.DoubleSide });
    const parts: [number, number, number, number][] = [[.18,5.48,-1.79,0],[.18,5.48,1.79,0],[3.75,.18,0,2.64],[3.75,.48,0,-2.79]];
    for (const [w,h,x,y] of parts) {
      const edgeGeometry = new THREE.PlaneGeometry(w,h,24,24);
      const a = edgeGeometry.attributes.position, curved = new Float32Array(a.array as ArrayLike<number>);
      for(let i=0;i<a.count;i++){const worldX=a.getX(i)+x;curved[i*3]=a.getX(i)*.91;curved[i*3+1]=a.getY(i);curved[i*3+2]=Math.pow(Math.abs(worldX)/1.7,1.65)*1.65;}
      edgeGeometry.morphAttributes.position=[new THREE.Float32BufferAttribute(curved,3)];
      const edge = new THREE.Mesh(edgeGeometry, paper);
      edge.position.set(x,y,.045); this.scene.add(edge); this.edges.push(edge);
    }
    const waterGeo = new THREE.PlaneGeometry(20, 18, 24, 24);
    const waterMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uTime: {value:0}, uOpacity:{value:0}, uRipple:{value:0}, uMap:{value:texture} }, vertexShader: `uniform float uTime; uniform float uRipple; varying vec2 vUv; varying float vWave; void main(){vUv=uv; vec3 p=position; float w=sin(p.x*1.4+uTime*.65)*.075+sin(p.y*1.7-uTime*.48)*.045; w+=sin(length(p.xy)*6.-uTime*5.)*uRipple*.12; p.z+=w; vWave=w; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`, fragmentShader: `uniform float uOpacity; uniform float uTime; uniform sampler2D uMap; varying vec2 vUv; varying float vWave; void main(){vec2 sampleUv=vec2(fract(vUv.x*2.+vWave*.03), .015+vUv.y*.18); vec3 photo=texture2D(uMap,sampleUv).rgb; vec3 c=photo*vec3(.6,.83,.79)+vec3(.01,.04,.04);float a=uOpacity*smoothstep(0.,.25,vUv.y)*.87; gl_FragColor=vec4(c,a);}` });
    this.water = new THREE.Mesh(waterGeo,waterMat);this.water.rotation.x=-Math.PI/2;this.water.position.set(0,-2.45,3);this.scene.add(this.water);
    this.beacon = new THREE.Group();this.beacon.position.set(0,.29,1.35);
    const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xffd184, transparent:true, opacity:.015, depthWrite:false, side:THREE.DoubleSide });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0,.72,4.5,32,1,true),beamMaterial);this.beam.rotation.z=-Math.PI/2;this.beam.position.x=2.25;this.beacon.add(this.beam);this.scene.add(this.beacon);
    this.memory = new THREE.Group();
    const brass = new THREE.MeshStandardMaterial({color:0xc79b59,metalness:.55,roughness:.35}),glass = new THREE.MeshBasicMaterial({color:0xffde8c,transparent:true,opacity:.8});
    const core=new THREE.Mesh(new THREE.OctahedronGeometry(.22),glass);this.memory.add(core);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.018,8,40),brass);ring.rotation.x=Math.PI/2;this.memory.add(ring);
    const ring2=new THREE.Mesh(new THREE.TorusGeometry(.3,.018,8,40),brass);ring2.rotation.y=Math.PI/2;this.memory.add(ring2);
    this.memory.scale.setScalar(.24);this.memory.position.set(.55,-1.5,1.5);this.scene.add(this.memory);this.scene.add(new THREE.AmbientLight(0xffffff,1));
    this.resize();this.paint(0);this.renderer.compile(this.scene,this.camera);this.last=performance.now();this.frame=requestAnimationFrame(this.tick);
  }
  resize = () => {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);
    if(this.art) this.paint(this.progress);
  };
  paint(p: number) {
    if (!this.art) return;
    this.progress=clamp(p,0,1);const t=this.progress;this.dirty=true;
    const finaleZ=Math.min(7.45,3.4/(2*Math.tan(THREE.MathUtils.degToRad(19))*this.camera.aspect));
    this.camera.position.set(t*.36+this.lookX,t*.35+this.lookY,THREE.MathUtils.lerp(14,Math.max(finaleZ,3.3),t));
    this.camera.lookAt(0,-.08,0);
    this.art.morphTargetInfluences![0]=t*(this.reduced?.45:1);
    const curve=this.reduced?0:Math.sin(t*Math.PI)*.85;
    this.art.morphTargetInfluences![1]=curve;
    for(const edge of this.edges) edge.morphTargetInfluences![0]=curve;
    this.edges[0].position.x=-1.79-t*.7;this.edges[1].position.x=1.79+t*.7;
    this.edges[0].rotation.y=-t*.9;this.edges[1].rotation.y=t*.9;
    this.edges[2].position.y=2.64+t*.6;this.edges[3].position.y=-2.79-t*.8;
    this.edges[2].rotation.x=t*.65;this.edges[3].rotation.x=-t*.65;
    this.water.material.uniforms.uOpacity.value=smooth(t,.4,.9)*.4;
    this.water.visible=t>.4;
    this.beacon.visible=false;this.memory.visible=t>.72;
  }
  explore(x: number,y: number) {
    if(this.reduced)return;
    this.targetX=clamp(x,-1,1)*.55;this.targetY=clamp(y,-1,1)*.23;
    this.water.material.uniforms.uRipple.value=1;
  }
  resetLook() { this.targetX=0;this.targetY=0; }
  showMessage(to: string, from: string, content: string, page = 0) {
    if(!this.messagePlane) {
      const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=720;
      this.messageTexture=new THREE.CanvasTexture(canvas);this.messageTexture.colorSpace=THREE.SRGBColorSpace;
      this.messagePlane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:this.messageTexture,transparent:true,depthWrite:false}));
      this.scene.add(this.messagePlane);
    }
    const texture=this.messageTexture!, c=texture.image as HTMLCanvasElement, ctx=c.getContext('2d')!;
    ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.fillStyle='#fff5da';ctx.shadowColor='#001920';ctx.shadowBlur=18;ctx.strokeStyle='#09282c';ctx.lineWidth=7;ctx.lineJoin='round';
    const draw=(text:string,x:number,y:number)=>{ctx.strokeText(text,x,y,840);ctx.fillText(text,x,y,840)};
    ctx.font='bold 58px sans-serif';draw(`ถึง ${to || 'เธอ'}`,512,100);
    ctx.font='54px sans-serif';const text=graphemes(content).slice(page*90,(page+1)*90);let line='',y=200;
    for(const char of text){const next=line+char;if(ctx.measureText(next).width>840){draw(line,512,y);line=char;y+=70}else line=next;}if(line)draw(line,512,y);
    ctx.font='42px sans-serif';draw(`จาก ${from || 'คนที่คิดถึงเธอ'}`,512,615);
    texture.needsUpdate=true;
    const forward=new THREE.Vector3();this.camera.getWorldDirection(forward);this.messagePlane.position.copy(this.camera.position).addScaledVector(forward,2.8);this.messagePlane.quaternion.copy(this.camera.quaternion);
    const width=Math.min(2.8,2*2.8*Math.tan(THREE.MathUtils.degToRad(19))*this.camera.aspect*.88);this.messagePlane.scale.set(width,width*.703,1);this.messagePlane.visible=true;this.dirty=true;
  }
  hideMessage() { if(this.messagePlane)this.messagePlane.visible=false;this.dirty=true; }
  tick = (now: number) => {
    if(this.disposed || document.hidden)return;
    const delta = now-this.last;this.last=now;
    if (delta<250 && this.progress>.85) {
      this.frameTimes.push(delta);
      if(this.frameTimes.length>=120) {
        const slow=this.frameTimes.filter(x=>x>32).length;
        if(slow>36 && this.pixelRatio>.7) { this.pixelRatio=Math.max(.7,this.pixelRatio-.2);this.renderer.setPixelRatio(this.pixelRatio);this.resize(); }
        this.frameTimes=[];
      }
    }
    if(this.water && !this.reduced) this.water.material.uniforms.uTime.value=now*.001;
    if(this.water){this.water.material.uniforms.uRipple.value*=.985;}
    if(this.progress>.85&&!this.reduced){const amount=1-Math.exp(-Math.min(delta,50)*.006);this.lookX+=(this.targetX-this.lookX)*amount;this.lookY+=(this.targetY-this.lookY)*amount;this.paint(this.progress);}
    if(this.memory && this.progress>.72&&!this.reduced){this.memory.rotation.y=now*.00025;this.memory.position.y=-1.5+Math.sin(now*.001)*.045;}
    if((this.dirty||(!this.reduced&&this.progress>.4))&&(!this.software||now-this.lastRender>=30)) {this.renderer.render(this.scene,this.camera);this.lastRender=now;this.dirty=false;}
    this.frame=requestAnimationFrame(this.tick);
  };
  visibility = () => {cancelAnimationFrame(this.frame);if(!document.hidden&&!this.disposed){this.last=performance.now();this.frame=requestAnimationFrame(this.tick);}};
  contextLost = (event: Event) => {event.preventDefault();this.onLost();};
  dispose() {
    this.disposed=true;cancelAnimationFrame(this.frame);document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('resize',this.resize);this.canvas.removeEventListener('webglcontextlost',this.contextLost);
    const materials=new Set<THREE.Material>();this.scene.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();if(m.material){for(const v of Array.isArray(m.material)?m.material:[m.material])materials.add(v);}});materials.forEach(m=>m.dispose());this.texture?.dispose();this.messageTexture?.dispose();this.renderer.dispose();
  }
}
