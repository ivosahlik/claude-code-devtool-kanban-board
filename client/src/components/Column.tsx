import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Card as CardType, Column as ColumnType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "./Card";
import { CardDialog } from "./CardDialog";
import { ColumnDialog } from "./ColumnDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { cn } from "@/lib/utils";

type Props = {
  column: ColumnType;
  cards: CardType[];
  onCreateCard: (columnId: string, title: string, description: string) => Promise<void>;
  onUpdateCard: (
    id: string,
    patch: Partial<Pick<CardType, "title" | "description" | "columnId" | "order">>,
  ) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
  onRenameColumn: (id: string, title: string) => Promise<void>;
  onDeleteColumn: (id: string) => Promise<void>;
};

export function Column({
  column,
  cards,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onRenameColumn,
  onDeleteColumn,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [createError, setCreateError] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Set on Escape so focus returns to "Add card" instead of the page body.
  const refocusAddButtonRef = useRef(false);
  const addingRef = useRef(false);
  // Titles waiting to be created, sent one at a time in the order they were entered.
  const queueRef = useRef<string[]>([]);
  const sendingRef = useRef(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `col-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  const sorted = [...cards].sort((a, b) => a.order - b.order);

  const deleteDescription =
    cards.length === 0
      ? `"${column.title}" will be permanently deleted. It has no cards.`
      : `"${column.title}" and its ${cards.length} ${cards.length === 1 ? "card" : "cards"} will be permanently deleted.`;

  useEffect(() => {
    if (!adding && refocusAddButtonRef.current) {
      refocusAddButtonRef.current = false;
      addButtonRef.current?.focus();
    }
  }, [adding]);

  const openAdd = () => {
    addingRef.current = true;
    setAdding(true);
  };

  const closeAdd = () => {
    addingRef.current = false;
    setAdding(false);
    setDraft("");
    setCreateError(false);
  };

  const sendQueue = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    while (queueRef.current.length > 0) {
      const title = queueRef.current.shift()!;
      try {
        await onCreateCard(column.id, title, "");
      } catch {
        queueRef.current = [];
        if (addingRef.current) {
          setDraft(title);
          setCreateError(true);
          inputRef.current?.focus();
        }
      }
    }
    sendingRef.current = false;
  };

  const handleAddKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      refocusAddButtonRef.current = true;
      closeAdd();
      return;
    }
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    setCreateError(false);
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    queueRef.current.push(title);
    void sendQueue();
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full max-h-full w-[calc(100vw-3rem)] snap-start snap-always sm:w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-muted/40 p-3 transition-colors",
        isOver && "bg-muted ring-2 ring-ring",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 pb-3">
        <h2 className="font-semibold text-sm tracking-tight truncate">
          {column.title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {sorted.length}
          </span>
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setRenameOpen(true)}
            aria-label="Rename column"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive-text hover:text-destructive-text"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete column"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {sorted.map((card) => (
          <Card key={card.id} card={card} onClick={() => setEditingCard(card)} />
        ))}
      </div>

      {adding ? (
        <div className="mt-2 shrink-0">
          <Input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setCreateError(false);
            }}
            onKeyDown={handleAddKeyDown}
            onBlur={closeAdd}
            aria-label="Card title"
            placeholder="Card title, press Enter to add"
            className="bg-background"
          />
          {createError && (
            <p role="alert" className="mt-1 text-xs text-destructive-text">
              Could not add card
            </p>
          )}
        </div>
      ) : (
        <Button
          ref={addButtonRef}
          variant="ghost"
          size="sm"
          className="mt-2 shrink-0 justify-start text-muted-foreground hover:text-foreground"
          onClick={openAdd}
        >
          <Plus className="h-4 w-4" />
          Add card
        </Button>
      )}

      <CardDialog
        open={editingCard !== null}
        onOpenChange={(open) => !open && setEditingCard(null)}
        mode="edit"
        initialTitle={editingCard?.title ?? ""}
        initialDescription={editingCard?.description ?? ""}
        onSubmit={async (title, description) => {
          if (!editingCard) return;
          await onUpdateCard(editingCard.id, { title, description });
        }}
        onDelete={async () => {
          if (!editingCard) return;
          await onDeleteCard(editingCard.id);
        }}
      />

      <ColumnDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        mode="edit"
        initialTitle={column.title}
        onSubmit={(title) => onRenameColumn(column.id, title)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete column?"
        description={deleteDescription}
        onConfirm={() => onDeleteColumn(column.id)}
      />
    </div>
  );
}
