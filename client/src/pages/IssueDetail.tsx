import { Link, useParams } from "react-router-dom";
import { trpc } from "../trpc";

export default function IssueDetail() {
  const { id } = useParams();

  const q = trpc.issues.get.useQuery({ id: id ?? "" }, { enabled: !!id });

  if (q.isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="rounded-xl border border-slate-200 p-6">
        <div className="text-lg font-semibold">Couldn't load issue</div>
        <div className="mt-2 text-sm text-red-600">{q.error?.message}</div>
        <div className="mt-4">
          <Link to="/" className="underline">
            Back to log
          </Link>
        </div>
      </div>
    );
  }

  const issue = q.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-700 hover:underline">
          ← Back
        </Link>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-xs font-medium",
            issue.status === "open"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {issue.status}
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 p-5">
        <div className="text-xl font-semibold text-slate-900">{issue.title}</div>
        <div className="mt-1 font-mono text-xs text-slate-400">id {issue.id}</div>

        {issue.interactions.length > 0 && (
          <div className="mt-6">
            <div className="text-xs font-medium text-slate-500">
              Linked interactions
            </div>
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {issue.interactions.map((interaction) => (
                <li key={interaction.id} className="flex items-center justify-between p-3">
                  <span className="font-mono text-xs text-slate-500">{interaction.id}</span>
                  <Link
                    to={`/interactions/${interaction.id}`}
                    className="text-xs text-slate-700 hover:underline"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
