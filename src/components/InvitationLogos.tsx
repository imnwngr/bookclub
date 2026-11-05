export function InvitationLogos() {
  return (
    <div className="invitation-logos" aria-label="Các đơn vị đồng hành">
      {[
        ["doan", "Logo Đoàn Thanh niên"],
        ["hoi", "Logo Hội Sinh viên"],
        ["ctut", "Logo Trường Đại học Kỹ thuật – Công nghệ Cần Thơ"],
        ["bookclub", "Logo BookClub CTUT"],
      ].map(([key, alt]) => (
        <img
          key={key}
          src={`${import.meta.env.BASE_URL}logos/logo-${key}.png`}
          alt={alt}
          width={90}
          height={90}
        />
      ))}
    </div>
  );
}
