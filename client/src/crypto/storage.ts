import { createNewVaultMaterial, type VaultKeyMaterial } from "./vault";

const KEY = "verity:vaultMaterial:v1";

export function loadVaultMaterial(): VaultKeyMaterial {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const m = createNewVaultMaterial();
    localStorage.setItem(KEY, JSON.stringify(m));
    return m;
  }
  return JSON.parse(raw) as VaultKeyMaterial;
}

export function resetVaultMaterial() {
  localStorage.removeItem(KEY);
}