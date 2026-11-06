import Color from "@tiptap/extension-color";
import { quoteColors } from "./quoteDocument";
export function normalizeQuoteColor(input: string): string | null {
 const value=input.trim().toLowerCase();
 let hex=value;
 const rgb=/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(value);
 if(rgb){const numbers=rgb.slice(1).map(Number);if(numbers.some(n=>n>255))return null;hex='#'+numbers.map(n=>n.toString(16).padStart(2,'0')).join('');}
 if(/^#[0-9a-f]{3}$/.test(hex))hex='#'+hex.slice(1).split('').map(c=>c+c).join('');
 return quoteColors.includes(hex)?hex:null;
}
export const QuoteColor = Color.extend({
 addGlobalAttributes(){return [{types:this.options.types,attributes:{color:{default:null,parseHTML:(element:HTMLElement)=>normalizeQuoteColor(element.style.color),renderHTML:(attrs:{color?:string|null})=>{const color=attrs.color?normalizeQuoteColor(attrs.color):null;return color?{style:'color: '+color}:{};}}}}]}
});
