import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "../trpc";
import { decryptStringV1 } from "../crypto/verityCrypto";
import { usePassphrase } from "../state/passphrase";
import { Link } from "react-router-dom";

type Cursor = { occurredAt: string; id: string } | null;

function formatLocal(dt: Date) {
  // “git log-ish”: always show date + time
  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InteractionLog() {
  const { passphrase, isSet } = usePassphrase();

  // cursor pagination state
  const [cursor, setCursor] = useState<Cursor>(null);

  const list = trpc.interaction.list.useQuery(
    { limit: 20, cursor: cursor ?? undefined },
    { keepPreviousData: true, enabled: true },
  );

  // We’ll accumulate pages locally (simple + explicit)
  const [allItems, setAllItems] = useState<
    {
      id: string;
      titleCiphertext: string;
      contentCiphertext: string;
      occurredAt: string | Date;
      createdAt: string | Date;
      updatedAt: string | Date;
    }[]
  >([]);

  // Cache decrypted fields by id (avoid re-decrypt)
  const decryptedCache = useRef(
    new Map<string, { title: string; content: string; failed?: boolean }>(),
  );

  // When a new page loads, append into allItems
  useEffect(() => {
    if (!list.data) return;

    const next = list.data.items.map((it) => ({
      ...it,
      occurredAt: new Date(it.occurredAt),
      createdAt: new Date(it.createdAt),
      updatedAt: new Date(it.updatedAt),
    }));

    setAllItems((prev) => {
      // avoid duplicates (in case of refetch)
      const seen = new Set(prev.map((p) => p.id));
      const merged = [...prev];
      for (const n of next) {
        if (!seen.has(n.id)) merged.push(n);
      }
      return merged;
    });
  }, [list.data]);

  // If the user changes passphrase (or locks), reset decrypted cache + list
  const passphraseKey = passphrase ?? "";
  useEffect(() => {
    decryptedCache.current.clear();
    // We keep allItems (ciphertext) because it’s safe; only decrypted view changes.
    // If you prefer, you can also reset list state here.
  }, [passphraseKey]);

  const rows = useMemo(() => {
    return allItems.slice().sort((a, b) => {
      const ad = (a.occurredAt as Date).getTime();
      const bd = (b.occurredAt as Date).getTime();
      if (ad !== bd) return bd - ad;
      return b.id.localeCompare(a.id);
    });
  }, [allItems]);

  async function ensureDecrypted(
    id: string,
    titleCiphertext: string,
    contentCiphertext: string,
  ) {
    if (decryptedCache.current.has(id)) return;

    if (!isSet || !passphrase) {
      decryptedCache.current.set(id, { title: "", content: "", failed: true });
      return;
    }

    try {
      const [title, content] = await Promise.all([
        decryptStringV1({ envelopeB64u: titleCiphertext, passphrase }),
        decryptStringV1({ envelopeB64u: contentCiphertext, passphrase }),
      ]);
      decryptedCache.current.set(id, { title, content });
    } catch {
      decryptedCache.current.set(id, { title: "", content: "", failed: true });
    }
  }

  // Decrypt “visible-ish” items: for MVP, decrypt everything we have when passphrase is set
  useEffect(() => {
    if (!isSet || !passphrase) return;
    let cancelled = false;

    (async () => {
      for (const r of rows) {
        if (cancelled) return;
        await ensureDecrypted(r.id, r.titleCiphertext, r.contentCiphertext);
      }
      // force a re-render (cache is a ref)
      if (!cancelled) setTick((t) => t + 1);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSet, passphrase, rows.length]);

  const [tick, setTick] = useState(0); // used only to re-render when cache updates

  const nextCursor = list.data?.nextCursor ?? null;

  function onLoadMore() {
    if (!nextCursor) return;
    setCursor(nextCursor);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Interaction log</div>
            <div className="mt-1 text-sm text-slate-600">
              {isSet ? (
                <>Decrypted locally in your browser.</>
              ) : (
                <>
                  Set your passphrase in the Vault bar to view decrypted text.
                </>
              )}
            </div>
          </div>

          <div className="text-right text-xs text-slate-500">
            {rows.length} item{rows.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200">
        {rows.length === 0 && !list.isLoading ? (
          <div className="p-6 text-sm text-slate-600">No interactions yet.</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {rows.map((r) => {
              const dec = decryptedCache.current.get(r.id);
              const occurredAt = r.occurredAt as Date;

              const title =
                isSet && dec && !dec.failed
                  ? dec.title
                  : isSet
                    ? "Decrypting…"
                    : "Locked";
              const content =
                isSet && dec && !dec.failed
                  ? dec.content
                  : isSet
                    ? ""
                    : "Unlock to view content.";

              return (
                <li key={r.id} className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Timestamp column (always visible) */}
                    <div className="w-44 shrink-0">
                      <div className="font-mono text-xs text-slate-700">
                        {formatLocal(occurredAt)}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-slate-400">
                        id {r.id.slice(0, 8)}
                        <div>
                        <button
                          type="button"
                          className="bg-slate-100 px-2  rounded mt-1 text-[10px] text-slate-400 hover:underline"
                          onClick={() => navigator.clipboard.writeText(r.id)}
                        >
                          copy id
                        </button>
                        </div>
                      </div>
                    </div>

                    {/* Content column */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          <Link
                            to={`/interactions/${r.id}`}
                            className="truncate text-sm font-semibold text-slate-900 hover:underline"
                          >
                            {title || (
                              <span className="text-slate-500">(no title)</span>
                            )}
                          </Link>
                        </div>

                        {dec?.failed && isSet && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
                            wrong passphrase?
                          </span>
                        )}
                      </div>

                      {content ? (
                        <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {content}
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-500">
                          <span className="font-mono text-xs">
                            {isSet
                              ? ""
                              : "(locked)"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {list.isLoading ? "Loading…" : null}
          {list.isError ? (
            <span className="text-red-600">{list.error.message}</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onLoadMore}
          disabled={!nextCursor || list.isFetching}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {nextCursor
            ? list.isFetching
              ? "Loading…"
              : "Load more"
            : "No more"}
        </button>
      </div>
    </div>
  );
}
