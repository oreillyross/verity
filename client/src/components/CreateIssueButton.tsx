import { trpc } from "../trpc";

export function CreateIssueButton({ interactionId }: { interactionId: string }) {
  const createIssue = trpc.interaction.createFromInteraction.useMutation();

  return (
    <button
      onClick={() =>
        createIssue.mutate({ interactionId })
      }
      disabled={createIssue.isPending}
      className="mt-4 px-3 py-1 text-sm bg-yellow-500 text-black rounded hover:bg-yellow-400 disabled:opacity-50"
    >
      {createIssue.isPending ? "Creating..." : "Create Issue"}
    </button>
  );
}