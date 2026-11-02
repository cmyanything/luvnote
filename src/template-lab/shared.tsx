import {
  Children,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { motion } from 'motion/react';
import type { Moment } from './data';

export const MOTION = {
  ui: 0.24,
  reveal: 0.48,
  ease: [0.23, 1, 0.32, 1] as const,
};

const reducedMotionQuery = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
);
const subscribeReducedMotion = (listener: () => void) => {
  reducedMotionQuery.addEventListener('change', listener);
  return () => reducedMotionQuery.removeEventListener('change', listener);
};
export function useStill() {
  // Motion 14.9's hook snapshots this preference; observe live OS changes ourselves.
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => reducedMotionQuery.matches,
  );
  return !!reduced || new URLSearchParams(location.search).get('still') === '1';
}

export function Icon({
  name = 'heart',
  size = 22,
}: {
  name?:
    | 'heart'
    | 'arrow'
    | 'back'
    | 'close'
    | 'star'
    | 'reset'
    | 'expand'
    | 'play'
    | 'check'
    | 'book';
  size?: number;
}) {
  const paths = {
    heart:
      'M12 20S3 14.5 3 8.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 1.5C21 14.5 12 20 12 20Z',
    arrow: 'M4 12h15m-6-6 6 6-6 6',
    back: 'M20 12H5m6-6-6 6 6 6',
    close: 'm6 6 12 12M6 18 18 6',
    star: 'm12 3 2.6 5.7 6.2.7-4.6 4.3 1.3 6.1-5.5-3-5.5 3 1.3-6.1L3.2 9.4l6.2-.7Z',
    reset: 'M4 10a8 8 0 1 1 1.5 7M4 4v6h6',
    expand: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
    play: 'm9 5 10 7-10 7Z',
    check: 'm5 12 4 4L19 6',
    book: 'M12 5v15M3 4q6-2 9 1 3-3 9-1v15q-6-2-9 1-3-3-9-1Z',
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

// Native-button adaptation of shadcn/ui's composable button API (MIT; notices in the lab).
// This surface needs no Slot/Radix, Tailwind, CVA or client-side navigation dependency.
export function Button({
  children,
  className = '',
  variant = 'solid',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'quiet' }) {
  return (
    <button
      type="button"
      data-slot="button"
      data-variant={variant}
      className={`t-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Photo({
  moment,
  className = '',
  eager = false,
}: {
  moment: Moment;
  className?: string;
  eager?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return failedSource === moment.image ? (
    <div
      className={`photo photo-fallback ${className}`}
      role="img"
      aria-label={moment.alt}
    >
      ภาพนี้ยังเปิดไม่ได้
      <br />
      {moment.title}
    </div>
  ) : (
    <img
      className={`photo ${className}`}
      src={moment.image}
      alt={moment.alt}
      width="1200"
      height="900"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSource(moment.image)}
    />
  );
}

/** Small, restyled adaptation of Motion Primitives AnimatedGroup (MIT).
 * Fixed wrapper types, capped stagger, no per-render component creation, reduced-motion fallback.
 */
export function AnimatedGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const still = useStill();
  return (
    <div className={className}>
      {Children.map(children, (child, i) => (
        <motion.div
          initial={
            still ? false : { opacity: 0, transform: 'translateY(12px)' }
          }
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{
            duration: MOTION.ui,
            ease: MOTION.ease,
            delay: still ? 0 : Math.min(i * 0.04, 0.24),
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

export function Words({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const still = useStill();
  const [seen, setSeen] = useState(still);
  useEffect(() => {
    if (still || !('IntersectionObserver' in window)) {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [still]);
  const parts = new Intl.Segmenter('th', { granularity: 'word' }).segment(text);
  return (
    <span ref={ref} className={`words ${className} ${seen ? 'seen' : ''}`}>
      <span className="sr-only">{text}</span>
      {Array.from(parts).map((part, i) => (
        <span className="word-mask" aria-hidden="true" key={i}>
          <span
            style={{ '--delay': `${Math.min(i * 35, 280)}ms` } as CSSProperties}
          >
            {part.segment}
          </span>
        </span>
      ))}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      className="t-modal"
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        className="modal-close"
        aria-label="ปิดรายละเอียด"
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}

export function Flower({
  bloom = false,
  variant = 0,
}: {
  bloom?: boolean;
  variant?: number;
}) {
  return (
    <svg
      className={`flower ${bloom ? 'bloom' : ''} flower-${variant % 3}`}
      viewBox="0 0 120 180"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="stem"
        d="M60 174Q54 118 60 60M58 138q-32-5-34-30 31-2 34 30M59 118q30-6 34-30-30 0-34 30"
        stroke="currentColor"
        strokeWidth="2"
        fill="var(--leaf, #869569)"
      />
      <g className="petals" style={{ transformOrigin: '60px 57px' }}>
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse
            key={angle}
            cx="60"
            cy="36"
            rx="13"
            ry="24"
            fill="var(--petal, #df9d93)"
            transform={`rotate(${angle} 60 57)`}
          />
        ))}
        <circle cx="60" cy="57" r="11" fill="var(--pollen, #d4ad52)" />
      </g>
    </svg>
  );
}

export function useScrollParallax(
  root: React.RefObject<HTMLElement | null>,
  selector: string,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !root.current) return;
    let disposed = false;
    let revert: (() => void) | undefined;
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger);
        const context = gsap.context(() => {
          root
            .current!.querySelectorAll<HTMLElement>(selector)
            .forEach((el) => {
              gsap.fromTo(
                el,
                { yPercent: -5 },
                {
                  yPercent: 5,
                  ease: 'none',
                  scrollTrigger: {
                    trigger: el.parentElement,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true,
                    invalidateOnRefresh: true,
                  },
                },
              );
            });
        }, root);
        revert = () => context.revert();
      })
      .catch(() => {
        /* Static content remains fully visible if the optional enhancement cannot load. */
      });
    return () => {
      disposed = true;
      revert?.();
    };
  }, [root, selector, enabled]);
}
