// client/src/crypto/verityCrypto.ts
// Web Crypto AES-GCM + PBKDF2 passphrase key derivation.
// All data is base64url encoded for storage.

export type CipherEnvelopeV1 = {
  v: 1;
  kdf: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
    salt_b64u: string;
  };
  alg: {
    name: "AES-GCM";
    iv_b64u: string;
  };
  ct_b64u: string; // ciphertext bytes (includes GCM auth tag)
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToB64u(bytes: Uint8Array): string {
  // base64
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  // base64url
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64uToBytes(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64u.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(len: number): Uint8Array {
  const out = new Uint8Array(len);
  crypto.getRandomValues(out);
  return out;
}

async function deriveAesKeyFromPassphrase(opts: {
  passphrase: string;
  salt: Uint8Array;
  iterations: number;
}): Promise<CryptoKey> {
  const passphraseBytes = textEncoder.encode(opts.passphrase);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passphraseBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(opts.salt),
      iterations: opts.iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptStringV1(params: {
  plaintext: string;
  passphrase: string;
  iterations?: number; // default set below
}): Promise<string> {
  const iterations = params.iterations ?? 210_000; // reasonable 2026-ish baseline
  const salt = new Uint8Array(randomBytes(16));
  const iv = new Uint8Array(randomBytes(12)); // AES-GCM standard 96-bit nonce

  const key = await deriveAesKeyFromPassphrase({
    passphrase: params.passphrase,
    salt,
    iterations,
  });

  const plaintextBytes = textEncoder.encode(params.plaintext);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintextBytes,
  );

  const envelope: CipherEnvelopeV1 = {
    v: 1,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations,
      salt_b64u: bytesToB64u(salt),
    },
    alg: {
      name: "AES-GCM",
      iv_b64u: bytesToB64u(iv),
    },
    ct_b64u: bytesToB64u(new Uint8Array(ciphertextBuf)),
  };

  // Store as base64url(JSON)
  const json = JSON.stringify(envelope);
  const jsonBytes = textEncoder.encode(json);
  return bytesToB64u(jsonBytes);
}

export async function decryptStringV1(params: {
  envelopeB64u: string;
  passphrase: string;
}): Promise<string> {
  const jsonBytes = b64uToBytes(params.envelopeB64u);
  const json = textDecoder.decode(jsonBytes);

  let env: CipherEnvelopeV1;
  try {
    env = JSON.parse(json) as CipherEnvelopeV1;
  } catch {
    throw new Error("Invalid ciphertext envelope: not valid JSON");
  }

  if (env.v !== 1) throw new Error(`Unsupported envelope version: ${String((env as any).v)}`);
  if (env.kdf?.name !== "PBKDF2" || env.kdf?.hash !== "SHA-256") {
    throw new Error("Unsupported KDF params");
  }
  if (env.alg?.name !== "AES-GCM") throw new Error("Unsupported algorithm");

  const salt = b64uToBytes(env.kdf.salt_b64u);
  const iv = new Uint8Array(b64uToBytes(env.alg.iv_b64u));
  const ct = new Uint8Array(b64uToBytes(env.ct_b64u));

  const key = await deriveAesKeyFromPassphrase({
    passphrase: params.passphrase,
    salt,
    iterations: env.kdf.iterations,
  });

  let plaintextBuf: ArrayBuffer;
  try {
    plaintextBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ct,
    );
  } catch {
    // Wrong passphrase or tampered data will fail auth.
    throw new Error("Decrypt failed (wrong passphrase or corrupted data)");
  }

  return textDecoder.decode(new Uint8Array(plaintextBuf));
}