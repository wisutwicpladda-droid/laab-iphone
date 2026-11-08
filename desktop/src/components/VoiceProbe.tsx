import { useEffect, useState } from "react";
import { useSession } from "../lib/api";
import { isIOS } from "../lib/platform";

/** Demo mode on iPhone only: can this web view record a voice message?
 *  Shown for the simulator screenshot; never in a signed-in session. */
export function VoiceProbe() {
  const demo = useSession()?.state === "demo";
  const [text, setText] = useState("");
  useEffect(() => {
    if (!isIOS || !demo) return;
    const lines: string[] = [];
    const show = (l: string) => {
      lines.push(l);
      setText(lines.join("\n"));
    };
    const t = setTimeout(async () => {
      show(`secure ${window.isSecureContext} md ${!!navigator.mediaDevices?.getUserMedia} MR ${typeof MediaRecorder} mp4 ${typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("audio/mp4")}`);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream, MediaRecorder.isTypeSupported?.("audio/mp4") ? { mimeType: "audio/mp4" } : undefined);
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onstop = () => {
          stream.getTracks().forEach((x) => x.stop());
          const blob = new Blob(chunks, { type: rec.mimeType });
          show(`voice ok ${blob.size} bytes ${rec.mimeType}`);
        };
        rec.start(250);
        setTimeout(() => rec.stop(), 1500);
      } catch (e) {
        show(`voice error ${(e as Error).name}: ${(e as Error).message}`);
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [demo]);
  if (!text) return null;
  return <pre className="pointer-events-none fixed top-[40%] right-1 left-1 z-[999] rounded bg-black/80 p-1 text-[11px] leading-tight text-[#0f0] whitespace-pre-wrap">{text}</pre>;
}
