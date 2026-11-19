export function HsvLogo({
  decorative = false,
  className = "",
}: {
  decorative?: boolean;
  className?: string;
}) {
  const base = import.meta.env.BASE_URL;
  return (
    <picture className={`organization-logo ${className}`}>
      <source type="image/webp" srcSet={`${base}logos/logo-hoi-192.webp`} />
      <img
        src={`${base}logos/logo-hoi.png`}
        alt={decorative ? "" : "Logo Hội Sinh viên Việt Nam"}
        width={192}
        height={192}
        decoding="async"
      />
    </picture>
  );
}
