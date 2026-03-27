import { Link, useParams } from "react-router-dom";
import { trpc } from "../trpc";
import { decryptStringV1, encryptStringV1 } from "../crypto/verityCrypto";
import { usePassphrase } from "../state/passphrase";
import { useEffect, useMemo, useState, useRef } from "react";

function fmt(dt: Date) {
  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InteractionDetail() {
  const { id } = useParams();
  const { passphrase, isSet } = usePassphrase();

  const update = trpc.interaction.update.useMutation({
    onSuccess: async () => {
      await q.refetch();
    },
  });

  async function onSave() {
    if (!id) return;

    if (!isSet || !passphrase) {
      alert("Unlock in the Vault bar to edit (needs passphrase).");
      return;
    }

    const occurredAtIso = new Date(draftOccurredAt).toISOString();

    const [titleCiphertext, contentCiphertext] = await Promise.all([
      encryptStringV1({ plaintext: draftTitle, passphrase }),
      encryptStringV1({ plaintext: draftContent, passphrase }),
    ]);

    await update.mutateAsync({
      id,
      titleCiphertext,
      contentCiphertext,
      occurredAt: occurredAtIso,
    });

    setIsEditing(false);
  }

  const [isEditing, setIsEditing] = useState(false);
  const [draftOccurredAt, setDraftOccurredAt] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  const threadQ = trpc.interaction.thread.useQuery(
    { id: id ?? "", max: 200 },
    { enabled: !!id },
  );

  const [threadTick, setThreadTick] = useState(0);
  const threadTitleCache = useRef(
    new Map<string, { title: string; failed?: boolean }>(),
  );

  useEffect(() => {
    threadTitleCache.current.clear();
    setThreadTick((t) => t + 1);
  }, [passphrase, isSet]);

  useEffect(() => {
    if (!isSet || !passphrase) return;
    if (!threadQ.data) return;

    let cancelled = false;

    (async () => {
      for (const it of threadQ.data.items) {
        if (cancelled) return;
        if (threadTitleCache.current.has(it.id)) continue;

        try {
          const title = await decryptStringV1({
            envelopeB64u: it.titleCiphertext,
            passphrase,
          });
          threadTitleCache.current.set(it.id, { title });
        } catch {
          threadTitleCache.current.set(it.id, { title: "", failed: true });
        }
        setThreadTick((t) => t + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadQ.data, isSet, passphrase]);

  const [toId, setToId] = useState("");
  const [relationType, setRelationType] = useState("related");

  const recentQ = trpc.interaction.list.useQuery(
    { limit: 10 },
    { enabled: !!id }, // load a small list
  );

  const createNext = trpc.link.createNext.useMutation({
    onSuccess: async () => {
      await linksQ.refetch();
    },
  });

  const [showLinkPrev, setShowLinkPrev] = useState(false);

  async function onAddLink() {
    if (!id) return;
    const trimmed = toId.trim();
    if (!trimmed) return;

    await createLink.mutateAsync({
      fromId: id,
      toId: trimmed,
      relationType: relationType.trim() || "related",
    });

    setToId("");
  }

  const linksQ = trpc.link.listForInteraction.useQuery(
    { id: id ?? "" },
    { enabled: !!id },
  );

  const createLink = trpc.link.create.useMutation({
    onSuccess: async () => {
      await linksQ.refetch();
    },
  });

  const deleteLink = trpc.link.delete.useMutation({
    onSuccess: async () => {
      await linksQ.refetch();
    },
  });

  const q = trpc.interaction.get.useQuery({ id: id ?? "" }, { enabled: !!id });

  const [decrypted, setDecrypted] = useState<{
    title: string;
    content: string;
    failed?: boolean;
  } | null>(null);

  const row = q.data;

  useEffect(() => {
    if (!row) return;
    const d = new Date(row.occurredAt);
    d.setSeconds(0, 0);
    setDraftOccurredAt(d.toISOString().slice(0, 16));
  }, [row?.id]);

  useEffect(() => {
    setDecrypted(null);

    if (!row) return;
    if (!isSet || !passphrase) return;

    let cancelled = false;
    (async () => {
      try {
        const [title, content] = await Promise.all([
          decryptStringV1({ envelopeB64u: row.titleCiphertext, passphrase }),
          decryptStringV1({ envelopeB64u: row.contentCiphertext, passphrase }),
        ]);
        // after successful decrypt:
        if (!cancelled) {
          setDecrypted({ title, content });
          setDraftTitle(title);
          setDraftContent(content);
          setDraftOccurredAt(
            new Date(row.occurredAt).toISOString().slice(0, 16),
          );
        }
      } catch {
        if (!cancelled) setDecrypted({ title: "", content: "", failed: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [row, isSet, passphrase]);

  const occurredAt = useMemo(
    () => (row ? new Date(row.occurredAt) : null),
    [row],
  );
  const createdAt = useMemo(
    () => (row ? new Date(row.createdAt) : null),
    [row],
  );
  const updatedAt = useMemo(
    () => (row ? new Date(row.updatedAt) : null),
    [row],
  );

  if (q.isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="rounded-xl border border-slate-200 p-6">
        <div className="text-lg font-semibold">Couldn’t load interaction</div>
        <div className="mt-2 text-sm text-red-600">{q.error.message}</div>
        <div className="mt-4">
          <Link to="/" className="underline">
            Back to log
          </Link>
        </div>
      </div>
    );
  }

  if (!row) return null;

  const title =
    isSet && decrypted && !decrypted.failed
      ? decrypted.title
      : isSet
        ? "Decrypting…"
        : "Locked";

  const content =
    isSet && decrypted && !decrypted.failed
      ? decrypted.content
      : isSet
        ? ""
        : "Unlock to view content.";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-700 hover:underline">
          ← Back
        </Link>

        <div className="font-mono text-xs text-slate-400">id {row.id}</div>
        <button
          type="button"
          className="bg-slate-100 px-2  rounded mt-1 text-[10px] text-slate-400 hover:underline"
          onClick={() => navigator.clipboard.writeText(row.id)}
        >
          copy id
        </button>
      </div>
      <div className="flex items-center gap-2">
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            disabled={!isSet}
            title={!isSet ? "Unlock to edit" : "Edit"}
          >
            Edit
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={update.isPending}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {update.isPending ? "Saving…" : "Save"}
            </button>
          </>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {isEditing ? (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Occurred at</label>
                <input
                  type="datetime-local"
                  value={draftOccurredAt}
                  onChange={(e) => setDraftOccurredAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={10}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring"
                />
              </div>

              {update.isError && (
                <div className="text-sm text-red-600">
                  {update.error.message}
                </div>
              )}
            </div>
          ) : (
            // your existing read-only render:
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Occurred</div>
              <div className="font-mono text-sm text-slate-800">
                {occurredAt ? fmt(occurredAt) : ""}
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {title || <span className="text-slate-500">(no title)</span>}
              </div>
              {decrypted?.failed && isSet && (
                <div className="mt-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">
                  Decrypt failed — wrong passphrase?
                </div>
              )}
              <div className="mt-4 whitespace-pre-wrap text-sm text-slate-800">
                {content ? (
                  content
                ) : (
                  <span className="text-slate-500">(no content)</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="mt-5">
            <div className="text-xs font-medium text-slate-500">Tags</div>
            {row.tags.length === 0 ? (
              <div className="mt-1 text-sm text-slate-500">(none)</div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {row.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                  >
                    {t}
                  </span>
                ))}
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div className="mt-6 rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">
                          Sequence
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowLinkPrev((v) => !v)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          {showLinkPrev ? "Close" : "Link to previous…"}
                        </button>
                      </div>

                      {showLinkPrev && (
                        <div className="mt-3">
                          <div className="text-xs text-slate-600">
                            Pick the interaction that should come immediately
                            before this one. Creates a{" "}
                            <span className="font-mono">next</span> link
                            (previous → current).
                          </div>

                          {recentQ.isLoading ? (
                            <div className="mt-2 text-sm text-slate-600">
                              Loading recent…
                            </div>
                          ) : recentQ.isError ? (
                            <div className="mt-2 text-sm text-red-600">
                              {recentQ.error.message}
                            </div>
                          ) : (
                            <ul className="mt-3 space-y-2">
                              {recentQ.data?.items
                                ?.filter((x) => x.id !== id) // don’t show current
                                .map((x) => {
                                  const occurred = new Date(x.occurredAt);
                                  return (
                                    <li
                                      key={x.id}
                                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-mono text-xs text-slate-700">
                                          {fmt(occurred)}
                                        </div>
                                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                                          {x.id}
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!id) return;
                                          await createNext.mutateAsync({
                                            previousId: x.id,
                                            currentId: id,
                                          });
                                          setShowLinkPrev(false);
                                        }}
                                        disabled={createNext.isPending}
                                        className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                                      >
                                        {createNext.isPending
                                          ? "Linking…"
                                          : "Set previous"}
                                      </button>
                                    </li>
                                  );
                                })}
                            </ul>
                          )}

                          {createNext.isError && (
                            <div className="mt-2 text-sm text-red-600">
                              {createNext.error.message}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-6 rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-900">
                          Thread
                        </div>
                        <div className="text-xs text-slate-500">
                          {threadQ.data
                            ? `${threadQ.data.items.length} node(s)`
                            : ""}
                        </div>
                      </div>

                      {!isSet && (
                        <div className="mt-2 text-sm text-slate-600">
                          Unlock in the Vault bar to decrypt thread titles.
                        </div>
                      )}

                      {threadQ.isLoading ? (
                        <div className="mt-3 text-sm text-slate-600">
                          Loading thread…
                        </div>
                      ) : threadQ.isError ? (
                        <div className="mt-3 text-sm text-red-600">
                          {threadQ.error.message}
                        </div>
                      ) : threadQ.data && threadQ.data.items.length > 0 ? (
                        <ol className="mt-3 space-y-2">
                          {threadQ.data.items.map((it, idx) => {
                            const isCurrent = it.id === id;
                            const occurred = new Date(it.occurredAt);

                            const dec = threadTitleCache.current.get(it.id);
                            const title =
                              isSet && dec && !dec.failed
                                ? dec.title
                                : isSet
                                  ? "Decrypting…"
                                  : "Locked";

                            return (
                              <li
                                key={it.id}
                                className={[
                                  "flex items-start justify-between gap-3 rounded-lg border px-3 py-2",
                                  isCurrent
                                    ? "border-slate-900 bg-slate-50"
                                    : "border-slate-200 hover:bg-slate-50",
                                ].join(" ")}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                                      {idx + 1}
                                    </span>
                                    <span className="font-mono text-xs text-slate-500">
                                      {occurred.toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="mt-1 truncate text-sm font-medium text-slate-900">
                                    {title || (
                                      <span className="text-slate-500">
                                        (no title)
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-1 font-mono text-[11px] text-slate-400">
                                    {it.id}
                                  </div>
                                </div>

                                {!isCurrent && (
                                  <Link
                                    to={`/interactions/${it.id}`}
                                    className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                                  >
                                    Open
                                  </Link>
                                )}

                                {isCurrent && (
                                  <span className="shrink-0 rounded-full bg-slate-900 px-2 py-1 text-[11px] text-white">
                                    current
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      ) : (
                        <div className="mt-3 text-sm text-slate-600">
                          (no thread)
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                      Links
                    </div>
                    {linksQ.isFetching && (
                      <div className="text-[11px] text-slate-400">
                        Refreshing…
                      </div>
                    )}
                  </div>

                  {/* Add link */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      value={toId}
                      onChange={(e) => setToId(e.target.value)}
                      placeholder="Paste target interaction id…"
                      className="w-80 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring"
                    />
                    <input
                      value={relationType}
                      onChange={(e) => setRelationType(e.target.value)}
                      placeholder="relation (e.g. next, caused_by)"
                      className="w-52 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring"
                    />
                    <button
                      type="button"
                      onClick={onAddLink}
                      disabled={!toId.trim() || createLink.isPending}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {createLink.isPending ? "Linking…" : "Add link"}
                    </button>
                  </div>

                  {createLink.isError && (
                    <div className="mt-2 text-sm text-red-600">
                      {createLink.error.message}
                    </div>
                  )}

                  {/* List links */}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="text-xs font-semibold text-slate-700">
                        Outgoing
                      </div>
                      {linksQ.data?.outgoing?.length ? (
                        <ul className="mt-2 space-y-2">
                          {linksQ.data.outgoing.map((l) => (
                            <li
                              key={l.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs text-slate-500">
                                  {l.relationType}
                                </div>
                                <Link
                                  to={`/interactions/${l.toId}`}
                                  className="truncate font-mono text-xs text-slate-800 hover:underline"
                                >
                                  {l.toId}
                                </Link>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteLink.mutate({ id: l.id })}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                title="Remove link"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-2 text-sm text-slate-500">
                          (none)
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="text-xs font-semibold text-slate-700">
                        Incoming
                      </div>
                      {linksQ.data?.incoming?.length ? (
                        <ul className="mt-2 space-y-2">
                          {linksQ.data.incoming.map((l) => (
                            <li
                              key={l.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs text-slate-500">
                                  {l.relationType}
                                </div>
                                <Link
                                  to={`/interactions/${l.fromId}`}
                                  className="truncate font-mono text-xs text-slate-800 hover:underline"
                                >
                                  {l.fromId}
                                </Link>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteLink.mutate({ id: l.id })}
                                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                title="Remove link"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-2 text-sm text-slate-500">
                          (none)
                        </div>
                      )}
                    </div>
                  </div>

                  {deleteLink.isError && (
                    <div className="mt-2 text-sm text-red-600">
                      {deleteLink.error.message}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isSet && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Set your passphrase in the Vault bar to decrypt this interaction.
        </div>
      )}
    </div>
  );
}
