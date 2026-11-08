import { useEffect, useState } from "react";
import { useSession } from "../lib/api";
import { isIOS } from "../lib/platform";

/** Demo mode on iPhone only: the heights of the layout's layers, for the
 *  simulator screenshot that checks the chat fills the screen. */
export function LayoutProbe() {
  const demo = useSession()?.state === "demo";
  const [text, setText] = useState("");
  useEffect(() => {
    if (!isIOS || !demo) return;
    const measure = () => {
      const h = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return "-";
        const r = el.getBoundingClientRect();
        return `${Math.round(r.top)}+${Math.round(r.height)}`;
      };
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;top:0;height:env(safe-area-inset-top);width:env(safe-area-inset-bottom)";
      document.body.appendChild(probe);
      const safe = `${Math.round(probe.getBoundingClientRect().height)}/${Math.round(probe.getBoundingClientRect().width)}`;
      probe.remove();
      setText(
        [
          `inner ${innerHeight} vv ${Math.round(window.visualViewport?.height ?? 0)} scr ${screen.height} safe ${safe}`,
          `html ${h("html")} body ${h("body")} root ${h("#root")}`,
          `layout ${h(".laab-layout")} conv ${h(".laab-conversation")} chat ${h(".ios-chat")} comp ${h(".composer-root")}`,
          `app-h ${getComputedStyle(document.documentElement).getPropertyValue("--app-height")}`,
        ].join("\n"),
      );
    };
    const t = setInterval(measure, 1000);
    measure();
    return () => clearInterval(t);
  }, [demo]);
  if (!text) return null;
  return (
    <pre className="pointer-events-none fixed top-[45%] right-1 left-1 z-[999] rounded bg-black/80 p-1 text-[10px] leading-tight text-[#0f0]">{text}</pre>
  );
}
