import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ArrowLeft, Plus } from "lucide-react";
import { useBoard } from "@/hooks/useBoard";
import { api, type Project } from "@/lib/api";
import { navigate } from "@/hooks/useHashRoute";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { Column } from "./Column";
import { ColumnDialog } from "./ColumnDialog";

type Props = {
  projectId: string;
};

export function Board({ projectId }: Props) {
  const {
    board,
    loading,
    error,
    notFound,
    createColumn,
    renameColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    moveCardOptimistic,
  } = useBoard(projectId);
  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .listProjects()
      .then((list) => {
        if (cancelled) return;
        setProject(list.find((p) => p.id === projectId) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Ignore a name left over from the previous projectId until the lookup for
  // the current one resolves.
  const projectName = project?.id === projectId ? project.name : null;

  useDocumentTitle(
    notFound
      ? "Project not found · Kanban"
      : !loading && !error && projectName
        ? `${projectName} · Kanban`
        : "Kanban",
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !board) return;
    const overData = over.data.current as { type: string; columnId?: string } | undefined;
    if (overData?.type !== "column" || !overData.columnId) return;

    const card = board.cards.find((c) => c.id === active.id);
    if (!card || card.columnId === overData.columnId) return;

    void moveCardOptimistic(card.id, overData.columnId);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading board…
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">
            Project not found
          </h1>
          <p className="text-sm text-muted-foreground">
            It may have been deleted, or the link is wrong.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Button>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-destructive-text">
        <div>{error}</div>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Button>
      </div>
    );
  }
  if (!board) return null;

  const columns = [...board.columns].sort((a, b) => a.order - b.order);

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => navigate("/")}
            aria-label="Back to projects"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">
            {projectName ?? "Kanban Board"}
          </h1>
        </div>
        <Button
          size="sm"
          className="shrink-0 px-2 sm:px-3"
          onClick={() => setNewColumnOpen(true)}
          aria-label="Add column"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add column</span>
        </Button>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 sm:p-6 snap-x snap-mandatory scroll-px-4 sm:snap-none sm:scroll-px-0">
          <div className="flex h-full gap-3 sm:gap-4 items-stretch">
            {columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                cards={board.cards.filter((c) => c.columnId === col.id)}
                onCreateCard={createCard}
                onUpdateCard={updateCard}
                onDeleteCard={deleteCard}
                onRenameColumn={renameColumn}
                onDeleteColumn={deleteColumn}
              />
            ))}
            {columns.length === 0 && (
              <div className="text-sm text-muted-foreground">
                <span className="sm:hidden">
                  No columns yet. Tap + above to add a column.
                </span>
                <span className="hidden sm:inline">
                  No columns yet. Click "Add column" to get started.
                </span>
              </div>
            )}
          </div>
        </div>
      </DndContext>

      <ColumnDialog
        open={newColumnOpen}
        onOpenChange={setNewColumnOpen}
        mode="create"
        onSubmit={createColumn}
      />
    </div>
  );
}
