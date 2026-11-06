import { useEffect, useRef, useState } from 'react';
import { assessRenderer, pixelScale, prepareTexture, subscribeFrame } from './cinematicRuntime';

type Flow = 'forward' | 'freeze' | 'reverse';
type Props = { image: string; alt: string; flow: Flow; rotation: number; onRotate: (value: number) => void; onAvailability: (ready: boolean) => void; onHold: (held: boolean) => void; staticMode: boolean; active: boolean };
const vs=`#version 300 es
in vec2 a_position;out vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const fs=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 outColor;uniform sampler2D u_photo;uniform float u_time;uniform float u_rotation;uniform float u_aspect;
float hash(vec2 v){return fract(sin(dot(v,vec2(17.7,113.5)))*43758.5453);}
void main(){
 vec2 p=v_uv-.5;float yaw=u_rotation*.70;float c=max(.5,cos(yaw));float perspective=1.+p.x*sin(yaw)*.65;
 vec2 q=vec2(p.x/(c*perspective),p.y/perspective);vec2 frame=abs(q);float card=1.-smoothstep(.001,.012,max(frame.x-.38,frame.y-.39));float photo=1.-smoothstep(.001,.009,max(frame.x-.345,frame.y-.325));
 vec2 tex=clamp(vec2(q.x/.69+.5,q.y/.65+.5),.001,.999);vec3 image=texture(u_photo,tex).rgb;
 vec3 sky=mix(vec3(.025,.10,.12),vec3(.10,.25,.24),v_uv.y);float glow=exp(-length(p-vec2(sin(yaw)*.18,0.))*4.)*.25;sky+=vec3(.26,.20,.08)*glow;
 float ripple=pow(max(0.,sin(length((p-vec2(sin(yaw)*.12,-.38))*vec2(1.,2.2))*34.-u_time*1.4)),12.)*.035*(1.-smoothstep(-.1,.08,p.y));sky+=vec3(.68,.51,.24)*ripple;
 vec2 grid=floor((p+2.)*16.);vec2 cell=fract((p+2.)*16.)-.5;float h=hash(grid);float spark=smoothstep(.075,0.,length(cell-vec2(sin(u_time*.8+h*9.)*.12,cos(u_time*.6+h*5.)*.12)))*step(.91,h);sky+=spark*vec3(.8,.58,.25)*.6;vec2 traveler=vec2(.40*sin(u_time*.8),.20*cos(u_time*.8));float trace=exp(-length(p-traveler)*48.);sky+=trace*vec3(1.,.66,.22)*1.2;
 float shadow=(1.-smoothstep(.0,.07,max(abs(q.x-.025)-.39,abs(q.y+.025)-.40)))*.32;sky*=1.-shadow;
 vec3 border=vec3(.91,.83,.66);float shine=clamp(.78+.25*cos(yaw*1.5)+p.x*sin(yaw)*.3,.55,1.);vec3 face=mix(border,image,photo)*shine;
 float edgeLight=pow(1.-abs(c),2.)*.22;face+=vec3(.7,.48,.16)*edgeLight;
 vec3 color=mix(sky,face,card);outColor=vec4(color,1.);
}`;

/** A bounded 2.5D photograph world with a reversible scene clock and a non-WebGL fallback. */
export default function MemoryWorld({ image, alt, flow, rotation, onRotate, onAvailability, onHold, staticMode, active }: Props) {
  const canvas=useRef<HTMLCanvasElement>(null), flowRef=useRef(flow), rotationRef=useRef(rotation), callback=useRef(onAvailability), startX=useRef<number | null>(null), startRot=useRef(0), activeRef=useRef(active), wakeRef=useRef<(() => void) | null>(null);
  const [failed,setFailed]=useState(false);const [ready,setReady]=useState(false);
  const holdTimer=useRef<ReturnType<typeof setTimeout> | null>(null), holding=useRef(false), holdCallback=useRef(onHold); holdCallback.current=onHold;
  useEffect(()=>()=>{if(holdTimer.current)clearTimeout(holdTimer.current);if(holding.current)holdCallback.current(false)},[]);
  function endPointer(){if(holdTimer.current)clearTimeout(holdTimer.current);holdTimer.current=null;startX.current=null;if(holding.current){holding.current=false;holdCallback.current(false)}}
  flowRef.current=flow;rotationRef.current=rotation;callback.current=onAvailability;activeRef.current=active;
  useEffect(()=>{
    if(staticMode||failed){setReady(false);callback.current(true);return;}
    const el=canvas.current;if(!el)return;let disposed=false,stop=()=>{},last=0,clock=0,current=0,program:WebGLProgram|null=null,texture:WebGLTexture|null=null,buffer:WebGLBuffer|null=null;
    const gl=el.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'default'});
    if(!gl){setFailed(true);callback.current(true);return;}
    assessRenderer(gl);
    const fail=()=>{if(!disposed){setFailed(true);callback.current(true);}};
    const lost=(event:Event)=>{event.preventDefault();fail();};el.addEventListener('webglcontextlost',lost);
    function compile(type:number,src:string){const s=gl!.createShader(type);if(!s)throw Error('shader');gl!.shaderSource(s,src);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS)){gl!.deleteShader(s);throw Error('compile');}return s;}
    prepareTexture(image).then(img=>{if(disposed)return;try{
      const v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);program=gl.createProgram();if(!program)throw Error('program');gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link');gl.useProgram(program);
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      const time=gl.getUniformLocation(program,'u_time'),rot=gl.getUniformLocation(program,'u_rotation'),aspect=gl.getUniformLocation(program,'u_aspect');let announced=false;
      let running=false;
      function pause(){if(running){running=false;stop();last=0}}
      function wake(){if(!disposed&&activeRef.current&&!running){running=true;stop=subscribeFrame(draw)}}
      function draw(now:number){if(disposed)return;if(!activeRef.current){pause();return}const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(flowRef.current==='forward')clock+=dt;else if(flowRef.current==='reverse')clock-=dt;current+=(rotationRef.current-current)*Math.min(1,dt*8);const dpr=pixelScale(),w=Math.max(1,Math.round(el!.clientWidth*dpr)),h=Math.max(1,Math.round(el!.clientHeight*dpr));if(el!.width!==w||el!.height!==h){el!.width=w;el!.height=h;gl!.viewport(0,0,w,h)}gl!.uniform1f(time,clock);gl!.uniform1f(rot,current);gl!.uniform1f(aspect,w/h);gl!.drawArrays(gl!.TRIANGLE_STRIP,0,4);if(!announced){announced=true;setReady(true);callback.current(true)}el!.dataset.time=clock.toFixed(2);el!.dataset.rotation=current.toFixed(2);if(flowRef.current==='freeze'&&Math.abs(rotationRef.current-current)<.001)pause()}
      wakeRef.current=wake;wake();
    }catch{fail()}}).catch(fail);
    return()=>{disposed=true;wakeRef.current=null;stop();el.removeEventListener('webglcontextlost',lost);if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();};
  },[image,staticMode,failed]);
  useEffect(()=>{wakeRef.current?.()},[flow,rotation,active]);
  const fallback=staticMode||failed;
  return <div className={'fl-memory-world'+(fallback?' is-static':'')+(ready?' is-ready':'')} data-flow={flow} role="img" aria-label={alt} onPointerDown={e=>{startX.current=e.clientX;startRot.current=rotation;e.currentTarget.setPointerCapture(e.pointerId);holdTimer.current=setTimeout(()=>{holding.current=true;holdCallback.current(true)},500)}} onPointerMove={e=>{if(startX.current===null)return;const distance=e.clientX-startX.current;if(Math.abs(distance)>8&&holdTimer.current){clearTimeout(holdTimer.current);holdTimer.current=null}if(!holding.current)onRotate(Math.max(-1,Math.min(1,startRot.current+distance/120)))}} onPointerUp={endPointer} onPointerCancel={endPointer} onLostPointerCapture={endPointer}>
    <img src={image} alt="" style={fallback ? {transform:`perspective(700px) rotateY(${rotation*28}deg) scale(.92)`} : undefined}/>{!fallback && <canvas ref={canvas} data-engine="webgl2-memory" data-flow={flow} aria-hidden="true"/>}
  </div>;
}
