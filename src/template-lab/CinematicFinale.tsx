import { useEffect, useRef } from 'react';

type Props = { images: string[] };
const vertex=`#version 300 es
in vec2 a_position;out vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 outColor;uniform float u_time;uniform sampler2D u_photo0;uniform sampler2D u_photo1;uniform sampler2D u_photo2;
float hash(float x){return fract(sin(x*126.73)*43758.5453);}
vec4 photo(vec2 p,vec2 center,float angle,float size,int id){float c=cos(angle),s=sin(angle);vec2 q=mat2(c,-s,s,c)*(p-center)/size;float frame=1.-smoothstep(.47,.50,max(abs(q.x),abs(q.y)));float inner=1.-smoothstep(.37,.40,max(abs(q.x),abs(q.y)));vec2 uv=clamp(q/vec2(.8)+.5,.001,.999);vec3 tex=id==0?texture(u_photo0,uv).rgb:(id==1?texture(u_photo1,uv).rgb:texture(u_photo2,uv).rgb);return vec4(mix(vec3(.98,.87,.66),tex,inner),frame);}
void main(){
 vec2 p=(v_uv-.5)*2.;float t=clamp(u_time/4.2,0.,1.);float gathering=smoothstep(.08,.7,t);float forming=smoothstep(.44,.8,t);float fadePhotos=1.-smoothstep(.55,.85,t);
 float radius=length(p);float rays=pow(max(0.,cos(atan(p.y,p.x)*9.-u_time*.55)),12.)*exp(-radius*2.5)*smoothstep(.05,.35,t);vec3 col=vec3(.91,.57,.18)*rays*.23;float alpha=rays*.22;
 for(int i=0;i<3;i++){float fi=float(i);float angle=fi*2.094+u_time*.35;float orbit=mix(.70,.16,gathering);vec2 center=vec2(cos(angle)*orbit,sin(angle)*orbit*.68);vec4 card=photo(p,center,sin(angle)*.22,mix(.38,.16,gathering),i);float a=card.a*fadePhotos;col=mix(col,card.rgb,a);alpha=max(alpha,a);}
 vec2 h=p*2.4;h.y-=.05;float heart=pow(h.x*h.x+h.y*h.y-1.,3.)-h.x*h.x*h.y*h.y*h.y;float outline=exp(-abs(heart)*12.)*forming;float fill=(1.-smoothstep(-.08,.08,heart))*forming;col+=vec3(1.,.66,.24)*(outline*.55+fill*.12);alpha=max(alpha,outline*.62+fill*.10);
 for(int j=0;j<10;j++){float fj=float(j),seed=hash(fj+1.);float a=seed*6.283+u_time*.28;float rr=mix(.9,.19,gathering)*(.6+hash(fj+8.)*.45);vec2 dotp=vec2(cos(a)*rr,sin(a)*rr*.7);float mote=exp(-length(p-dotp)*85.)*smoothstep(.02,.18,t);col+=vec3(1.,.72,.3)*mote*.8;alpha=max(alpha,mote*.7);}
 float after=1.-smoothstep(.78,1.,t);alpha*=after;outColor=vec4(col*alpha,alpha);
}`;

/** Momentary 2.5D memory gathering; failure leaves the existing readable finale intact. */
export default function CinematicFinale({ images }: Props) {
  const canvas=useRef<HTMLCanvasElement>(null);const key=images.slice(0,3).join('|');
  useEffect(()=>{const el=canvas.current;if(!el)return;let disposed=false,raf=0,program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null;const textures:WebGLTexture[]=[];const gl=el.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,powerPreference:'default'});if(!gl){el.dataset.status='fallback';return;}
    const debug=gl.getExtension('WEBGL_debug_renderer_info');const renderer=debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : '';const maxSide=/swiftshader|llvmpipe|software/i.test(renderer)?240:420;
    const lost=(e:Event)=>{e.preventDefault();el.dataset.status='context-lost';};el.addEventListener('webglcontextlost',lost);
    const load=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src});
    const sources=images.slice(0,3);while(sources.length<3)sources.push(sources[0]||'');
    Promise.all(sources.map(load)).then(loaded=>{if(disposed)return;try{
      const make=(type:number,source:string)=>{const sh=gl.createShader(type);if(!sh)throw Error('shader');gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){gl.deleteShader(sh);throw Error('compile')}return sh};const v=make(gl.VERTEX_SHADER,vertex),f=make(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();if(!program)throw Error('program');gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link');gl.useProgram(program);
      buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
      loaded.forEach((im,i)=>{const tex=gl.createTexture();if(!tex)throw Error('texture');textures.push(tex);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.uniform1i(gl.getUniformLocation(program!,`u_photo${i}`),i)});
      const time=gl.getUniformLocation(program,'u_time');el.dataset.status='rendering';let begin=0;function draw(now:number){if(disposed)return;if(!begin)begin=now;const t=(now-begin)/1000;const scale=Math.min(1,maxSide/Math.max(el!.clientWidth,el!.clientHeight));const w=Math.max(1,Math.round(el!.clientWidth*scale)),h=Math.max(1,Math.round(el!.clientHeight*scale));if(el!.width!==w||el!.height!==h){el!.width=w;el!.height=h;gl!.viewport(0,0,w,h)}gl!.uniform1f(time,t);gl!.drawArrays(gl!.TRIANGLE_STRIP,0,4);if(t<4.25)raf=requestAnimationFrame(draw)}raf=requestAnimationFrame(draw);
    }catch{el.dataset.status='fallback';}}).catch(()=>{if(!disposed)el.dataset.status='fallback'});
    return()=>{disposed=true;cancelAnimationFrame(raf);el.removeEventListener('webglcontextlost',lost);textures.forEach(t=>gl.deleteTexture(t));if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext()};
  },[key]);
  return <canvas ref={canvas} className="fl-finale-world" aria-hidden="true" data-engine="webgl2-finale"/>;
}
