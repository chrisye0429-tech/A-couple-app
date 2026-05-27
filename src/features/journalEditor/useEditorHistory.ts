import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { JournalPage } from './types';

type PageHistoryEntry = {
  page: JournalPage;
  selectedElementId?: string;
};

type GestureHistoryKind = 'move' | 'resize';

const MAX_HISTORY_ENTRIES = 40;

export function useEditorHistory({
  page,
  selectedElementId,
  setPage,
  setSelectedElementId,
  setStorageMessage,
  onClearTransientState,
}: {
  page: JournalPage;
  selectedElementId?: string;
  setPage: Dispatch<SetStateAction<JournalPage>>;
  setSelectedElementId: Dispatch<SetStateAction<string | undefined>>;
  setStorageMessage: Dispatch<SetStateAction<string>>;
  onClearTransientState: () => void;
}) {
  const [undoHistory, setUndoHistory] = useState<PageHistoryEntry[]>([]);
  const [redoHistory, setRedoHistory] = useState<PageHistoryEntry[]>([]);
  const activeGestureHistory = useRef<{ elementId: string; kind: GestureHistoryKind } | null>(null);

  const canUndo = undoHistory.length > 0;
  const canRedo = redoHistory.length > 0;

  const pushHistoryEntry = (
    currentPage: JournalPage,
    currentSelectedElementId: string | undefined = selectedElementId,
  ) => {
    setUndoHistory((currentHistory) => [
      ...currentHistory.slice(Math.max(0, currentHistory.length - MAX_HISTORY_ENTRIES + 1)),
      {
        page: currentPage,
        selectedElementId: currentSelectedElementId,
      },
    ]);
    setRedoHistory([]);
  };

  const pushGestureHistoryEntry = (
    currentPage: JournalPage,
    elementId: string,
    kind: GestureHistoryKind,
  ) => {
    const gestureHistory = activeGestureHistory.current;

    if (gestureHistory?.elementId === elementId && gestureHistory.kind === kind) {
      return;
    }

    activeGestureHistory.current = {
      elementId,
      kind,
    };
    pushHistoryEntry(currentPage, selectedElementId);
  };

  const resetHistory = () => {
    setUndoHistory([]);
    setRedoHistory([]);
    activeGestureHistory.current = null;
  };

  const resetGestureHistory = () => {
    activeGestureHistory.current = null;
  };

  const handleUndo = () => {
    const previousEntry = undoHistory[undoHistory.length - 1];

    if (!previousEntry) {
      return;
    }

    setUndoHistory((currentHistory) => currentHistory.slice(0, -1));
    setRedoHistory((currentRedoHistory) => [
      ...currentRedoHistory.slice(Math.max(0, currentRedoHistory.length - MAX_HISTORY_ENTRIES + 1)),
      {
        page,
        selectedElementId,
      },
    ]);
    setPage(previousEntry.page);
    setSelectedElementId(previousEntry.selectedElementId ?? previousEntry.page.elements[0]?.id);
    setStorageMessage('已撤销上一步操作');
    onClearTransientState();
    resetGestureHistory();
  };

  const handleRedo = () => {
    const nextEntry = redoHistory[redoHistory.length - 1];

    if (!nextEntry) {
      return;
    }

    setRedoHistory((currentHistory) => currentHistory.slice(0, -1));
    setUndoHistory((currentUndoHistory) => [
      ...currentUndoHistory.slice(Math.max(0, currentUndoHistory.length - MAX_HISTORY_ENTRIES + 1)),
      {
        page,
        selectedElementId,
      },
    ]);
    setPage(nextEntry.page);
    setSelectedElementId(nextEntry.selectedElementId ?? nextEntry.page.elements[0]?.id);
    setStorageMessage('已恢复刚才撤销的操作');
    onClearTransientState();
    resetGestureHistory();
  };

  return {
    canRedo,
    canUndo,
    handleRedo,
    handleUndo,
    pushGestureHistoryEntry,
    pushHistoryEntry,
    resetGestureHistory,
    resetHistory,
  };
}
