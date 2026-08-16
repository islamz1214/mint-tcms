'use client';

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

type AutoResizeTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

// A textarea that grows to fit its content. Height is recomputed on every value
// change — on mount, on typing, on paste, and when the value is set
// programmatically (server load, AI generation) — so every instance resizes
// consistently regardless of how its content arrives.
export default function AutoResizeTextarea({ value, ...props }: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return <textarea ref={ref} value={value} {...props} />;
}
