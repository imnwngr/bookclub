import { useEffect, type RefObject } from "react";

const content = [
  ".invitation-event > .greeting-message",
  ".invitation-event > h2",
  ".invitation-event > p.prose",
  ".invitation-event > div.prose > *",
  ".invitation-event > .section-next",
  ".meeting-schedule > .section-label",
  ".meeting-schedule > h2",
  ".calendar-card header > *",
  ".calendar-months > div",
  ".calendar-card > footer",
  ".venue-tabs",
  ".venue-media, .venue-map",
  ".venue-detail > h3, .venue-detail > p, .venue-actions",
  ".invitation-quote-one > *",
  ".invitation-program > .section-label",
  ".agenda > h2, .agenda li",
  ".invitation-quote-two > *",
  ".invitation-closing > *",
].join(", ");

/** Reveal the letter's contents; its paper and reading order remain in normal flow. */
export function useChapterScroll(ref: RefObject<HTMLDivElement | null>, opened: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!opened || !root || !window.ResizeObserver) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = [...root.querySelectorAll<HTMLElement>(content)];
    const native = CSS.supports("animation-timeline: view()") &&
      CSS.supports("animation-range: entry 0px entry 180px");
    let frame = 0;
    let dirty = true;
    let tops: number[] = [];
    let observer: ResizeObserver | undefined;
    const styles: string[] = [];

    const render = () => {
      frame = 0;
      if (media.matches) return;
      if (dirty) {
        // offsetTop is independent of the reveal transform, including during keyboard focus.
        tops = elements.map((element) => {
          let top = 0;
          for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null)
            top += node.offsetTop;
          return top;
        });
        dirty = false;
      }
      const viewport = document.documentElement.clientHeight;
      const travel = Math.min(180, viewport * 0.25);
      const distance = window.innerWidth < 600 ? 16 : 28;
      const scroll = window.scrollY;
      elements.forEach((element, i) => {
        const progress = Math.min(1, Math.max(0, (viewport - (tops[i] - scroll)) / travel));
        const eased = 1 - (1 - progress) ** 3;
        const value = `${eased.toFixed(4)}:${distance}`;
        if (styles[i] === value) return;
        styles[i] = value;
        element.style.opacity = (0.12 + eased * 0.88).toFixed(4);
        element.style.transform = element.matches(".agenda li")
          ? `translate3d(${((1 - eased) * distance).toFixed(2)}px, 0, 0)`
          : `translate3d(0, ${((1 - eased) * distance).toFixed(2)}px, 0)`;
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };
    const resize = () => { dirty = true; schedule(); };
    const stop = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", resize);
      root.classList.remove("story-content-scroll", "story-content-native");
      styles.length = 0;
      elements.forEach((element) => {
        element.classList.remove("story-reveal");
        element.style.removeProperty("opacity");
        element.style.removeProperty("transform");
      });
    };
    const start = () => {
      stop();
      if (media.matches) return;
      elements.forEach((element) => element.classList.add("story-reveal"));
      root.classList.add("story-content-scroll");
      if (native) {
        root.classList.add("story-content-native");
        return;
      }
      dirty = true;
      observer = new ResizeObserver(resize);
      observer.observe(root);
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", resize);
      render();
    };
    start();
    media.addEventListener("change", start);
    return () => { stop(); media.removeEventListener("change", start); };
  }, [ref, opened]);
}
