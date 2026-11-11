export function BookClubLogo({
  decorative = false,
  className = "",
}: {
  decorative?: boolean;
  className?: string;
}) {
  const base = import.meta.env.BASE_URL;
  return (
    <picture className={`bookclub-logo ${className}`}>
      <source
        type="image/webp"
        srcSet={`${base}logos/logo-bookclub-192.webp`}
      />
      <img
        src={`${base}logos/logo-bookclub.png`}
        alt={decorative ? "" : "Logo BookClub CTUT"}
        width={192}
        height={192}
        decoding="async"
      />
    </picture>
  );
}
