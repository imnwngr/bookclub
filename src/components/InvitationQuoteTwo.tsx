import { validQuoteDocument } from "../lib/quoteDocument";
import { Fragment, createElement, type ReactNode } from "react";

type QuoteNode = { type?: unknown; text?: unknown; content?: unknown; marks?: unknown; attrs?: unknown };
function renderNode(value: unknown, key: number): ReactNode {
  if (!value || typeof value !== "object") return null;
  const node = value as QuoteNode;
  if (node.type === "text" && typeof node.text === "string") {
    let text: ReactNode = node.text;
    if (Array.isArray(node.marks)) for (const mark of node.marks) {
      if (!mark || typeof mark !== "object") continue;
      switch ((mark as {type?: unknown}).type) {
        case "bold": text = <strong>{text}</strong>; break;
        case "italic": text = <em>{text}</em>; break;
        case "underline": text = <u>{text}</u>; break;
        case "strike": text = <s>{text}</s>; break;
        case "highlight": text = <mark>{text}</mark>; break;
        case "textStyle": {
          const attrs = (mark as { attrs?: { color?: unknown } }).attrs;
          const allowed = ["#1c2845", "#377f7c", "#c78087", "#000000"];
          const color = typeof attrs?.color === "string" ? attrs.color.toLowerCase() : "";
          if (allowed.includes(color)) text = <span style={{ color }}>{text}</span>;
          break;
        }
      }
    }
    return <Fragment key={key}>{text}</Fragment>;
  }
  if (node.type === "hardBreak") return <br key={key} />;
  const children = Array.isArray(node.content) ? node.content.map(renderNode) : null;
  const attrs = node.attrs && typeof node.attrs === "object" ? node.attrs as { textAlign?: unknown; level?: number; start?: number } : {};
  const alignment = ["left", "center", "right", "justify"].includes(String(attrs.textAlign)) ? attrs.textAlign as "left" | "center" | "right" | "justify" : undefined;
  switch (node.type) {
    case "doc": return <Fragment key={key}>{children}</Fragment>;
    case "paragraph": return <p key={key} style={{ textAlign: alignment }}>{children}</p>;
    case "heading": return createElement(`h${attrs.level}`, {key,style:{textAlign:alignment}}, children);
    case "bulletList": return <ul key={key}>{children}</ul>;
    case "orderedList": return <ol key={key} start={attrs.start}>{children}</ol>;
    case "listItem": return <li key={key}>{children}</li>;
    default: return null;
  }
}
function containsText(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const node = value as QuoteNode;
  if (node.type === "text") return typeof node.text === "string" && !!node.text.trim();
  if (!["doc", "paragraph", "heading", "bulletList", "orderedList", "listItem"].includes(String(node.type))) return false;
  return Array.isArray(node.content) && node.content.some(containsText);
}
export function InvitationQuoteTwo({ value }: { value: unknown }) {
  if (!validQuoteDocument(value) || !containsText(value)) return null;
  return <section className="invitation-quote-two">{renderNode(value, 0)}</section>;
}
