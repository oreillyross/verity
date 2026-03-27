import { useMemo, useState } from "react";
import { trpc } from "../trpc";
import { encryptStringV1 } from "../crypto/verityCrypto";
import {usePassphrase} from "../state/passphrase"

function normalizeTagInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

export default function CreateInteraction() {
  const {passphrase, isSet} = usePassphrase()
  const [occurredAt, setOccurredAt] = useState(() => {
    // local datetime string for <input type="datetime-local">
    const d = new Date();
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  const tags = useMemo(() => normalizeTagInput(tagsRaw), [tagsRaw]);

  const create = trpc.interaction.create.useMutation();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isSet || !passphrase) {
      alert("Enter your passphrase (it stays only in memory).");
      return;
    }
    if (!title.trim() && !content.trim()) {
      alert("Add at least a title or content.");
      return;
    }

    const occurredAtIso = new Date(occurredAt).toISOString();

    const [titleCiphertext, contentCiphertext] = await Promise.all([
      encryptStringV1({ plaintext: title, passphrase }),
      encryptStringV1({ plaintext: content, passphrase }),
    ]);

    await create.mutateAsync({
      titleCiphertext,
      contentCiphertext,
      occurredAt: occurredAtIso,
      tags,
    });

    // Reset form (keep passphrase)
    setTitle("");
    setContent("");
    setTagsRaw("");
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create Interaction</h1>
        <p className="mt-1 text-sm text-slate-600">
          Title + content are encrypted in your browser before being stored.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Passphrase</label>
          
          <div className="text-xs text-slate-500">
            Keep this safe. If you forget it, encrypted text cannot be recovered.
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Occurred at</label>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write what happened…"
            rows={8}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="comma, separated, tags"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Save interaction"}
          </button>

          {create.isError && (
            <span className="text-sm text-red-600">
              {create.error.message}
            </span>
          )}
          {create.isSuccess && !create.isPending && (
            <span className="text-sm text-green-700">Saved.</span>
          )}
        </div>
      </form>
    </div>
  );
}