import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, errorText, mediaUrl, q, queryClient } from "../lib/api";
import type { Sticker } from "../lib/types";
import { notice } from "../lib/ui";
import { isIOS } from "../lib/platform";
import { ClockIcon2, CloseIcon } from "./Icons";
import { Spinner } from "./kit";

/** Send a sticker, saying in Thai why when LINE refuses it. */
export async function sendSticker(chatId: string, s: Sticker, silent = false) {
  try {
    await api.sendSticker(chatId, s, silent);
    queryClient.invalidateQueries({ queryKey: ["stickers"] });
  } catch (e) {
    const text = errorText(e);
    if (text === "sticker_not_owned") {
      notice("สติกเกอร์นี้ไม่ได้อยู่ในบัญชีของคุณ");
      queryClient.removeQueries({ queryKey: ["stickers"] });
    } else notice(`ส่งสติกเกอร์ไม่สำเร็จ: ${text}`);
  }
}

/** The stickers of the account. On iPhone it sits in the keyboard's place,
 *  tabs on top, and a tap shows the sticker over the message bar first
 *  (`onPreview`), as in LINE; another tap there sends it. */
export function StickerPanel({ chatId, onClose, onPreview }: { chatId: string; onClose: () => void; onPreview?: (s: Sticker) => void }) {
  const { data: packs, error, isLoading, refetch } = useQuery(q.stickers);
  const [pack, setPack] = useState<string | null>(null);
  useEffect(() => {
    if (packs?.length && !packs.some((p) => p.id === pack)) setPack(packs[0].id);
  }, [packs, pack]);
  const current = packs?.find((p) => p.id === pack);
  // Packages come without their stickers; the one opened loads them.
  const lazy = !!current && !current.recent && current.stickers.length === 0;
  const opened = useQuery({
    queryKey: ["sticker-pack", current?.id],
    queryFn: () => api.stickerPack(current!.id, current!.name, current!.version ?? null),
    enabled: lazy,
    staleTime: Infinity,
  });
  const stickers = lazy ? (opened.data?.stickers ?? []) : (current?.stickers ?? []);
  // ⌥-click sends without a notification, as ⌥Return does for text.
  const send = (s: Sticker, silent: boolean) => (onPreview ? onPreview(s) : void sendSticker(chatId, s, silent));
  const tabs = (
    <div className={`flex shrink-0 items-center gap-1 px-2 ${isIOS ? "h-[46px] border-b border-separator" : "h-12 border-t border-separator"}`}>
      <div className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
        {packs?.map((p) => (
          <button
            key={p.id}
            title={p.recent ? "ล่าสุด" : p.name}
            aria-label={p.recent ? "ล่าสุด" : p.name}
            onClick={() => setPack(p.id)}
            className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isIOS && pack === p.id ? "bg-field" : ""}`}
          >
            {p.recent ? (
              isIOS ? (
                <ClockIcon2 size={22} className="text-secondary" />
              ) : (
                <span className="text-[11px] text-secondary">ล่าสุด</span>
              )
            ) : (
              <img src={mediaUrl.pack(p.id)} loading="lazy" className="h-7 w-7 rounded-md object-contain" alt="" draggable={false} />
            )}
            {!isIOS && pack === p.id && <span className="absolute bottom-0.5 h-0.5 w-[18px] rounded bg-line-green" />}
          </button>
        ))}
      </div>
      {!isIOS && (
        <button title="ปิด" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-secondary hover:bg-field">
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
  return (
    <div className={isIOS ? "ios-panel flex flex-col overflow-hidden" : "flex h-[248px] flex-col overflow-hidden border-t border-separator bg-chat"} data-panel="stickers">
      {isIOS && tabs}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {(isLoading || (lazy && opened.isLoading)) && (
          <div className="grid h-full place-items-center">
            <Spinner size={18} />
          </div>
        )}
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[13px] text-secondary">
            {errorText(error)}
            <button className="rounded-md bg-field px-3 py-1 text-primary" onClick={() => refetch()}>
              ลองอีกครั้ง
            </button>
          </div>
        )}
        {packs?.length === 0 && (
          <div className="grid h-full place-items-center px-6 text-center text-[13px] text-secondary">
            ยังไม่มีสติกเกอร์ในบัญชีนี้ ดาวน์โหลดสติกเกอร์ได้จาก LINE บนโทรศัพท์
          </div>
        )}
        {lazy && opened.error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[13px] text-secondary">
            โหลดสติกเกอร์ชุดนี้ไม่ได้
            <button className="rounded-md bg-field px-3 py-1 text-primary" onClick={() => opened.refetch()}>
              ลองอีกครั้ง
            </button>
          </div>
        )}
        {current && (
          <div className="grid gap-1" style={{ gridTemplateColumns: isIOS ? "repeat(4, minmax(0, 1fr))" : "repeat(auto-fill, minmax(76px, 1fr))" }}>
            {stickers.map((s) => (
              <button key={s.stickerId} onClick={(e) => send(s, e.altKey)} className="grid h-[84px] place-items-center rounded-lg hover:bg-field active:bg-field">
                <img
                  src={mediaUrl.sticker(s.stickerId, false)}
                  loading="lazy"
                  className="h-[72px] w-[72px] object-contain"
                  alt=""
                  draggable={false}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {!isIOS && tabs}
    </div>
  );
}
