import { useEffect, useRef, useState } from "react";
import { api, errorText } from "../lib/api";
import { notice } from "../lib/ui";
import { MicIcon } from "./Icons";

const MAX_MS = 5 * 60_000;
const MIN_MS = 700;
/** How far the finger may leave the button before letting go cancels. */
const CANCEL_PX = 90;

type Recording = {
  recorder: MediaRecorder;
  stream: MediaStream;
  chunks: Blob[];
  start: number;
};

const clockOf = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** LINE for iPhone's voice message panel, in the keyboard's place: hold the
 *  green button to record, let go to send, slide off it to cancel. */
export function VoicePanel({ chatId }: { chatId: string }) {
  const [phase, setPhase] = useState<"idle" | "starting" | "recording" | "sending">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [cancel, setCancel] = useState(false);
  const rec = useRef<Recording | null>(null);
  const held = useRef(false);
  const cancelRef = useRef(false);
  const button = useRef<HTMLButtonElement>(null);

  // A clock while recording; past the limit the clip goes out by itself.
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => {
      const r = rec.current;
      if (!r) return;
      const ms = Date.now() - r.start;
      setElapsed(ms);
      if (ms >= MAX_MS) finish(true);
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  // Leaving the chat or closing the panel drops a recording in progress.
  useEffect(() => () => stopTracks(), []);

  const stopTracks = () => {
    const r = rec.current;
    if (!r) return;
    rec.current = null;
    if (r.recorder.state !== "inactive") {
      r.recorder.onstop = null;
      r.recorder.stop();
    }
    r.stream.getTracks().forEach((t) => t.stop());
  };

  const begin = async () => {
    if (phase !== "idle") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      notice("อัดเสียงในแอปนี้ไม่ได้บนอุปกรณ์นี้");
      return;
    }
    held.current = true;
    cancelRef.current = false;
    setCancel(false);
    setElapsed(0);
    setPhase("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase("idle");
      notice("ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน เปิดได้ที่ การตั้งค่า > LAAB > ไมโครโฟน");
      return;
    }
    // Let go while iOS asked for permission: nothing to record.
    if (!held.current) {
      stream.getTracks().forEach((t) => t.stop());
      setPhase("idle");
      return;
    }
    const type = ["audio/mp4", "audio/aac", "audio/webm"].find((t) => MediaRecorder.isTypeSupported?.(t));
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const r: Recording = { recorder, stream, chunks: [], start: Date.now() };
    recorder.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
    rec.current = r;
    recorder.start(250);
    navigator.vibrate?.(10);
    setPhase("recording");
  };

  const finish = (send: boolean) => {
    held.current = false;
    const r = rec.current;
    if (!r) return;
    const ms = Date.now() - r.start;
    r.recorder.onstop = async () => {
      r.stream.getTracks().forEach((t) => t.stop());
      rec.current = null;
      if (!send) return setPhase("idle");
      if (ms < MIN_MS) {
        notice("กดค้างไว้เพื่ออัดเสียง");
        return setPhase("idle");
      }
      setPhase("sending");
      try {
        const blob = new Blob(r.chunks, { type: r.recorder.mimeType || "audio/mp4" });
        await api.sendVoiceBytes(chatId, new Uint8Array(await blob.arrayBuffer()), ms);
      } catch (e) {
        notice(`ส่งข้อความเสียงไม่สำเร็จ: ${errorText(e)}`);
      } finally {
        setPhase("idle");
      }
    };
    if (r.recorder.state !== "inactive") r.recorder.stop();
    else r.recorder.onstop?.(new Event("stop"));
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    button.current?.setPointerCapture?.(e.pointerId);
    void begin();
  };
  const move = (e: React.PointerEvent) => {
    if (!held.current) return;
    const b = button.current?.getBoundingClientRect();
    if (!b) return;
    const dx = e.clientX - (b.left + b.width / 2);
    const dy = e.clientY - (b.top + b.height / 2);
    const away = Math.hypot(dx, dy) > b.width / 2 + CANCEL_PX;
    cancelRef.current = away;
    setCancel(away);
  };
  const up = () => {
    if (!held.current) return;
    held.current = false;
    if (rec.current) finish(!cancelRef.current);
  };

  const recording = phase === "recording";
  const hint =
    phase === "sending"
      ? "กำลังส่ง…"
      : recording
        ? cancel
          ? "ปล่อยนิ้วเพื่อยกเลิก"
          : "ปล่อยนิ้วเพื่อส่ง · ลากออกเพื่อยกเลิก"
        : "กดปุ่มค้างไว้เพื่ออัดเสียง";
  return (
    <div className="ios-panel flex flex-col items-center justify-center gap-5 select-none" data-panel="voice">
      <div className={`h-7 text-[22px] font-semibold tabular-nums ${recording ? (cancel ? "text-badge-red" : "text-primary") : "text-secondary"}`}>
        {recording ? clockOf(elapsed) : "0:00"}
      </div>
      <button
        ref={button}
        type="button"
        aria-label="กดค้างเพื่ออัดเสียง"
        disabled={phase === "sending"}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => (held.current = false, rec.current && finish(false))}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative grid h-[104px] w-[104px] touch-none place-items-center rounded-full text-white transition-[background-color,scale] duration-150 disabled:opacity-50 ${
          recording ? (cancel ? "scale-95 bg-badge-red" : "scale-110 bg-line-green") : "bg-line-green"
        }`}
      >
        {recording && !cancel && <span className="absolute inset-0 animate-ping rounded-full bg-line-green/40" />}
        <MicIcon size={44} />
      </button>
      <div className="text-[13px] text-secondary">{hint}</div>
    </div>
  );
}
