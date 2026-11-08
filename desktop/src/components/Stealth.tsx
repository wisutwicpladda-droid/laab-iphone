import { Menu } from "@base-ui/react/menu";
import { setUi, useUi } from "../lib/ui";
import { EyeSlashIcon } from "./Icons";
import { itemClass } from "./kit";

/** An iOS-style on/off switch, drawn for a menu row. */
function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full transition-colors duration-150 ${on ? "bg-line-green" : "bg-secondary/40"}`}
    >
      <span
        className={`absolute h-[22px] w-[22px] rounded-full bg-white shadow transition-[left] duration-150 ${on ? "left-[20px]" : "left-[2px]"}`}
      />
    </span>
  );
}

/** Stealth reading as a switch row; the menu stays open so the switch is
 *  seen to flip. */
export function StealthMenuItem() {
  const on = useUi((s) => s.stealthRead);
  return (
    <Menu.CheckboxItem
      className={`${itemClass} gap-3 py-2!`}
      checked={on}
      closeOnClick={false}
      onCheckedChange={(v) => setUi({ stealthRead: v })}
    >
      <EyeSlashIcon size={19} className="shrink-0" />
      <span className="min-w-0 flex-1 leading-tight">
        แอบอ่าน
        <span className="block text-[11.5px] opacity-60">{on ? "เปิดอยู่: อีกฝ่ายไม่เห็นว่าอ่าน" : "ปิดอยู่: อ่านแล้วจะขึ้นว่าอ่าน"}</span>
      </span>
      <Switch on={on} />
    </Menu.CheckboxItem>
  );
}

/** Under the chat list's search while stealth reading is on; tap to turn it off. */
export function StealthNotice() {
  const on = useUi((s) => s.stealthRead);
  if (!on) return null;
  return (
    <button
      onClick={() => setUi({ stealthRead: false })}
      className="mx-4 mb-2 flex shrink-0 items-center gap-2 rounded-full bg-field px-3.5 py-1.5 text-left text-[13px] text-secondary"
    >
      <EyeSlashIcon size={16} className="shrink-0 text-line-green" />
      <span className="min-w-0 flex-1 truncate">แอบอ่านเปิดอยู่ อีกฝ่ายจะไม่เห็นว่าคุณอ่าน</span>
      <span className="shrink-0 font-semibold text-primary">ปิด</span>
    </button>
  );
}
