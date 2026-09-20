import { Button } from "@/components/ui/button";
import { useGearFilters } from "@/hooks/useGearFilters";

type Props = {
  page: number;
  totalPages: number;
};

export function GearPagination({ page, totalPages }: Props) {
  const { setPage } = useGearFilters();

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-4"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </Button>

      <span className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
