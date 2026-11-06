import { useEffect, useRef } from 'react';
import { assessRenderer, pixelScale, prepareTexture, subscribeFrame } from './cinematicRuntime';

type Props = { image: string; active: boolean; onCovered: () => void; onFinish: () => void; onUnavailable: () => void };
const vertex = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
in vec2 v_uv;out vec4 outColor;
uniform sampler2D u_scene;uniform vec2 u_resolution;uniform float u_progress;uniform float u_time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 cover(vec2 uv){float screen=u_resolution.x/u_resolution.y;float image=1024./1536.;vec2 q=uv-.5;if(screen>image)q.y*=image/screen;else q.x*=screen/image;return clamp(q+.5,vec2(.001),vec2(.999));}
void main(){
 vec2 uv=v_uv;float aspect=u_resolution.x/u_resolution.y;vec2 p=(uv-vec2(.5,.49))*vec2(aspect,1.);float d=length(p);vec2 dir=p/max(d,.0001);
 float open=smoothstep(.05,.85,u_progress);float radius=.03+open*1.02;float edge=exp(-pow((d-radius)/.035,2.));float inside=1.-smoothstep(radius-.08,radius+.025,d);
 float twist=inside*(1.-smoothstep(.55,1.,u_progress))*(.21+.13*sin(u_time*2.));float wave=sin(d*32.-u_time*3.5)*.012*inside*(1.-open*.4);
 float ang=twist*(1.-d/(radius+.1));mat2 rot=mat2(cos(ang),-sin(ang),sin(ang),cos(ang));vec2 world=(rot*p)*(1.-inside*open*.42)+dir*wave;
 vec2 sampleUV=cover(world/vec2(aspect,1.)+vec2(.5,.49));vec2 spread=dir/vec2(aspect,1.)*edge*.008;
 vec3 base=texture(u_scene,sampleUV).rgb;vec3 refractCol=vec3(texture(u_scene,sampleUV+spread).r,base.g,texture(u_scene,sampleUV-spread).b);
 vec3 color=mix(base,refractCol,clamp(edge*.8,0.,1.));color*=1.-inside*.10;color+=edge*vec3(.95,.69,.31)*1.1;
 float ripple=exp(-pow((d-radius-.08)/.014,2.))*.25;color+=ripple*vec3(.9,.62,.29);
 float waterline=p.y+.24+.07*sin(p.x*5.-u_time*1.4);float current=exp(-abs(waterline)*55.)*exp(-abs(p.x)*1.8)*inside*sin(3.14159*open);color+=current*vec3(.72,.42,.12)*.55;
 vec2 grid=floor((p+2.)*28.);vec2 cell=fract((p+2.)*28.)-.5;float h=hash(grid);vec2 drift=vec2(sin(h*6.28+u_time)*.12,cos(h*8.+u_time*.8)*.12);float mote=smoothstep(.075,.0,length(cell-drift))*step(.93,h);
 float halo=exp(-d*4.)*inside*(1.-open*.4);color+=mote*vec3(1.,.8,.42)*inside*.8+halo*vec3(.5,.28,.08);
 float alpha=1.-smoothstep(.70,1.,u_progress);outColor=vec4(color,alpha);
}`;

/** Short-lived WebGL2 scene. It owns and releases its context; DOM remains the fallback. */
export default function CinematicPortal({ image, active, onCovered, onFinish, onUnavailable }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active), failedRef = useRef(false), wakeRef = useRef<(() => void) | null>(null);
  activeRef.current = active;
  const callbacks = useRef({ onCovered, onFinish, onUnavailable });
  callbacks.current = { onCovered, onFinish, onUnavailable };
  useEffect(() => { if (active) { if (failedRef.current) callbacks.current.onUnavailable(); else wakeRef.current?.(); } }, [active]);
  useEffect(() => {
    const canvas=ref.current; if (!canvas) return;
    let disposed=false, stop=()=>{}, covered=false, elapsed=0, running=false, program: WebGLProgram | null=null, texture: WebGLTexture | null=null, buffer: WebGLBuffer | null=null;
    const gl=canvas.getContext('webgl2',{ alpha:true, antialias:false, depth:false, stencil:false, powerPreference:'default' });
    const fail=()=>{failedRef.current=true;if(activeRef.current&&!disposed)callbacks.current.onUnavailable();};
    if(!gl){ fail(); return; }
    assessRenderer(gl);
    function shader(type:number, source:string){const s=gl!.createShader(type);if(!s)throw Error('shader');gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS)){gl!.deleteShader(s);throw Error('compile');}return s;}
    const lost=(e:Event)=>{e.preventDefault();stop();fail();};canvas.addEventListener('webglcontextlost',lost);
    prepareTexture(image).then(imageEl=>{if(disposed)return;try{
      const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();if(!program)throw Error('program');gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link');gl.useProgram(program);
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,imageEl);
      const res=gl.getUniformLocation(program,'u_resolution'),progress=gl.getUniformLocation(program,'u_progress'),time=gl.getUniformLocation(program,'u_time');
      function draw(_now:number,delta:number){if(disposed)return;elapsed+=delta;const t=Math.min(1,elapsed/2400);const dpr=pixelScale(), w=Math.max(1,Math.round(canvas!.clientWidth*dpr)),h=Math.max(1,Math.round(canvas!.clientHeight*dpr));if(canvas!.width!==w||canvas!.height!==h){canvas!.width=w;canvas!.height=h;gl!.viewport(0,0,w,h)}gl!.uniform2f(res,w,h);gl!.uniform1f(progress,t);gl!.uniform1f(time,elapsed/1000);gl!.drawArrays(gl!.TRIANGLE_STRIP,0,4);if(t>=.62&&!covered){covered=true;callbacks.current.onCovered()}if(t>=1){stop();callbacks.current.onFinish();}}
      function wake(){if(!disposed&&activeRef.current&&!running){running=true;stop=subscribeFrame(draw)}}
      wakeRef.current=wake;canvas.dataset.lifecycle='prepared';wake();
    }catch {if(!disposed)fail();}}).catch(()=>{if(!disposed)fail()});
    return ()=>{disposed=true;wakeRef.current=null;stop();canvas.removeEventListener('webglcontextlost',lost);if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();};
  },[image]);
  return <canvas ref={ref} className="fl-reality-portal" aria-hidden="true" data-active={active} data-engine="webgl2-portal"/>;
}
