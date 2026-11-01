import { useEffect, useRef } from 'react';

export function useModal(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const element = ref.current;
    const selector =
      'button:not(:disabled), a[href], input:not(:disabled), textarea, iframe, [tabindex="0"]';
    (
      element?.querySelector<HTMLElement>('button:not(:disabled)') ||
      element?.querySelector<HTMLElement>(selector)
    )?.focus({ preventScroll: true });
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab' || !element) return;
      const targets = [
        ...element.querySelectorAll<HTMLElement>(selector),
      ].filter((el) => el.getClientRects().length);
      const first = targets[0],
        last = targets.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return ref;
}
