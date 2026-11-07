import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

export const AutoGrowingTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AutoGrowingTextarea(props, ref) {
  const element = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => element.current!, []);
  function resize() {
    const node = element.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight + node.offsetHeight - node.clientHeight}px`;
  }
  useLayoutEffect(resize, [props.value]);
  useEffect(() => {
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return (
    <textarea
      {...props}
      ref={element}
      rows={1}
      className={`event-title-input ${props.className ?? ""}`}
    />
  );
});
