import { useMemo, useState } from "react";
import { trpc } from "../trpc";
import { encryptStringV1 } from "../crypto/verityCrypto";
import { usePassphrase } from "../state/passphrase";

function normalizeTagInput(raw: string): string[] {
  return Array.from(
    new Set(raw.split(",").map((s) => s.trim()).filter(Boolean)),
  );
}

export function AddInteractionForm({
  issueId,
  onSuccess,
}: {
  issueId: string;
  onSuccess: () => void;
}) {
  const { passphrase, isSet } = usePassphrase();

  const [occurredAt, setOccurredAt] = useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  const tags = useMemo(() => normalizeTagInput(tagsRaw), [tagsRaw]);

  const create = trpc.interaction.create.useMutation();
  const assignToIssue = trpc.interaction.assignToIssue.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isSet || !passphrase) {
      alert("Unlock your vault to add an interaction.");
      return;
    }
    if (!title.trim() && !content.trim()) {
      alert("Add at least a title or content.");
      return;
    }

    const [titleCiphertext, contentCiphertext] = await Promise.all([
      encryptStringV1({ plaintext: title, passphrase }),
      encryptStringV1({ plaintext: content, passphrase }),
    ]);

    const result = await create.mutateAsync({
      titleCiphertext,
      contentCiphertext,
      occurredAt: new Date(occurredAt).toISOString(),
      tags,
    });

    await assignToIssue.mutateAsync({
      interactionId: result.interactionId,
      issueId,
    });

    onSuccess();
  }

  const isPending = create.isPending || assignToIssue.isPending;
  const error = create.error ?? assignToIssue.error;

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Occurred at</label>
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write what happened…"
          rows={5}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tags</label>
        <input
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="comma, separated, tags"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !isSet}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save interaction"}
        </button>
        {error && <span className="text-sm text-red-600">{error.message}</span>}
      </div>
    </form>
  );
}
