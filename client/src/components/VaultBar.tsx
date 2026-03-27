import { useMemo, useState } from "react";
import { usePassphrase } from "../state/passphrase";

function mask(len: number) {
  // show at least 8 dots so short passphrases still look “hidden”
  const n = Math.max(8, Math.min(24, len));
  return "•".repeat(n);
}

export default function VaultBar() {
  const { passphrase, isSet, setPassphrase, clearPassphrase } = usePassphrase();

  const [isRevealed, setIsRevealed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const display = useMemo(() => {
    if (!isSet || !passphrase) return "";
    return isRevealed ? passphrase : mask(passphrase.length);
  }, [isSet, passphrase, isRevealed]);

  function startSet() {
    setDraft("");
    setIsEditing(true);
    setIsRevealed(false);
  }

  function save() {
    const p = draft.trim();
    if (!p) return;
    setPassphrase(p);
    setIsEditing(false);
    setIsRevealed(false);
  }

  function lock() {
    clearPassphrase();
    setIsEditing(false);
    setIsRevealed(false);
    setDraft("");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            {/* simple “key” glyph without deps */}
            <span className="text-sm">🔑</span>
          </div>

          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-900">Vault</div>

            {!isSet && !isEditing && (
              <div className="text-xs text-slate-600">
                Passphrase not set (kept only in memory)
              </div>
            )}

            {isSet && !isEditing && (
              <div className="truncate font-mono text-xs text-slate-700">
                {display}
              </div>
            )}

            {isEditing && (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="password"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Enter passphrase…"
                  className="w-64 max-w-[60vw] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={save}
                  disabled={!draft.trim()}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Set
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isSet && !isEditing && (
            <button
              type="button"
              onClick={startSet}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Set passphrase
            </button>
          )}

          {isSet && !isEditing && (
            <>
              <button
                type="button"
                onClick={() => setIsRevealed((v) => !v)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                aria-label={isRevealed ? "Hide passphrase" : "Reveal passphrase"}
                title={isRevealed ? "Hide" : "Reveal"}
              >
                {isRevealed ? "🙈" : "👁️"}
              </button>

              <button
                type="button"
                onClick={lock}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                aria-label="Lock (clear passphrase from memory)"
                title="Lock"
              >
                🔒
              </button>

              <button
                type="button"
                onClick={startSet}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                aria-label="Change passphrase"
                title="Change"
              >
                Change
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}