import { QueryClientProvider } from "@tanstack/react-query";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { RouterProvider } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import React, { useEffect, useRef, useState } from "react";
import { useSwipeBack } from "./lib/swipeBack";
import { listen } from "@tauri-apps/api/event";
import { isIOS } from "./lib/platform";
import ReactDOM from "react-dom/client";
import { reportUncaughtErrors } from "./lib/analytics";
import { queryClient, useBackendEvents } from "./lib/api";
import { router } from "./router";
import "./index.css";

function App() {
  useBackendEvents();
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    if (!isIOS) return;
    document.documentElement.classList.add("ios");
    const viewport = window.visualViewport;
    const resize = () => {
      const height = viewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
      // The keyboard covers the home indicator, so its safe area is not needed.
      document.documentElement.classList.toggle("keyboard", height < window.innerHeight - 120);
      // Bottom sheets sit on the keyboard, not under it.
      const under = Math.max(0, window.innerHeight - (viewport?.offsetTop ?? 0) - height);
      document.documentElement.style.setProperty("--sheet-bottom", `${under}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    const changed = () => setHash(location.hash);
    window.addEventListener("hashchange", changed);
    const off = listen<string>("mobile-route", e => { location.hash = e.payload; });
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("hashchange", changed);
      off.then(f => f());
    };
  }, []);
  const auxiliary = isIOS && hash !== "" && hash !== "#/" && !hash.startsWith("#/chat/");
  // The photo/file page is light and the viewer black whatever the theme;
  // the status bar area follows them.
  const tone = hash.startsWith("#/media/") ? "aux-light" : hash.startsWith("#/viewer") ? "aux-dark" : "";
  useEffect(() => {
    if (!isIOS) return;
    const html = document.documentElement;
    html.classList.toggle("aux-light-page", auxiliary && tone === "aux-light");
    html.classList.toggle("aux-dark-page", auxiliary && tone === "aux-dark");
  }, [auxiliary, tone]);
  // Pages opened over the chat (calendar, albums…) also go back with a swipe
  // from the left edge.
  const swipeRoot = useRef<HTMLDivElement>(null);
  useSwipeBack(auxiliary, swipeRoot, { front: ".aux-page" }, () => history.back(), () => {
    const h = location.hash;
    return h === "" || h === "#/" || h.startsWith("#/chat/");
  });
  return <div ref={swipeRoot} className="relative h-full overflow-hidden">
    <div className={auxiliary ? `aux-page relative h-full bg-list ${tone}` : "h-full"}>
      {/* LINE for iPhone: ‹ at the top left, level with the page's title. */}
      {auxiliary && (
        <button className="mobile-back" aria-label="ย้อนกลับ" onClick={() => history.back()}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
      )}
      <div style={{ height: "100%" }}><RouterProvider router={router} /></div>
    </div>
  </div>;
}

reportUncaughtErrors();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HotkeysProvider>
        {/* Reduce Motion in System Settings: Motion drops movement, keeps fades. */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </HotkeysProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
