import { type RefObject, useEffect } from "react";

/** iPhone's back gesture: a drag from the left edge moves the page with the
 *  finger over the page under it; past a third of the width or with a flick
 *  it slides away and goes back, otherwise it slides home again. The page is
 *  moved directly, not through React state, so it keeps up with the finger. */

const EDGE = 28;
const DURATION = 280;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const BACK_EVENT = "laab:back";

/** Animated back, as the edge swipe does it (the chat header's ‹). */
export function animatedBack() {
  window.dispatchEvent(new Event(BACK_EVENT));
}

export function useSwipeBack(
  enabled: boolean,
  root: RefObject<HTMLElement | null>,
  parts: { front: string; under?: string[] },
  back: () => void,
  /** True once the back has happened and the page is gone. */
  gone: () => boolean,
) {
  useEffect(() => {
    const el = root.current;
    if (!enabled || !el) return;
    const front = () => el.querySelector<HTMLElement>(parts.front);
    const under = () => (parts.under ?? []).flatMap((s) => Array.from(el.querySelectorAll<HTMLElement>(s)));
    let start: { x: number; y: number; t: number } | null = null;
    let decided = false;
    let dragging = false;
    let busy = false;
    let dx = 0;

    const place = (x: number, animate: boolean) => {
      const width = el.clientWidth || 1;
      const p = Math.min(1, Math.max(0, x / width));
      const transition = animate ? `transform ${DURATION}ms ${EASE}, opacity ${DURATION}ms ${EASE}` : "none";
      const f = front();
      if (f) {
        f.style.transition = transition;
        f.style.transform = `translate3d(${x}px, 0, 0)`;
      }
      for (const u of under()) {
        u.style.transition = transition;
        u.style.transform = `translate3d(${-28 * (1 - p)}%, 0, 0)`;
        u.style.opacity = String(0.7 + 0.3 * p);
      }
    };
    const clear = () => {
      for (const n of [front(), ...under()]) {
        if (!n) continue;
        n.style.transition = "";
        n.style.transform = "";
        n.style.opacity = "";
      }
      el.classList.remove("swiping");
      busy = false;
    };
    // Finish: slide the rest of the way and go back, or slide home.
    const finish = (go: boolean) => {
      busy = true;
      place(go ? el.clientWidth : 0, true);
      window.setTimeout(() => {
        if (!go) return clear();
        back();
        // Keep the page where it is until it is gone, so it doesn't flash back.
        const began = performance.now();
        const wait = () => (gone() || performance.now() - began > 800 ? clear() : requestAnimationFrame(wait));
        requestAnimationFrame(wait);
      }, DURATION);
    };

    const onStart = (e: TouchEvent) => {
      start = null;
      if (busy || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > EDGE) return;
      start = { x: t.clientX, y: t.clientY, t: e.timeStamp };
      decided = false;
      dragging = false;
      dx = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const t = e.touches[0];
      const mx = t.clientX - start.x;
      const my = t.clientY - start.y;
      if (!decided) {
        if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
        decided = true;
        if (mx <= 0 || Math.abs(my) > Math.abs(mx)) {
          start = null;
          return;
        }
        dragging = true;
        (document.activeElement as HTMLElement | null)?.blur?.();
        el.classList.add("swiping");
      }
      if (!dragging) return;
      e.preventDefault();
      dx = Math.max(0, mx);
      place(dx, false);
    };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const elapsed = Math.max(1, e.timeStamp - start.t);
      start = null;
      if (!dragging) return;
      dragging = false;
      const flick = dx / elapsed > 0.45 && dx > 30;
      finish(dx > el.clientWidth / 3 || flick);
    };
    const onBack = () => {
      if (busy) return;
      el.classList.add("swiping");
      place(0, false);
      requestAnimationFrame(() => finish(true));
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    window.addEventListener(BACK_EVENT, onBack);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      window.removeEventListener(BACK_EVENT, onBack);
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
