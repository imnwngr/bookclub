import { useEffect, type RefObject } from "react";

/** Ornament motion is separate from the scroll-linked text and agenda reveals. */
export function useInvitationMotion(ref: RefObject<HTMLDivElement | null>, opened: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!opened || !root || !window.IntersectionObserver || !Element.prototype.animate) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;
    const stop = () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      root.classList.remove("story-native-scroll");
    };
    const start = () => {
      stop();
      if (media.matches) return;
      const native = CSS.supports("animation-timeline: view()") &&
        CSS.supports("animation-range: entry 0% cover 100%");
      root.classList.toggle("story-native-scroll", native);
      if (native) return;
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer!.unobserve(entry.target);
          const animation = entry.target.animate(
            [{ opacity: 0.25, transform: "scaleX(.35)" }, { opacity: 1, transform: "none" }],
            { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" },
          );
          animations.add(animation);
          void animation.finished.then(() => animations.delete(animation)).catch(() => {});
        }
      }, { threshold: 0.15 });
      root.querySelectorAll(".paper-bridge svg, .meeting-rule").forEach((element) => observer!.observe(element));
    };
    start();
    media.addEventListener("change", start);
    return () => { stop(); media.removeEventListener("change", start); };
  }, [ref, opened]);
}
