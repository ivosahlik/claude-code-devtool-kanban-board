import { Board } from "./components/Board";
import { Projects } from "./components/Projects";
import { ErrorNoticeProvider } from "./hooks/useErrorNotice";
import { useHashRoute } from "./hooks/useHashRoute";

export function App() {
  const route = useHashRoute();
  return (
    <ErrorNoticeProvider>
      {route.name === "board" ? (
        <Board projectId={route.projectId} />
      ) : (
        <Projects />
      )}
    </ErrorNoticeProvider>
  );
}
