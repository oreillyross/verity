import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { trpc } from "../trpc";
import { decryptStringV1 } from "../crypto/verityCrypto";
import { usePassphrase } from "../state/passphrase";
import { AddInteractionForm } from "../components/AddInteractionForm";

export default function IssueDetail() {
  const { id } = useParams();
  const { passphrase, isSet } = usePassphrase();

  const q = trpc.issues.get.useQuery({ id: id ?? "" }, { enabled: !!id });

  const [decrypted, setDecrypted] = useState<{
    title: string;
    failed?: boolean;
  } | null>(null);
  const [decryptedInteractions, setDecryptedInteractions] = useState<Map<string, string>>(new Map());
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setDecrypted(null);
    if (!q.data || !isSet || !passphrase) return;
    let cancelled = false;

    (async () => {
      try {
        const title = await decryptStringV1({
          envelopeB64u: q.data.titleCiphertext,
          passphrase,
        });
        if (!cancelled) setDecrypted({ title });
      } catch {
        if (!cancelled) setDecrypted({ title: "", failed: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q.data, isSet, passphrase]);

  useEffect(() => {
    setDecryptedInteractions(new Map());
    if (!q.data?.interactions || !isSet || !passphrase) return;
    let cancelled = false;

    (async () => {
      const map = new Map<string, string>();
      for (const interaction of q.data.interactions) {
        if (cancelled) return;
        try {
          const t = await decryptStringV1({ envelopeB64u: interaction.titleCiphertext, passphrase });
          map.set(interaction.id, t);
        } catch {
          map.set(interaction.id, "[decrypt failed]");
        }
      }
      if (!cancelled) setDecryptedInteractions(new Map(map));
    })();

    return () => { cancelled = true; };
  }, [q.data?.interactions, isSet, passphrase]);

  if (q.isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="rounded-xl border border-slate-200 p-6">
        <div className="text-lg font-semibold">Couldn't load issue</div>
        <div className="mt-2 text-sm text-red-600">{q.error?.message}</div>
        <div className="mt-4">
          <Link to="/" className="underline">
            Back to log
          </Link>
        </div>
      </div>
    );
  }

  const issue = q.data;
  const title =
    isSet && decrypted && !decrypted.failed
      ? decrypted.title
      : isSet
        ? "Decrypting…"
        : "Locked";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/issues" className="text-sm text-slate-700 hover:underline">
          ← Issues
        </Link>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-xs font-medium",
            issue.status === "open"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {issue.status}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <div className="text-xl font-semibold text-slate-900">
          {title || <span className="text-slate-400">(no title)</span>}
        </div>
        {decrypted?.failed && isSet && (
          <div className="mt-1 text-xs text-red-600">
            Decrypt failed — wrong passphrase?
          </div>
        )}
        <div className="mt-1 text-xs text-slate-400">
          {new Date(issue.createdAt).toLocaleString()}
        </div>
        <div className="mt-0.5 font-mono text-xs text-slate-400">
          id {issue.id}
        </div>

        {issue.interactions.length > 0 && (
          <div className="mt-6">
            <div className="text-xs font-medium text-slate-500">
              Linked interactions
            </div>
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {issue.interactions.map((interaction) => (
                <li
                  key={interaction.id}
                  className="flex items-center justify-between p-3"
                >
                  <span className="text-xs text-slate-400 shrink-0 mr-3">
                    {new Date(interaction.createdAt).toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-700 flex-1">
                    {decryptedInteractions.get(interaction.id) ?? "Decrypting…"}
                  </span>
                  <Link
                    to={`/interactions/${interaction.id}`}
                    className="text-xs text-slate-700 hover:underline"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Add interaction */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            disabled={!isSet}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            title={!isSet ? "Unlock vault to add interaction" : undefined}
          >
            {showAddForm ? "Cancel" : "+ Add interaction"}
          </button>

          {showAddForm && (
            <AddInteractionForm
              issueId={issue.id}
              onSuccess={() => {
                setShowAddForm(false);
                q.refetch();
              }}
            />
          )}
        </div>
      </div>

      {!isSet && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Set your passphrase in the Vault bar to decrypt this issue.
        </div>
      )}
    </div>
  );
}
