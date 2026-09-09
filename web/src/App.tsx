import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Skeleton } from "./components/ui/skeleton";

type Health = {
  status: string;
  uptime: number;
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${import.meta.env.VITE_API_URL}/health`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        const body = await res.json();
        setHealth(body.data);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Request failed");
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>FrameRent</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">API unreachable — {error}</p>
          ) : health ? (
            <div className="flex items-center gap-2">
              <Badge>{health.status}</Badge>
              <span className="text-sm text-muted-foreground">
                up {health.uptime}s
              </span>
            </div>
          ) : (
            <Skeleton className="h-6 w-32" />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
