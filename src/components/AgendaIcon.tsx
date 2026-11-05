export const agendaIcons = {
  welcome: {
    label: "Đón tiếp",
    path: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0",
  },
  speech: {
    label: "Phát biểu",
    path: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3 M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8",
  },
  book: {
    label: "Sách",
    path: "M12 6v15 M3 3c4-1 7 0 9 3c2-3 5-4 9-3v16c-4-1-7 0-9 2c-2-2-5-3-9-2Z",
  },
  chat: {
    label: "Giao lưu",
    path: "M21 11a8 8 0 0 1-8 8H8l-5 3v-7a8 8 0 1 1 18-4 M7 10h10 M7 14h6",
  },
  music: {
    label: "Văn nghệ",
    path: "M9 18V5l12-2v13 M9 5l12-2 M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0 M21 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0",
  },
  gift: {
    label: "Trao quà",
    path: "M3 8h18v4H3Z M5 12v9h14v-9 M12 8v13 M12 8H8a3 3 0 1 1 3-3Z M12 8h4a3 3 0 1 0-3-3Z",
  },
  summary: {
    label: "Tổng kết",
    path: "M9 3h6v4H9Z M9 5H5v16h14V5h-4 M8 12l2 2 5-5 M8 18h8",
  },
  camera: {
    label: "Chụp ảnh",
    path: "M3 7h4l2-3h6l2 3h4v14H3Z M16 13a4 4 0 1 1-8 0a4 4 0 0 1 8 0",
  },
  finish: {
    label: "Kết thúc",
    path: "M5 22V3 M5 3c4-3 9 3 14 0v11c-5 3-10-3-14 0",
  },
} as const;
export type AgendaIconName = keyof typeof agendaIcons;
export function AgendaIcon({ name }: { name?: string | null }) {
  const icon = agendaIcons[name as AgendaIconName] ?? agendaIcons.book;
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={icon.path} />
    </svg>
  );
}
