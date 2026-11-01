import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Section({
  name,
  number,
  title,
  complete,
  optional,
  children,
}: {
  name: string;
  number: number;
  title: string;
  complete: boolean;
  optional?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      className={`sec${visible ? ' in' : ''}${complete ? ' ok' : ''}`}
      data-k={name}
      aria-labelledby={`${name}-title`}
    >
      <div className="sh">
        <div className="num">{number}</div>
        <h2 id={`${name}-title`}>{title}</h2>
        {optional && <span className="opt">{optional}</span>}
      </div>
      {children}
    </section>
  );
}
