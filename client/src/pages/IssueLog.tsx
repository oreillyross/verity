import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";

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

  const { data: issues, isLoading, isError, error } = trpc.issues.list.useQuery({ status });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-lg font-semibold">Issues</div>

          {/* Status toggle */}
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

      {/* List */}
      <div className="rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-600">Loading…</div>
        ) : isError ? (
          <div className="p-6 text-sm text-red-600">{error.message}</div>
        ) : issues?.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No {status === "all" ? "" : status + " "}issues.</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {issues?.map((issue) => (
              <li key={issue.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link
                    to={`/issues/${issue.id}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    {issue.title}
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}