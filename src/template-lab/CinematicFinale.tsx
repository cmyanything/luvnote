import { useEffect, useRef } from 'react';
import { assessRenderer, pixelScale, prepareTexture, qualityLevel, subscribeFrame } from './cinematicRuntime';

type Props = { images: string[]; active: boolean; onComplete: () => void };
const vertex=`#version 300 es
in vec2 a_position;out vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 outColor;uniform float u_time;uniform float u_quality;uniform sampler2D u_photo0;uniform sampler2D u_photo1;uniform sampler2D u_photo2;
float hash(float x){return fract(sin(x*126.73)*43758.5453);}
vec4 photo(vec2 p,vec2 center,float angle,float size,int id){float c=cos(angle),s=sin(angle);vec2 q=mat2(c,-s,s,c)*(p-center)/size;float frame=1.-smoothstep(.47,.50,max(abs(q.x),abs(q.y)));float inner=1.-smoothstep(.37,.40,max(abs(q.x),abs(q.y)));vec2 uv=clamp(q/vec2(.8)+.5,.001,.999);vec3 tex=id==0?texture(u_photo0,uv).rgb:(id==1?texture(u_photo1,uv).rgb:texture(u_photo2,uv).rgb);return vec4(mix(vec3(.98,.87,.66),tex,inner),frame);}
void main(){
 vec2 p=(v_uv-.5)*2.;float t=clamp(u_time/4.2,0.,1.);float gathering=smoothstep(.16,.78,t);float forming=smoothstep(.58,.85,t);float fadePhotos=1.-smoothstep(.58,.85,t);
 float radius=length(p);float glow=exp(-radius*4.)*forming;vec3 col=vec3(.90,.58,.22)*glow*.28;float alpha=glow*.25;
 for(int i=0;i<3;i++){
   float fi=float(i);float a=fi*2.094+1.1;vec2 origin=vec2(cos(a)*.73,sin(a)*.58);float travel=smoothstep(.12+fi*.035,.76+fi*.035,t);
   vec2 bend=vec2(-origin.y,origin.x)*.30;vec2 center=origin*(1.-travel)+bend*sin(travel*3.14159);
   float angle=(1.-travel)*(.18*sin(a+u_time*.45));vec4 card=photo(p,center,angle,mix(.34,.12,travel),i);float ca=card.a*fadePhotos;col=mix(col,card.rgb,ca);alpha=max(alpha,ca);
   float along=clamp(dot(p,origin)/max(dot(origin,origin),.001),0.,1.);vec2 curve=origin*along+bend*sin((1.-along)*3.14159);float line=exp(-length(p-curve)*mix(45.,65.,u_quality))*smoothstep(.12,.30,t)*(1.-smoothstep(.78,.98,t));line*=smoothstep(1.-travel-.12,1.-travel+.05,along);col+=vec3(.95,.62,.25)*line*.38;alpha=max(alpha,line*.35);
 }
 float cross=exp(-abs(p.x)*18.)*exp(-abs(p.y)*3.)+exp(-abs(p.y)*22.)*exp(-abs(p.x)*3.);float pulse=exp(-abs(radius-(t-.60)*1.35)*30.)*smoothstep(.60,.7,t)*(1.-smoothstep(.85,1.,t));col+=vec3(1.,.72,.32)*(cross*forming*.32+pulse*.28);alpha=max(alpha,cross*forming*.35+pulse*.2);
 float after=1.-smoothstep(.84,1.,t);alpha*=after;outColor=vec4(col*alpha,alpha);
}`;

/** Momentary 2.5D memory gathering; failure leaves the existing readable finale intact. */
export default function CinematicFinale({ images, active, onComplete }: Props) {
  const canvas=useRef<HTMLCanvasElement>(null),activeRef=useRef(active),wakeRef=useRef<(() => void) | null>(null),stopRef=useRef<(() => void) | null>(null),completeRef=useRef(onComplete);const key=images.slice(0,3).join('|');activeRef.current=active;completeRef.current=onComplete;
  useEffect(()=>{if(active)wakeRef.current?.();else stopRef.current?.()},[active]);
  useEffect(()=>{const el=canvas.current;if(!el)return;let disposed=false,contextLost=false,stop=()=>{},program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null;const textures:WebGLTexture[]=[];const gl=el.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,powerPreference:'default'});if(!gl){el.dataset.status='fallback';return;}assessRenderer(gl);
    const debug=gl.getExtension('WEBGL_debug_renderer_info');const renderer=debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : '';const maxSide=/swiftshader|llvmpipe|software/i.test(renderer)?200:420;
    const lost=(e:Event)=>{e.preventDefault();contextLost=true;stop();el.dataset.status='context-lost';};el.addEventListener('webglcontextlost',lost);
    const sources=images.slice(0,3);while(sources.length<3)sources.push(sources[0]||'');
    Promise.all(sources.map(src=>prepareTexture(src))).then(loaded=>{if(disposed||contextLost)return;try{
      const make=(type:number,source:string)=>{const sh=gl.createShader(type);if(!sh)throw Error('shader');gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){gl.deleteShader(sh);throw Error('compile')}return sh};const v=make(gl.VERTEX_SHADER,vertex),f=make(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();if(!program)throw Error('program');gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link');gl.useProgram(program);
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
      loaded.forEach((im,i)=>{const tex=gl.createTexture();if(!tex)throw Error('texture');textures.push(tex);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.uniform1i(gl.getUniformLocation(program!,`u_photo${i}`),i)});
      const time=gl.getUniformLocation(program,'u_time'),quality=gl.getUniformLocation(program,'u_quality');el.dataset.status='prepared';let elapsed=0,running=false;function pause(){if(running){running=false;stop()}}function draw(_now:number,delta:number){if(disposed)return;elapsed+=delta/1000;const t=elapsed;const cap=Math.min(maxSide,Math.round(420*pixelScale()));const scale=Math.min(1,cap/Math.max(el!.clientWidth,el!.clientHeight));const w=Math.max(1,Math.round(el!.clientWidth*scale)),h=Math.max(1,Math.round(el!.clientHeight*scale));if(el!.width!==w||el!.height!==h){el!.width=w;el!.height=h;gl!.viewport(0,0,w,h)}gl!.uniform1f(time,t);gl!.uniform1f(quality,qualityLevel()==='lite'?.35:qualityLevel()==='balanced'?.65:1);gl!.drawArrays(gl!.TRIANGLE_STRIP,0,4);if(t>=4.25){pause();completeRef.current()}}function wake(){if(!disposed&&!contextLost&&activeRef.current&&!running){running=true;el!.dataset.status='rendering';stop=subscribeFrame(draw)}}wakeRef.current=wake;stopRef.current=pause;wake();
    }catch{el.dataset.status='fallback';}}).catch(()=>{if(!disposed)el.dataset.status='fallback'});
    return()=>{disposed=true;wakeRef.current=null;stopRef.current=null;stop();el.removeEventListener('webglcontextlost',lost);textures.forEach(t=>gl.deleteTexture(t));if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext()};
  },[key]);
  return <canvas ref={canvas} className="fl-finale-world" aria-hidden="true" data-active={active} data-engine="webgl2-finale"/>;
}
