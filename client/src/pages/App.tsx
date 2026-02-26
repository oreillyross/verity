import React, { useMemo, useState } from "react";
import { deriveAesKey } from "../crypto/vault";
import { loadVaultMaterial } from "../crypto/storage";

type VaultState =
  | { status: "locked" }
  | { status: "unlocking" }
  | { status: "unlocked"; key: CryptoKey };

export function App() {
  const [passphrase, setPassphrase] = useState("");
  const [vault, setVault] = useState<VaultState>({ status: "locked" });
  const [err, setErr] = useState<string | null>(null);

  const canUnlock = useMemo(() => passphrase.trim().length >= 8, [passphrase]);

  async function onUnlock() {
    setErr(null);
    setVault({ status: "unlocking" });
    try {
      const material = loadVaultMaterial();
      const key = await deriveAesKey(passphrase, material);
      setVault({ status: "unlocked", key });
    } catch (e) {
      setVault({ status: "locked" });
      setErr("AUTH FAILURE // KEY DERIVATION ERROR");
    }
  }

  if (vault.status !== "unlocked") {
    return (
      <div className="min-h-screen bg-black text-green-300 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl border border-green-500/40 rounded-lg p-6 shadow-[0_0_40px_rgba(34,197,94,0.15)] relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.0)_0%,rgba(0,0,0,0.35)_50%,rgba(0,0,0,0.0)_100%)] bg-[length:100%_6px]" />
          <div className="pointer-events-none absolute inset-0 opacity-10 bg-green-400 blur-3xl" />

          <div className="text-xs tracking-[0.3em] uppercase text-green-400/80">
            Strategic Command / Secure Terminal
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            VERITY // VAULT ACCESS
          </h1>

          <div className="mt-4 text-sm text-green-200/80 leading-relaxed">
            ZERO-TRUST MODE ACTIVE
            <br />
            Remote server stores ciphertext only. Decryption occurs locally.
          </div>

          <div className="mt-6 border border-green-500/30 rounded-md p-4 bg-black/60">
            <div className="text-xs tracking-[0.25em] uppercase text-green-400/80">
              AUTHORIZATION CODE
            </div>
            <input
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              type="password"
              autoFocus
              placeholder="Enter passphrase..."
              className="mt-2 w-full bg-black border border-green-500/40 rounded px-3 py-2 text-green-200 outline-none focus:border-green-400"
            />

            <div className="mt-3 flex items-center gap-3">
              <button
                disabled={!canUnlock || vault.status === "unlocking"}
                onClick={onUnlock}
                className="px-4 py-2 rounded border border-green-500/50 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-500/10"
              >
                {vault.status === "unlocking" ? "AUTHORIZING…" : "UNLOCK VAULT"}
              </button>
              <div className="text-xs text-green-300/70">
                Minimum 8 characters.
              </div>
            </div>

            {err ? <div className="mt-3 text-xs text-red-400">{err}</div> : null}
          </div>

          <div className="mt-6 text-xs text-green-300/70">
            <span className="text-green-300">CRITICAL:</span> Forget the passphrase = permanent loss.
          </div>

          <div className="mt-4 text-[10px] tracking-[0.25em] uppercase text-green-400/50">
            Threat Condition: ELEVATED // Do not disclose credentials
          </div>
        </div>
      </div>
    );
  }

  // Unlocked placeholder UI (next we add encrypted CRUD)
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <h2 className="text-xl font-semibold">Vault unlocked</h2>
      <p className="mt-2 text-zinc-300">
        Next: create an encrypted interaction and POST it to /api/interactions.
      </p>
    </div>
  );
}