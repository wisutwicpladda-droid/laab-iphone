import { useQuery } from "@tanstack/react-query";
import { setAnalytics } from "../lib/analytics";
import { api, errorText, q, queryClient, useSession } from "../lib/api";
import { openChat } from "../lib/nav";
import { notice, setUi, useUi } from "../lib/ui";
import { Avatar } from "./Avatar";
import { BookmarkIcon, ChevronIcon, EyeSlashIcon, SyncIcon } from "./Icons";

const megabytes = (n: number) => (n >= 1024 ** 3 ? `${(n / 1024 ** 3).toFixed(1)} GB` : `${Math.round(n / 1024 ** 2)} MB`);

function Toggle({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-150 ${on ? "bg-line-green" : "bg-secondary/40"}`}>
      <span className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-[left] duration-150 ${on ? "left-[22px]" : "left-[2px]"}`} />
    </span>
  );
}

function Row({
  label,
  detail,
  icon,
  onClick,
  toggle,
  danger,
  disabled,
}: {
  label: string;
  detail?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  toggle?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      role={toggle === undefined ? undefined : "switch"}
      aria-checked={toggle}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left active:bg-row-selected disabled:opacity-40"
    >
      {icon && <span className="grid w-7 shrink-0 place-items-center text-secondary">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block text-[16px] ${danger ? "text-badge-red" : "text-primary"}`}>{label}</span>
        {detail && <span className="block text-[12.5px] leading-snug text-secondary">{detail}</span>}
      </span>
      {toggle !== undefined ? <Toggle on={toggle} /> : !danger && <ChevronIcon dir="right" size={14} className="shrink-0 text-secondary" />}
    </button>
  );
}

const Group = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <section className="pt-5">
    {title && <h2 className="px-4 pb-1.5 text-[13px] text-secondary">{title}</h2>}
    <div className="divide-y divide-separator">{children}</div>
  </section>
);

/** LINE for iPhone's settings, as the last tab: your profile, then rows. */
export function MorePage() {
  const s = useSession();
  const me = s?.profile;
  const signedIn = s?.state === "signed_in";
  const stealth = useUi((u) => u.stealthRead);
  const dev = useUi((u) => u.developerMode);
  const { data: analytics } = useQuery(q.analytics);
  const { data: cacheBytes } = useQuery({ queryKey: ["cache-size"], queryFn: api.cacheSize, staleTime: 0 });
  const clearCache = () =>
    setUi({
      confirm: {
        title: "ล้าง cache หรือไม่",
        body: "รูป วิดีโอ ไฟล์ และรูปโปรไฟล์ที่เก็บไว้ในเครื่องจะถูกลบ แล้วโหลดใหม่เมื่อเปิดดู ไฟล์ที่ LINE ลบจากเซิร์ฟเวอร์แล้วจะโหลดใหม่ไม่ได้",
        action: "ล้าง",
        danger: true,
        run: () => api.clearCache().then(() => queryClient.invalidateQueries()),
      },
    });
  const logout = () =>
    setUi({
      confirm: {
        title: "ออกจากระบบหรือไม่",
        body: "ต้องเข้าสู่ระบบด้วย QR Code อีกครั้งเพื่อใช้งาน",
        action: "ออกจากระบบ",
        danger: true,
        run: () => api.logout(),
      },
    });
  return (
    <div className="flex h-full flex-col bg-list">
      <h1 className="flex h-[52px] shrink-0 items-center px-4 text-[22px] font-bold text-primary">ตั้งค่า</h1>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {me && (
          <button onClick={() => openChat(me.mid)} className="flex w-full items-center gap-4 px-4 py-2 text-left active:bg-row-selected">
            <Avatar id={me.mid} name={me.displayName} picture={me.picture} size={60} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[19px] font-bold">{me.displayName}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[13px] text-secondary">
                <BookmarkIcon size={12} /> Keep Memo
              </span>
            </span>
            <ChevronIcon dir="right" size={14} className="text-secondary" />
          </button>
        )}
        <Group title="ความเป็นส่วนตัว">
          <Row
            label="แอบอ่าน"
            detail={stealth ? "อีกฝ่ายไม่เห็นว่าคุณอ่านแล้ว" : "เปิดเพื่ออ่านโดยไม่ส่งสถานะอ่านแล้ว"}
            icon={<EyeSlashIcon size={20} />}
            toggle={stealth}
            onClick={() => setUi({ stealthRead: !stealth })}
          />
        </Group>
        <Group title="แชท">
          <Row label="รีเฟรชแชท" icon={<SyncIcon size={19} />} disabled={!signedIn} onClick={() => api.refresh(true).catch((e) => notice(errorText(e)))} />
          <Row label="ล้าง cache" detail={cacheBytes != null ? megabytes(cacheBytes) : undefined} onClick={clearCache} />
        </Group>
        <Group title="อื่นๆ">
          {analytics && analytics !== "unavailable" && (
            <Row
              label="ส่งสถิติการใช้งาน"
              toggle={analytics === "on"}
              onClick={() => setAnalytics(analytics !== "on").catch((e) => notice(errorText(e)))}
            />
          )}
          {analytics && analytics !== "unavailable" && (
            <Row label="รายงานปัญหา" onClick={() => setUi({ sheet: { kind: "report", messageId: null } })} />
          )}
          <Row label="เครื่องมือนักพัฒนา" toggle={dev} onClick={() => setUi({ developerMode: !dev })} />
        </Group>
        {signedIn && (
          <Group>
            <Row label="ออกจากระบบ" danger onClick={logout} />
          </Group>
        )}
        <p className="px-4 pt-5 pb-28 text-[12px] leading-relaxed text-secondary">
          {me ? `${me.displayName} · ${me.device}` : ""}
          <br />
          {s?.status}
        </p>
      </div>
    </div>
  );
}
