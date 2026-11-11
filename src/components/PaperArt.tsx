export function PaperArt({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`paper-art ${compact ? "paper-art-compact" : ""}`}
      aria-hidden="true"
    >
      <div className="paper-orbit" />
      <div className="paper-book">
        <div className="book-page book-page-left">
          <span>
            Book
            <br />
            Club.
          </span>
          <i />
        </div>
        <div className="book-page book-page-right">
          <span>
            Hẹn nhau
            <br />
            giữa những
            <br />
            trang sách.
          </span>
          <i />
          <b>CTUT</b>
        </div>
        <div className="book-bookmark" />
      </div>
      <div className="paper-art-caption">
        <span>Mỗi trang sách,</span>
        <span>một cuộc gặp gỡ.</span>
      </div>
    </div>
  );
}
