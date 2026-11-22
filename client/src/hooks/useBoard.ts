import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, errorMessage, type Board, type Card } from "@/lib/api";
import { useErrorNotice } from "@/hooks/useErrorNotice";

type State = {
  board: Board | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
};

export function useBoard(projectId: string) {
  const [state, setState] = useState<State>({
    board: null,
    loading: true,
    error: null,
    notFound: false,
  });
  const notify = useErrorNotice();
  const boardRef = useRef<Board | null>(null);

  useEffect(() => {
    boardRef.current = state.board;
  }, [state.board]);

  // Initial load: failures replace the board with the full-page error view.
  const load = useCallback(async () => {
    try {
      const board = await api.getBoard(projectId);
      setState({ board, loading: false, error: null, notFound: false });
    } catch (e) {
      setState({
        board: null,
        loading: false,
        error: e instanceof Error ? e.message : "failed to load board",
        notFound: e instanceof ApiError && e.status === 404,
      });
    }
  }, [projectId]);

  useEffect(() => {
    setState({ board: null, loading: true, error: null, notFound: false });
    void load();
  }, [load]);

  // Reload after an action: failures keep the current board and show a notice.
  const refresh = useCallback(async () => {
    try {
      const board = await api.getBoard(projectId);
      setState({ board, loading: false, error: null, notFound: false });
    } catch (e) {
      notify(errorMessage(e));
    }
  }, [projectId, notify]);

  const createColumn = useCallback(
    async (title: string) => {
      await api.createColumn(projectId, title);
      await refresh();
    },
    [projectId, refresh],
  );

  const renameColumn = useCallback(
    async (id: string, title: string) => {
      await api.renameColumn(projectId, id, title);
      await refresh();
    },
    [projectId, refresh],
  );

  const deleteColumn = useCallback(
    async (id: string) => {
      await api.deleteColumn(projectId, id);
      await refresh();
    },
    [projectId, refresh],
  );

  const createCard = useCallback(
    async (columnId: string, title: string, description: string) => {
      await api.createCard(projectId, columnId, title, description);
      await refresh();
    },
    [projectId, refresh],
  );

  const updateCard = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Card, "title" | "description" | "columnId" | "order">>,
    ) => {
      await api.updateCard(projectId, id, patch);
      await refresh();
    },
    [projectId, refresh],
  );

  const moveCardOptimistic = useCallback(
    async (cardId: string, toColumnId: string) => {
      const fromColumnId = boardRef.current?.cards.find(
        (c) => c.id === cardId,
      )?.columnId;
      const setCardColumn = (columnId: string) =>
        setState((prev) => {
          if (!prev.board) return prev;
          const cards = prev.board.cards.map((c) =>
            c.id === cardId ? { ...c, columnId } : c,
          );
          return { ...prev, board: { ...prev.board, cards } };
        });
      setCardColumn(toColumnId);
      try {
        await api.updateCard(projectId, cardId, { columnId: toColumnId });
      } catch (e) {
        if (fromColumnId) setCardColumn(fromColumnId);
        notify(errorMessage(e));
        return;
      }
      await refresh();
    },
    [projectId, refresh, notify],
  );

  const deleteCard = useCallback(
    async (id: string) => {
      await api.deleteCard(projectId, id);
      await refresh();
    },
    [projectId, refresh],
  );

  return {
    ...state,
    refresh,
    createColumn,
    renameColumn,
    deleteColumn,
    createCard,
    updateCard,
    moveCardOptimistic,
    deleteCard,
  };
}
