import { useEffect, useRef, type ReactNode } from "react";

export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (
      !element ||
      motion.matches ||
      !window.IntersectionObserver ||
      !element.animate
    )
      return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        animation = element.animate(
          [
            { opacity: 0.45, transform: "translateY(20px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" },
        );
        observer.disconnect();
      },
      { threshold: 0.08 },
    );
    const stop = () => {
      if (motion.matches) {
        animation?.cancel();
        observer.disconnect();
      }
    };
    motion.addEventListener("change", stop);
    observer.observe(element);
    return () => {
      observer.disconnect();
      animation?.cancel();
      motion.removeEventListener("change", stop);
    };
  }, []);
  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
}
