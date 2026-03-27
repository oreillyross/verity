import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {PassphraseProvider} from "./state/passphrase"

import { httpBatchLink } from "@trpc/client";
import { trpc } from "./trpc";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/trpc",
    }),
  ],
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <PassphraseProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        </PassphraseProvider>
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>,
);
