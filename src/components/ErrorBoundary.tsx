import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle: string;
}

interface State {
  error: Error | null;
}

/**
 * Leaflet occasionally throws outside React's normal render cycle in ways
 * that still surface as render errors (e.g. an animation started against a
 * container that changed size mid-flight). Without a boundary, any such
 * error unmounts the whole app to a blank page. This isolates the failure
 * to the map panel and offers a way back in without losing the rest of the UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Map crashed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900 p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">{this.props.fallbackTitle}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
