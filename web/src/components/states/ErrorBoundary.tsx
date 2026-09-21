import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <p className="font-medium">This page hit an error</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Something in the interface crashed. Reloading usually fixes it.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            Reload the page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
