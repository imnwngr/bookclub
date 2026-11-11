import type { ReactNode } from "react";

export function InvitationChapter({
  children,
  name,
  emerald = false,
}: {
  children: ReactNode;
  name: string;
  emerald?: boolean;
}) {
  return (
    <div
      className={`story-chapter${emerald ? " story-chapter-emerald" : ""}`}
      data-chapter={name}
    >
      <div className="story-sheet">{children}</div>
    </div>
  );
}
