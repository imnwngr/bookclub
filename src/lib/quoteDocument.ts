export const quoteColors = ["#1c2845", "#377f7c", "#c78087", "#000000"];
export function validQuoteDocument(value: unknown): boolean {
 if (value == null) return true;
 let count=0;
 const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const keys=(o:Record<string,unknown>,allowed:string[])=>Object.keys(o).every(k=>allowed.includes(k));
 function node(v:unknown,parent:string,depth:number,index:number):boolean {
  if(!object(v)||depth>20||++count>2000||!keys(v,['type','attrs','content','marks','text']))return false;
  if(typeof v.type!=='string')return false;
  const t=v.type, blocks=['paragraph','heading','bulletList','orderedList'];
  if(parent===''?t!=='doc':parent==='doc'?!blocks.includes(t):['paragraph','heading'].includes(parent)?!['text','hardBreak'].includes(t):['bulletList','orderedList'].includes(parent)?t!=='listItem':parent==='listItem'?(index===0?t!=='paragraph':!blocks.includes(t)):true)return false;
  const a=v.attrs===undefined?{}:v.attrs;if(!object(a))return false;
  if(!keys(a,t==='heading'?['level','textAlign']:t==='paragraph'?['textAlign']:t==='orderedList'?['start','type']:[]))return false;
  if(a.textAlign!==undefined&&a.textAlign!==null&&(typeof a.textAlign!=='string'||!['left','center','right','justify'].includes(a.textAlign)))return false;
  if(t==='heading'&&![1,2,3,4,5,6].includes(a.level as number))return false;
  if(t==='orderedList'&&((a.start!==undefined&&(!Number.isInteger(a.start)||Number(a.start)<1||Number(a.start)>10000))||(a.type!==undefined&&a.type!==null&&a.type!=='1')))return false;
  if(t==='text'){if(typeof v.text!=='string'||!v.text.length||Array.from(v.text).length>10000||v.content!==undefined)return false;}else if(v.text!==undefined)return false;
  if(v.marks!==undefined){if(t!=='text'||!Array.isArray(v.marks)||v.marks.length>6)return false;const seen=new Set();for(const m of v.marks){if(!object(m)||!keys(m,['type','attrs'])||seen.has(m.type))return false;seen.add(m.type);if(typeof m.type!=='string'||!['bold','italic','underline','strike','highlight','textStyle'].includes(String(m.type)))return false;const ma=m.attrs===undefined?{}:m.attrs;if(!object(ma)||!keys(ma,m.type==='textStyle'?['color']:[]))return false;if(ma.color!==undefined&&ma.color!==null&&(typeof ma.color!=='string'||!quoteColors.includes(ma.color.toLowerCase())))return false;}}
  if(['text','hardBreak'].includes(t))return v.content===undefined;
  if(v.content===undefined)return ['doc','paragraph','heading'].includes(t);
  return Array.isArray(v.content)&&(!['listItem','bulletList','orderedList'].includes(t)||v.content.length>0)&&v.content.every((c,i)=>node(c,t,depth+1,i));
 }
 try{const json=JSON.stringify(value);let extra=0,quoted=false,escape=false;for(const c of json){if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c===','||c===':')extra++;}return new TextEncoder().encode(json).length+extra<=50000&&node(value,'',0,0);}catch{return false;}
}
