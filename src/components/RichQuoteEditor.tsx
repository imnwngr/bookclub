import { useEffect, type KeyboardEvent, type ReactNode } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
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
const extensions = [
  StarterKit.configure({
    link: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
  }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Highlight,
  TextStyle,
  QuoteColor,
];
function navigateToolbar(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)",
    ),
  ];
  const current = buttons.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;
  event.preventDefault();
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
          buttons.length;
  buttons[next]?.focus();
}
export function RichQuoteEditor({
  value,
  onChange,
  label = "Quote 2 — Nội dung",
}: {
  value: unknown;
  onChange: (value: JSONContent | null) => void;
  label?: string;
}) {
  const editor = useEditor({
    extensions,
    content: value && validQuoteDocument(value) ? (value as JSONContent) : "",
    editorProps: {
      attributes: {
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) =>
      onChange(editor.getText().trim() ? editor.getJSON() : null),
  });
  useEffect(() => {
    if (!editor) return;
    const current = editor.getText().trim() ? editor.getJSON() : null;
    if (JSON.stringify(current) !== JSON.stringify(value ?? null))
      editor.commands.setContent(
        value && validQuoteDocument(value) ? (value as JSONContent) : "",
        { emitUpdate: false },
      );
  }, [editor, value]);
  if (!editor) return null;
  const icons: Record<string, ReactNode> = {
    Đậm: <Bold />,
    Nghiêng: <Italic />,
    "Gạch chân": <Underline />,
    "Gạch ngang": <Strikethrough />,
    "Tiêu đề": <Heading3 />,
    "Danh sách": <List />,
    "Danh sách số": <ListOrdered />,
    "Tô sáng": <Highlighter />,
  };
  const alignments = {
    left: { icon: AlignLeft, label: "Căn trái" },
    center: { icon: AlignCenter, label: "Căn giữa" },
    right: { icon: AlignRight, label: "Căn phải" },
    justify: { icon: AlignJustify, label: "Căn đều" },
  };
  const btn = (label: string, active: boolean, action: () => void) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={action}
    >
      <span aria-hidden="true">{icons[label]}</span>
    </button>
  );
  return (
    <div className="rich-quote">
      <p>{label}</p>
      <div
        className="rich-toolbar"
        role="toolbar"
        aria-label={"Định dạng " + label}
        onKeyDown={navigateToolbar}
      >
        <div className="rich-toolgroup" role="group" aria-label="Kiểu chữ">
          {btn("Đậm", editor.isActive("bold"), () => {
            editor.chain().focus().toggleBold().run();
          })}
          {btn("Nghiêng", editor.isActive("italic"), () => {
            editor.chain().focus().toggleItalic().run();
          })}
          {btn("Gạch chân", editor.isActive("underline"), () => {
            editor.chain().focus().toggleUnderline().run();
          })}
          {btn("Gạch ngang", editor.isActive("strike"), () => {
            editor.chain().focus().toggleStrike().run();
          })}
        </div>
        <div className="rich-toolgroup" role="group" aria-label="Đoạn văn">
          {btn("Tiêu đề", editor.isActive("heading"), () => {
            editor.chain().focus().toggleHeading({ level: 3 }).run();
          })}
          {btn("Danh sách", editor.isActive("bulletList"), () => {
            editor.chain().focus().toggleBulletList().run();
          })}
          {btn("Danh sách số", editor.isActive("orderedList"), () => {
            editor.chain().focus().toggleOrderedList().run();
          })}
          {btn("Tô sáng", editor.isActive("highlight"), () => {
            editor.chain().focus().toggleHighlight().run();
          })}
        </div>
        <div className="rich-toolgroup" role="group" aria-label="Căn lề">
          {(["left", "center", "right", "justify"] as const).map((a) => {
            const Icon = alignments[a].icon;
            return (
              <button
                key={a}
                type="button"
                aria-label={alignments[a].label}
                title={alignments[a].label}
                aria-pressed={editor.isActive({ textAlign: a })}
                onClick={() => editor.chain().focus().setTextAlign(a).run()}
              >
                <Icon aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <div className="rich-toolgroup" role="group" aria-label="Màu chữ">
          {palette.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={"Màu " + color}
              title={"Màu " + color}
              aria-pressed={editor.isActive("textStyle", { color })}
              onClick={() => editor.chain().focus().setColor(color).run()}
            >
              <span
                className="color-swatch"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        <div
          className="rich-toolgroup"
          role="group"
          aria-label="Lịch sử chỉnh sửa"
        >
          <button
            type="button"
            aria-label="Hoàn tác"
            title="Hoàn tác"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Làm lại"
            title="Làm lại"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 aria-hidden="true" />
          </button>
        </div>
      </div>
      <EditorContent editor={editor} />
      {value ? (
        <>
          <p className="field-hint">Xem trước</p>
          <InvitationQuoteTwo value={value} />
        </>
      ) : (
        <p className="field-hint">
          Nội dung trống sẽ không xuất hiện trên thiệp.
        </p>
      )}
    </div>
  );
}
