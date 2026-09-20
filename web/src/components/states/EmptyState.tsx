import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-4 font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
