import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

const MAX_NOTICES = 3;
const NOTICE_MS = 5000;

type Notice = { id: number; message: string };
type Notify = (message: string) => void;

const ErrorNoticeContext = createContext<Notify | null>(null);

// Moves focus out of a notice that is going away: back to where it came from,
// or else into the topmost open dialog.
function returnFocus(previous: HTMLElement | null) {
  if (previous?.isConnected) {
    previous.focus();
    return;
  }
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][data-state="open"]');
  dialogs[dialogs.length - 1]?.focus();
}

export function ErrorNoticeProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(0);
  // The element focused just before focus entered the notices.
  const previousFocus = useRef<HTMLElement | null>(null);

  const notify = useCallback<Notify>((message) => {
    const id = ++nextId.current;
    setNotices((prev) => [...prev, { id, message }].slice(-MAX_NOTICES));
  }, []);

  // `hadFocus` is checked by the item before it is removed: afterwards focus
  // has already fallen to <body>.
  const dismiss = useCallback((id: number, hadFocus: boolean) => {
    if (hadFocus) returnFocus(previousFocus.current);
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <ErrorNoticeContext.Provider value={notify}>
      {children}
      <div
        data-error-notice
        role="status"
        aria-live="polite"
        onFocus={(e) => {
          const from = e.relatedTarget as HTMLElement | null;
          if (!e.currentTarget.contains(from)) previousFocus.current = from;
        }}
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {notices.map((n) => (
          <NoticeItem key={n.id} notice={n} onDismiss={dismiss} />
        ))}
      </div>
    </ErrorNoticeContext.Provider>
  );
}

function NoticeItem({
  notice,
  onDismiss,
}: {
  notice: Notice;
  onDismiss: (id: number, hadFocus: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dismiss = useCallback(
    () => onDismiss(notice.id, ref.current?.contains(document.activeElement) ?? false),
    [notice.id, onDismiss],
  );

  // The timer lives with the item, so dismissing, dropping or unmounting it
  // clears the timer too.
  useEffect(() => {
    const timer = window.setTimeout(dismiss, NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [dismiss]);

  return (
    <div
      ref={ref}
      className="pointer-events-auto flex items-start gap-2 rounded-lg border border-destructive bg-destructive p-3 text-sm text-destructive-foreground shadow-lg"
    >
      <p className="flex-1 break-words">{notice.message}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-destructive-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useErrorNotice(): Notify {
  const notify = useContext(ErrorNoticeContext);
  if (!notify) {
    throw new Error("useErrorNotice must be used inside ErrorNoticeProvider");
  }
  return notify;
}
