import { cn } from "@/lib/utils";
import { useHealth } from "@/hooks/useHealth";
import { GearListPage } from "@/pages/GearListPage";

export default function App() {
  const health = useHealth();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <span className="font-semibold tracking-tight">FrameRent</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                "size-2 rounded-full",
                health.isSuccess
                  ? "bg-emerald-500"
                  : health.isError
                    ? "bg-destructive"
                    : "bg-muted-foreground/40",
              )}
            />
            {health.isSuccess
              ? `API up ${Math.round(health.data.uptime)}s`
              : health.isError
                ? "API unreachable"
                : "checking…"}
          </span>
        </div>
      </header>

      <GearListPage />
    </div>
  );
}
