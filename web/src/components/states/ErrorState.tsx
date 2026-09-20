import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/client";

type Props = {
  error: unknown;
  onRetry?: () => void;
};

function describe(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") {
      return {
        title: "Can't reach the server",
        body: "The API isn't responding. It may still be starting up, or your connection dropped.",
        retryable: true,
      };
    }
    if (error.code === "INVALID_RESPONSE") {
      return {
        title: "Unexpected response",
        body: "The server replied in a shape this page doesn't understand. This usually means the app and the API are out of step.",
        retryable: false,
      };
    }
    if (error.status >= 500) {
      return { title: "Something broke on our side", body: error.message, retryable: true };
    }
    return { title: "That didn't work", body: error.message, retryable: false };
  }

  return {
    title: "Something went wrong",
    body: error instanceof Error ? error.message : "An unknown error occurred.",
    retryable: true,
  };
}

export function ErrorState({ error, onRetry }: Props) {
  const { title, body, retryable } = describe(error);

  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <p className="mt-4 font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {retryable && onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
