import { HsvLogo } from "./HsvLogo";
export function PaperArt({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`association-art ${compact ? "association-art-compact" : ""}`}
      aria-hidden="true"
    >
      <div className="association-paper">
        <HsvLogo decorative />
        <span>Hội Sinh viên</span>
        <strong>CTUT</strong>
        <div className="association-rule" />
        <p>
          Kết nối hôm nay.
          <br />
          Dấu ấn mai sau.
        </p>
      </div>
    </div>
  );
}
