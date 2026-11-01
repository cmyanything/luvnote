// Offline comparison of synthetic staging input/output files; no service requests.
// Compare with the same browser decoder on both sides. jpeg-js's chroma upsampling
// differs from browser/libjpeg decoding and is not a reliable perceptual reference.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {chromium,webkit} from '@playwright/test';
const root='.wrangler/acceptance/';
const names=readdirSync(root+'transform-inputs').filter(n=>n.endsWith('.jpg'));
assert.ok(names.length>0);
const results=[];
for(const [engine,type] of [['Chromium',chromium],['WebKit',webkit]]) {
  const browser=await type.launch();
  try {
    const context=await browser.newContext({offline:true});
    const page=await context.newPage();
    for(const name of names) {
      const src='data:image/jpeg;base64,'+readFileSync(root+'transform-inputs/'+name).toString('base64');
      const dst='data:image/jpeg;base64,'+readFileSync(root+'transform-objects/'+name).toString('base64');
      const quality=await page.evaluate(async([src,dst])=>{
        async function pixels(source) {
          const i=new Image();i.src=source;await i.decode();
          const canvas=document.createElement('canvas');canvas.width=i.naturalWidth;canvas.height=i.naturalHeight;
          const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(i,0,0);
          return {width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};
        }
        const a=await pixels(src),b=await pixels(dst);
        if(a.width!==b.width||a.height!==b.height)throw Error('image dimensions changed');
        let sum=0,max=0,n=0;
        for(let i=0;i<a.data.length;i++)if(i%4!==3){const d=Math.abs(a.data[i]-b.data[i]);sum+=d*d;max=Math.max(max,d);n++;}
        const mse=sum/n;
        return {width:a.width,height:a.height,psnrDb:mse?10*Math.log10(255*255/mse):null,identicalPixels:mse===0,maxChannelError:max};
      },[src,dst]);
      const row={engine,name,...quality};results.push(row);console.log(JSON.stringify(row));
    }
    await context.close();
  } finally {await browser.close();}
}
writeFileSync(root+'full-transform-browser-quality.json',JSON.stringify({realCloudflareOutputs:true,offlineComparison:true,physicalDevices:false,results},null,2));
