import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { q as queries, useChatList, useSession } from "../lib/api";
import { isKeepMemo } from "../lib/chatList";
import { openChat } from "../lib/nav";
import type { Chat } from "../lib/types";
import { setUi } from "../lib/ui";
import { Avatar } from "./Avatar";
import { BookmarkIcon, ChevronIcon, GroupIcon, PersonPlusIcon, SearchIcon } from "./Icons";
import { Spinner } from "./kit";
import { isIOS } from "../lib/platform";
import { IosSegmentHeader } from "./ChatList";

/** LINE for iPhone: each tab opens with a large title. */
const IosTitle = ({ children }: { children: string }) => (
  <h1 className="flex h-[52px] shrink-0 items-center px-4 text-[22px] font-bold text-primary">{children}</h1>
);

const open = (id: string) => {
  setUi({ railPage: "chats" });
  openChat(id);
};

type Row = Pick<Chat, "id" | "name" | "kind" | "picture" | "avatar" | "memberCount">;

function Section({ title, items }: { title: string; items: Row[] }) {
  const [shown, setShown] = useState(true);
  if (!items.length) return null;
  return (
    <div className="pt-2">
      <button
        onClick={() => setShown(!shown)}
        className={`flex w-full items-center px-4 ${isIOS ? "py-2.5 text-[15px] font-semibold text-primary" : "py-1.5 text-[12px] text-secondary"}`}
      >
        <span className="flex-1 text-left">
          {title} {items.length}
        </span>
        <ChevronIcon dir={shown ? "up" : "down"} size={isIOS ? 14 : 11} className={isIOS ? "text-secondary" : undefined} />
      </button>
      {shown &&
        items.map((c) => (
          <button
            key={c.id}
            onClick={() => open(c.id)}
            className={`flex w-full items-center gap-3 px-4 text-left hover:bg-row-hover ${isIOS ? "h-[62px] active:bg-row-selected" : "h-[50px]"}`}
          >
            <Avatar id={c.id} name={c.name} size={isIOS ? 46 : 38} picture={c.picture} local={c.avatar} />
            <span className={`truncate ${isIOS ? "text-[16px]" : "text-[13.5px]"}`}>
              {c.name}
              {c.kind === "group" && c.memberCount ? ` (${c.memberCount})` : ""}
            </span>
          </button>
        ))}
    </div>
  );
}

/** LINE for Mac's friends page: search by name, your profile with Keep
 *  Memo, then groups and friends. On iPhone it is also the "เพื่อน" side of
 *  the chats tab (`segment`), under the "แชท | เพื่อน" switch. */
export function FriendsPage({ segment = false }: { segment?: boolean }) {
  const list = useChatList();
  const s = useSession();
  const [query, setQuery] = useState("");
  const me = s?.profile;
  const q = query.trim().toLocaleLowerCase("th");
  const { data: friendList } = useQuery(queries.friends);
  const match = (c: Row) => !q || c.name.toLocaleLowerCase("th").includes(q);
  const byName = (a: Row, b: Row) => a.name.localeCompare(b.name, "th");
  const groups = useMemo(() => (list?.chats ?? []).filter((c) => c.kind === "group" && match(c)).sort(byName), [list, q]);
  // LINE's friend list, not everyone with a chat: a chat row lends its
  // cached avatar.
  const friends = useMemo(() => {
    const rows = new Map((list?.chats ?? []).map((c) => [c.id, c]));
    return (friendList ?? [])
      .filter((f) => f.kind === "dm" && f.mid !== me?.mid)
      .map((f): Row => ({
        id: f.mid,
        name: f.name,
        kind: f.kind,
        picture: f.picture,
        avatar: rows.get(f.mid)?.avatar ?? null,
        memberCount: null,
      }))
      .filter((f) => !isKeepMemo(f, me?.mid) && match(f))
      .sort(byName);
  }, [friendList, list, q, me?.mid]);
  return (
    <div className="flex h-full flex-col bg-list">
      {isIOS && segment && <IosSegmentHeader active="friends" />}
      {isIOS && !segment && (
        // LINE for iPhone's home: actions top right, then your profile above the search.
        <>
          <div className="flex h-[52px] shrink-0 items-center justify-end px-4">
            <div className="ios-glass flex items-center rounded-full px-0.5">
              <button title="เพิ่มเพื่อน" aria-label="เพิ่มเพื่อน" onClick={() => setUi({ railPage: "add" })} className="grid h-[42px] w-[42px] place-items-center text-primary">
                <PersonPlusIcon size={22} />
              </button>
              <button title="Keep Memo" aria-label="Keep Memo" disabled={!me} onClick={() => me && open(me.mid)} className="grid h-[42px] w-[42px] place-items-center text-primary disabled:opacity-40">
                <BookmarkIcon size={21} strokeWidth={1.8} />
              </button>
            </div>
          </div>
          {me && (
            <div className="flex items-center gap-4 px-4 pt-1 pb-3">
              <Avatar id={me.mid} name={me.displayName} picture={me.picture} size={68} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[21px] font-bold">{me.displayName}</div>
                <button onClick={() => open(me.mid)} className="mt-1.5 flex items-center gap-1 rounded-full bg-field px-3 py-1 text-[13px]">
                  <BookmarkIcon size={12} /> Keep Memo
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <div className={isIOS ? "px-4 pt-2 pb-2" : "drag px-4 pt-[34px] pb-2"} data-tauri-drag-region={isIOS ? undefined : true}>
        <label className="list-search no-drag flex h-8 items-center gap-2 rounded-md bg-field px-2.5 text-secondary">
          <SearchIcon size={isIOS ? 17 : 14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isIOS ? "ค้นหา" : "ค้นหาด้วยชื่อ"}
            className="selectable min-w-0 flex-1 bg-transparent text-[13px] text-primary outline-none placeholder:text-secondary"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {me && !q && (!isIOS || segment) && (
          <div className="flex items-center gap-3 px-4 py-2.5">
            <Avatar id={me.mid} name={me.displayName} picture={me.picture} size={isIOS ? 60 : 52} />
            <div className="min-w-0">
              <div className={isIOS ? "truncate text-[18px] font-semibold" : "truncate text-[14px]"}>{me.displayName}</div>
              <button
                onClick={() => open(me.mid)}
                className="mt-1 flex items-center gap-1 rounded-full border border-secondary/40 px-2.5 py-0.5 text-[11.5px] hover:bg-row-hover"
              >
                <BookmarkIcon size={11} /> Keep Memo
              </button>
            </div>
          </div>
        )}
        {isIOS ? (
          <>
            <Section title="เพื่อน" items={friends} />
            <Section title="กลุ่ม" items={groups} />
          </>
        ) : (
          <>
            <Section title="กลุ่ม" items={groups} />
            <Section title="เพื่อน" items={friends} />
          </>
        )}
        {!list ? (
          <div className="grid place-items-center pt-16 text-secondary">
            <Spinner />
          </div>
        ) : (
          !groups.length &&
          !friends.length && (
            <div className="px-8 pt-12 text-center text-[13px] leading-relaxed text-secondary">
              {q ? "ไม่พบเพื่อนหรือกลุ่มที่ชื่อตรงกัน" : "ยังไม่มีเพื่อนหรือกลุ่ม เพิ่มเพื่อนได้จากหน้าเพิ่มเพื่อน"}
            </div>
          )
        )}
      </div>
    </div>
  );
}

/** LINE for Mac's add-friend page; LAAB can search by ID or link, join
 *  groups by invite link and create groups (OpenChat is not supported). */
export function AddFriendPage() {
  if (isIOS) return <IosAddFriendPage />;
  return (
    <div className={isIOS ? "flex h-full flex-col bg-list" : "flex h-full flex-col bg-list pt-[38px]"}>
      {isIOS && <IosTitle>เพิ่มเพื่อน</IosTitle>}
      <button
        onClick={() => setUi({ sheet: { kind: "add-friend" } })}
        className="flex h-[50px] items-center gap-3 px-4 text-left text-[13.5px] hover:bg-row-hover"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-field">
          <PersonPlusIcon size={18} />
        </span>
        ค้นหาเพื่อน
      </button>
      <button
        onClick={() => setUi({ sheet: { kind: "create-group" } })}
        className="flex h-[50px] items-center gap-3 px-4 text-left text-[13.5px] hover:bg-row-hover"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-field">
          <PersonPlusIcon size={18} />
        </span>
        สร้างกลุ่ม
      </button>
      <p className="px-4 pt-3 text-[12px] leading-relaxed text-secondary">
        ค้นหาด้วย LINE ID หรือลิงก์เพิ่มเพื่อน หรือวางลิงก์เชิญเพื่อเข้ากลุ่ม
      </p>
    </div>
  );
}

/** LINE for iPhone's add-friend tab: a row of round actions under the title. */
function IosAddFriendPage() {
  const action = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <button onClick={onClick} className="flex w-[84px] flex-col items-center gap-2 text-[13px] text-primary active:opacity-70">
      <span className="grid h-[60px] w-[60px] place-items-center rounded-full bg-field">{icon}</span>
      {label}
    </button>
  );
  return (
    <div className="flex h-full flex-col bg-list">
      <IosTitle>เพิ่มเพื่อน</IosTitle>
      <div className="flex justify-center gap-6 px-4 pt-4 pb-6">
        {action("ค้นหา", <SearchIcon size={26} />, () => setUi({ sheet: { kind: "add-friend" } }))}
        {action("สร้างกลุ่ม", <GroupIcon size={28} />, () => setUi({ sheet: { kind: "create-group" } }))}
        {action("เข้ากลุ่ม", <PersonPlusIcon size={26} />, () => setUi({ sheet: { kind: "add-friend" } }))}
      </div>
      <div className="mx-4 rounded-2xl bg-field px-4 py-3.5 text-[14px] leading-relaxed text-secondary">
        ค้นหาเพื่อนด้วย LINE ID หรือวางลิงก์เพิ่มเพื่อน · วางลิงก์เชิญเพื่อเข้ากลุ่ม
      </div>
    </div>
  );
}
