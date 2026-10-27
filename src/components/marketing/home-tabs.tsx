'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type HomeTab = { id: string; label: string; content: React.ReactNode };

/**
 * Tabbed panel for the home page so the whole story fits in one screen. Keyboard: left/right arrows,
 * Home and End move between tabs. The active tab is mirrored in the URL hash so links like /#faq work
 * from any page and survive a reload.
 */
export function HomeTabs({ tabs }: { tabs: HomeTab[] }) {
  const ids = tabs.map((t) => t.id);
  const [active, setActive] = useState(ids[0]);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const fromHash = useCallback(() => {
    const h = window.location.hash.replace('#', '');
    if (ids.includes(h)) setActive(h);
  }, [ids]);

  useEffect(() => {
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [fromHash]);

  function select(id: string, focus = false) {
    setActive(id);
    try {
      window.history.replaceState(null, '', `#${id}`);
    } catch {
      // History can be unavailable in sandboxed frames; the tab still switches.
    }
    if (focus) refs.current[id]?.focus();
  }

  function onKey(e: React.KeyboardEvent, i: number) {
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % ids.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = ids.length - 1;
    if (n >= 0) {
      e.preventDefault();
      select(ids[n], true);
    }
  }

  return (
    <div className="panel flex min-h-0 flex-col overflow-hidden lg:h-full">
      <div role="tablist" aria-label="About LOOK AFRICA Lead Hunter" className="flex gap-0.5 overflow-x-auto border-b border-line p-1.5">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            role="tab"
            id={`tab-${t.id}`}
            type="button"
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            className="tab"
            onClick={() => select(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tabs.map((t) => (
          <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}
