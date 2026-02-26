// client/src/crypto/vault.ts
const te = new TextEncoder();
const td = new TextDecoder();

export type VaultKeyMaterial = {
  saltB64: string; // persist this (localStorage) so same passphrase derives same key
  iterations: number;
  version: number;
};

export function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(len: number): Uint8Array {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return b;
}

export function createNewVaultMaterial(): VaultKeyMaterial {
  return {
    saltB64: b64encode(randomBytes(16)),
    iterations: 310_000,
    version: 1,
  };
}

export async function deriveAesKey(
  passphrase: string,
  material: VaultKeyMaterial,
): Promise<CryptoKey> {
  const salt = new Uint8Array(b64decode(material.saltB64));

  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: material.iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJson(key: CryptoKey, data: unknown, aad?: string) {
  const iv = new Uint8Array(randomBytes(12));
  const plaintext = te.encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aad ? te.encode(aad) : undefined,
    },
    key,
    plaintext,
  );

  return {
    ivB64: b64encode(iv),
    ciphertextB64: b64encode(new Uint8Array(ciphertext)),
  };
}

export async function decryptJson<T>(
  key: CryptoKey,
  ivB64: string,
  ciphertextB64: string,
  aad?: string,
): Promise<T> {
  const iv = new Uint8Array(b64decode(ivB64));
  const ciphertext = new Uint8Array(b64decode(ciphertextB64));

  const plaintextBuf = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: aad ? te.encode(aad) : undefined,
    },
    key,
    ciphertext,
  );

  const json = td.decode(new Uint8Array(plaintextBuf));
  return JSON.parse(json) as T;
}
