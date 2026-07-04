"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { NewBatchModal } from "./NewBatchModal";
import { SyncIndicator } from "./SyncIndicator";
import { getNewBatchContext } from "@/lib/local/store";

type Tab = { href: string; label: string; icon: ReactNode };

const TABS: Tab[] = [
  { href: "/batches", label: "Batches", icon: <IconBatches /> },
  { href: "/media", label: "Media", icon: <IconMedia /> },
  { href: "/patterns", label: "Patterns", icon: <IconPatterns /> },
  { href: "/supplies", label: "Supplies", icon: <IconSupplies /> },
];

// Empty fallback used until the on-device store has loaded the context.
const EMPTY_CONTEXT = {
  options: { species: [], zones: [], sterilizationMethods: [] },
  defaults: {
    species: "",
    zone: "",
    sterilizationMethod: "",
    quantity: 100,
    pdaBatchRef: "",
  },
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const ctx = useLiveQuery(getNewBatchContext, [], EMPTY_CONTEXT);

  return (
    <>
      <SyncIndicator />

      <main className="mx-auto min-h-screen w-full max-w-md px-4 pt-5">
        {children}
      </main>

      <NewBatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        options={ctx.options}
        defaults={ctx.defaults}
      />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-600 bg-ink-800/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          <NavItem tab={TABS[0]} active={pathname.startsWith(TABS[0].href)} />
          <NavItem tab={TABS[1]} active={pathname.startsWith(TABS[1].href)} />

          {/* Center + for quick batch logging from anywhere. */}
          <div className="flex justify-center">
            <button
              type="button"
              aria-label="New batch"
              onClick={() => setModalOpen(true)}
              className="-mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-moss-500 text-ink-900 shadow-lg shadow-moss-600/30 active:scale-95"
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <NavItem tab={TABS[2]} active={pathname.startsWith(TABS[2].href)} />
          <NavItem tab={TABS[3]} active={pathname.startsWith(TABS[3].href)} />
        </div>
      </nav>
    </>
  );
}

function NavItem({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      className={[
        "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
        active ? "text-moss-400" : "text-zinc-500",
      ].join(" ")}
    >
      {tab.icon}
      {tab.label}
    </Link>
  );
}

function IconBatches() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
    </svg>
  );
}
function IconMedia() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
    </svg>
  );
}
function IconPatterns() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
    </svg>
  );
}
function IconSupplies() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" />
    </svg>
  );
}
