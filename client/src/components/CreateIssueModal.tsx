import { useState } from "react";
import { trpc } from "../trpc";
import {data, useNavigate} from "react-router-dom"

export function CreateIssueModal({
  interactionId,
}: {
  interactionId: string;
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const createIssue = trpc.interaction.createFromInteraction.useMutation({
    onSuccess: (data) => {
      utils.interaction.invalidate();
      setOpen(false);
      setTitle("");
      setSelectedIssueId(null);
      navigate(`/issues/${data.id}`)
    },
  });

  const linkIssue = trpc.interaction.linkInteraction.useMutation({
    onSuccess: () => {
      utils.interaction.invalidate();
      setOpen(false);
      setTitle("");
      navigate(`/issues/${selectedIssueId}`)
    },
  });

  const { data: results, isFetching } = trpc.issues.search.useQuery(
    { query: title },
    {
      enabled: title.length >= 3,
    },
  );

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="mt-4 px-3 py-1 text-sm bg-yellow-500 text-black rounded hover:bg-yellow-400"
      >
        Create Issue
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-4 rounded w-full max-w-sm border border-zinc-700">
            <h2 className="text-sm text-zinc-400 mb-2">Create or Link Issue</h2>

            {/* Input */}
            <input
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSelectedIssueId(null);
              }}
              placeholder="Start typing issue..."
              className="w-full px-2 py-1 text-sm text-white bg-black border border-zinc-700 rounded mb-2 outline-none"
            />

            {/* Results */}
            {title.length >= 3 && (
              <div className="mb-3 max-h-40 overflow-y-auto border border-zinc-700 rounded">
                {isFetching && (
                  <div className="text-xs text-zinc-500 p-2">Searching...</div>
                )}

                {results?.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => {
                      setSelectedIssueId(issue.id);
                      setTitle(issue.title);
                    }}
                    className={`p-2 text-xs cursor-pointer hover:bg-zinc-800 ${
                      selectedIssueId === issue.id ? "bg-zinc-800" : ""
                    }`}
                  >
                    {issue.title}
                    <span className="ml-2 text-zinc-500">({issue.status})</span>
                  </div>
                ))}

                {results?.length === 0 && (
                  <div className="text-xs text-zinc-500 p-2">
                    No matches — create new
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>

              {selectedIssueId ? (
                <button
                  onClick={() =>
                    linkIssue.mutate({
                      interactionId,
                      issueId: selectedIssueId,
                    })
                  }
                  disabled={linkIssue.isPending}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-400"
                >
                  {linkIssue.isPending ? "Linking..." : "Link"}
                </button>
              ) : (
                <button
                  onClick={() =>
                    createIssue.mutate({
                      interactionId,
                      title: title || undefined,
                    })
                  }
                  disabled={createIssue.isPending}
                  className="px-3 py-1 text-xs bg-yellow-500 text-black rounded hover:bg-yellow-400"
                >
                  {createIssue.isPending ? "Creating..." : "Create"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
