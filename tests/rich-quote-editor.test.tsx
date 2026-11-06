import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it } from "vitest";
import { RichQuoteEditor } from "../src/components/RichQuoteEditor";
import { validQuoteDocument } from "../src/lib/quoteDocument";
it("edits, formats and clears structured quote without changing other text", async () => {
 function Harness() { const [value,setValue]=useState<unknown>(null); return <><RichQuoteEditor value={value} onChange={setValue} /><output>{JSON.stringify(value)}</output><p>Mô tả độc lập</p></>; }
 const user=userEvent.setup(); render(<Harness />);
 await user.click(screen.getByRole('button',{name:'Đậm'}));
 const input=screen.getByRole('textbox',{name:'Quote 2 — Nội dung'});
 input.focus(); await user.type(input,'Lời mời', {skipClick:true});
 expect(screen.getByText('Mô tả độc lập')).toBeVisible();
 const actual=JSON.parse(document.querySelector('output')!.textContent!);
 const pg=new PGlite();try {await pg.exec('create role anon;create role authenticated;');const sql=readFileSync('supabase/migrations/202611070001_invitation_quotes.sql','utf8');await pg.exec(sql.slice(sql.indexOf('create function public.valid_quote_document'),sql.indexOf('alter table public.events add column quote_one')));expect((await pg.query<{v:boolean}>('select valid_quote_document($1) v',[JSON.stringify(actual)])).rows[0].v).toBe(true);}finally{await pg.close();}
 expect(screen.getByText(/bold/, {selector:'output'})).toBeInTheDocument();
 input.focus(); await user.keyboard('{Control>}a{/Control}{Backspace}');
 expect(screen.getByText('null',{selector:'output'})).toBeInTheDocument();
});
it('rejects unknown nodes and malformed documents',()=>{
 expect(validQuoteDocument({type:'doc',content:[{type:'script',text:'x'}]})).toBe(false);
 expect(validQuoteDocument({type:'doc',content:[{type:'paragraph'}]})).toBe(true);
 expect(validQuoteDocument({type:'doc',content:[{type:'text',text:'x',marks:[{type:'link'}]}]})).toBe(false);
});
