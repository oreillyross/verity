import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../trpc";
import { encryptStringV1, decryptStringV1 } from "../crypto/verityCrypto";
import { usePassphrase } from "../state/passphrase";

export function CreateIssueModal({ interactionId }: { interactionId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const navigate = useNavigate();
  const { passphrase, isSet } = usePassphrase();
  const utils = trpc.useUtils();
  const decryptedCache = useRef(new Map<string, string>());

  const { data: openIssues } = trpc.issues.list.useQuery(
    { status: "open" },
    { enabled: open },
  );

  // Decrypt issue titles for the link list
  useEffect(() => {
    if (!openIssues || !isSet || !passphrase) return;
    let cancelled = false;

    (async () => {
      for (const issue of openIssues) {
        if (cancelled) return;
        if (decryptedCache.current.has(issue.id)) continue;
        try {
          const t = await decryptStringV1({ envelopeB64u: issue.titleCiphertext, passphrase });
          decryptedCache.current.set(issue.id, t);
        } catch {
          decryptedCache.current.set(issue.id, "[wrong passphrase]");
        }
        if (!cancelled) setTick((n) => n + 1);
      }
    })();

    return () => { cancelled = true; };
  }, [openIssues, isSet, passphrase]);

  // Client-side filter by typed text
  const filteredIssues = (openIssues ?? []).filter((issue) => {
    if (!title) return true;
    const dec = decryptedCache.current.get(issue.id) ?? "";
    return dec.toLowerCase().includes(title.toLowerCase());
  });

  async function handleCreate() {
    if (!isSet || !passphrase) return;
    const titleCiphertext = await encryptStringV1({
      plaintext: title.trim() || "Untitled Issue",
      passphrase,
    });
    createIssue.mutate({ interactionId, titleCiphertext });
  }

  const createIssue = trpc.interaction.createFromInteraction.useMutation({
    onSuccess: (data) => {
      utils.interaction.invalidate();
      setOpen(false);
      setTitle("");
      navigate(`/issues/${data.id}`);
    },
  });

  const linkIssue = trpc.interaction.linkInteraction.useMutation({
    onSuccess: () => {
      utils.interaction.invalidate();
      setOpen(false);
      setTitle("");
      navigate(`/issues/${selectedIssueId}`);
    },
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 px-3 py-1 text-sm bg-yellow-500 text-black rounded hover:bg-yellow-400"
      >
        Create Issue
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-4 rounded w-full max-w-sm border border-zinc-700">
            <h2 className="text-sm text-zinc-400 mb-2">Create or Link Issue</h2>

            {!isSet && (
              <div className="mb-2 text-xs text-amber-400">
                Unlock your vault to create or link issues.
              </div>
            )}

            <input
              autoFocus
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSelectedIssueId(null); }}
              placeholder="Issue title…"
              className="w-full px-2 py-1 text-sm bg-black border border-zinc-700 rounded mb-2 outline-none"
            />

            {filteredIssues.length > 0 && (
              <div className="mb-3 max-h-40 overflow-y-auto border border-zinc-700 rounded">
                {filteredIssues.map((issue) => {
                  const dec = decryptedCache.current.get(issue.id);
                  return (
                    <div
                      key={issue.id}
                      onClick={() => { setSelectedIssueId(issue.id); setTitle(dec ?? ""); }}
                      className={`p-2 text-xs cursor-pointer hover:bg-zinc-800 ${selectedIssueId === issue.id ? "bg-zinc-800" : ""}`}
                    >
                      {dec ?? "Decrypting…"}
                      <span className="ml-2 text-zinc-500">(open)</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>

              {selectedIssueId ? (
                <button
                  onClick={() => linkIssue.mutate({ interactionId, issueId: selectedIssueId })}
                  disabled={linkIssue.isPending}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-400"
                >
                  {linkIssue.isPending ? "Linking..." : "Link"}
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={createIssue.isPending || !isSet}
                  className="px-3 py-1 text-xs bg-yellow-500 text-black rounded hover:bg-yellow-400 disabled:opacity-50"
                >
                  {createIssue.isPending ? "Creating..." : "Create"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
