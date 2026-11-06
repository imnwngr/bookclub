import { useEffect } from "react";
import { validQuoteDocument } from "../lib/quoteDocument";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { QuoteColor } from "../lib/quoteColor";
import { TextStyle } from "@tiptap/extension-text-style";
import { InvitationQuoteTwo } from "./InvitationQuoteTwo";
const palette = ["#1c2845", "#377f7c", "#c78087", "#000000"];
const extensions = [StarterKit.configure({ link: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false }), TextAlign.configure({ types: ["heading", "paragraph"] }), Highlight, TextStyle, QuoteColor];
export function RichQuoteEditor({ value, onChange, label = "Quote 2 — Nội dung" }: { value: unknown; onChange: (value: JSONContent | null) => void; label?: string }) {
  const editor = useEditor({ extensions, content: value && validQuoteDocument(value) ? value as JSONContent : "", editorProps: { attributes: { "aria-label": label, role: "textbox", "aria-multiline": "true" } }, onUpdate: ({ editor }) => onChange(editor.getText().trim() ? editor.getJSON() : null) });
  useEffect(() => {
    if (!editor) return;
    const current = editor.getText().trim() ? editor.getJSON() : null;
    if (JSON.stringify(current) !== JSON.stringify(value ?? null)) editor.commands.setContent(value && validQuoteDocument(value) ? value as JSONContent : "", { emitUpdate: false });
  }, [editor, value]);
  if (!editor) return null;
  const btn = (label: string, active: boolean, action: () => void) => <button type="button" aria-pressed={active} onClick={action}>{label}</button>;
  return <div className="rich-quote"><p>{label}</p><div className="rich-toolbar" role="toolbar" aria-label={"Định dạng " + label}>
    {btn("Đậm", editor.isActive("bold"), () => { editor.chain().focus().toggleBold().run(); })}
    {btn("Nghiêng", editor.isActive("italic"), () => { editor.chain().focus().toggleItalic().run(); })}
    {btn("Gạch chân", editor.isActive("underline"), () => { editor.chain().focus().toggleUnderline().run(); })}
    {btn("Gạch ngang", editor.isActive("strike"), () => { editor.chain().focus().toggleStrike().run(); })}
    {btn("Tiêu đề", editor.isActive("heading"), () => { editor.chain().focus().toggleHeading({level: 3}).run(); })}
    {btn("Danh sách", editor.isActive("bulletList"), () => { editor.chain().focus().toggleBulletList().run(); })}
    {btn("Danh sách số", editor.isActive("orderedList"), () => { editor.chain().focus().toggleOrderedList().run(); })}
    {btn("Tô sáng", editor.isActive("highlight"), () => { editor.chain().focus().toggleHighlight().run(); })}
    {(["left", "center", "right", "justify"] as const).map(a => <button key={a} type="button" aria-label={"Căn " + a} onClick={() => editor.chain().focus().setTextAlign(a).run()}>{a}</button>)}
    {palette.map(color => <button key={color} type="button" aria-label={"Màu " + color} style={{color}} onClick={() => editor.chain().focus().setColor(color).run()}>●</button>)}
    <button type="button" onClick={() => editor.chain().focus().undo().run()}>Hoàn tác</button><button type="button" onClick={() => editor.chain().focus().redo().run()}>Làm lại</button>
  </div><EditorContent editor={editor} /><p>Xem trước</p><InvitationQuoteTwo value={value} /></div>;
}
