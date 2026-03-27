import React, { createContext, useContext, useMemo, useState } from "react";

type PassphraseState = {
  passphrase: string | null;
  isSet: boolean;
  setPassphrase: (p: string) => void;
  clearPassphrase: () => void;
};

const Ctx = createContext<PassphraseState | null>(null);

export function PassphraseProvider(props: { children: React.ReactNode }) {
  const [passphrase, setPassphraseInternal] = useState<string | null>(null);

  const value = useMemo<PassphraseState>(() => {
    return {
      passphrase,
      isSet: !!passphrase && passphrase.length > 0,
      setPassphrase: (p) => setPassphraseInternal(p),
      clearPassphrase: () => setPassphraseInternal(null),
    };
  }, [passphrase]);

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

export function usePassphrase() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePassphrase must be used within PassphraseProvider");
  return v;
}