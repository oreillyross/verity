import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import { decryptStringV1 } from "../crypto/verityCrypto";
import { usePassphrase } from "../state/passphrase";

type StatusFilter = "all" | "open" | "closed";

function fmt(dt: Date) {
  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function IssueLog() {
  const [status, setStatus] = useState<StatusFilter>("open");
  const { passphrase, isSet } = usePassphrase();
  const [_, setTick] = useState(0);
  const decryptedCache = useRef(
    new Map<string, { title: string; failed?: boolean }>(),
  );

  const {
    data: issues,
    isLoading,
    isError,
    error,
  } = trpc.issues.list.useQuery({ status });

  useEffect(() => {
    decryptedCache.current.clear();
    setTick((t) => t + 1);
  }, [passphrase, isSet]);

  useEffect(() => {
    if (!issues || !isSet || !passphrase) return;
    let cancelled = false;

    (async () => {
      for (const issue of issues) {
        if (cancelled) return;
        if (decryptedCache.current.has(issue.id)) continue;
        try {
          const title = await decryptStringV1({
            envelopeB64u: issue.titleCiphertext,
            passphrase,
          });
          decryptedCache.current.set(issue.id, { title });
        } catch {
          decryptedCache.current.set(issue.id, { title: "", failed: true });
        }
        if (!cancelled) setTick((t) => t + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [issues, isSet, passphrase]);

  const visibleIssues = isSet
  ? (issues ?? []).filter((issue) => {
      const dec = decryptedCache.current.get(issue.id);
      return !dec || !dec.failed;
    })
  : [];


  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-lg font-semibold">Issues</div>
          <div className="flex rounded-lg border border-slate-200 text-sm">
            {(["open", "closed", "all"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={[
                  "px-3 py-1 capitalize first:rounded-l-lg last:rounded-r-lg",
                  status === s
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-600">Loading…</div>
        ) : isError ? (
          <div className="p-6 text-sm text-red-600">{error.message}</div>
        ) : visibleIssues?.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">
            No {status === "all" ? "" : status + " "}issues.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {visibleIssues?.map((issue) => {
              const dec = decryptedCache.current.get(issue.id);
              const title =
                isSet && dec && !dec.failed
                  ? dec.title
                  : isSet
                    ? "Decrypting…"
                    : "Locked";

              return (
                <li
                  key={issue.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/issues/${issue.id}`}
                      className="text-sm font-medium text-slate-900 hover:underline"
                    >
                      {title || (
                        <span className="text-slate-400">(no title)</span>
                      )}
                    </Link>
                    <div className="mt-0.5 font-mono text-xs text-slate-400">
                      opened {fmt(new Date(issue.createdAt))}
                      {issue.resolvedAt && (
                        <> · resolved {fmt(new Date(issue.resolvedAt))}</>
                      )}
                    </div>
                  </div>
                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      issue.status === "open"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {issue.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
