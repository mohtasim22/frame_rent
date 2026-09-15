import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { healthSchema, type Health } from "@shared/schemas/health.schema";
import { api, ApiError } from "./api/client";




export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  const controller = new AbortController();

  api
    .get("/health", { schema: healthSchema, signal: controller.signal })
    .then(({ data }) => setHealth(data))
    .catch((err: unknown) => {
      if (controller.signal.aborted) return;
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
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
