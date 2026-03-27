sequenceDiagram
    participant U as User
    participant C as Client (Browser)
    participant E as Encryption (WebCrypto)
    participant A as API (tRPC/Express)
    participant D as Database (Postgres)

    U->>C: Type note (plaintext)

    C->>E: deriveKey(passphrase)
    E-->>C: symmetric key

    C->>E: encrypt(title, content)
    E-->>C: ciphertext + iv

    Note over C,E: 🔐 Plaintext exists ONLY here

    C->>A: POST /interactions {ciphertext, iv}

    Note over C,A: ⚠️ TRUST BOUNDARY (plaintext must never cross)

    A->>A: validate (Zod)

    A->>D: insert(ciphertext, iv)
    D-->>A: success

    A-->>C: 200 OK
