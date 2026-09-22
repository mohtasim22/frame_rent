import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Trash2, Upload } from "lucide-react";
import { z } from "zod";
import { uploadSignatureSchema } from "@shared/schemas/admin.schema";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const productImagesResult = z.object({
  id: z.string(),
  slug: z.string(),
  images: z.array(z.string()),
});

/** Cloudinary's own response. Only the bit we store is described. */
const cloudinaryResult = z.object({ secure_url: z.string().url() });

/**
 * Uploads go BROWSER -> CLOUDINARY directly. The file never passes through our
 * API, which keeps multi-megabyte requests off a free-tier server entirely.
 *
 * What our API controls is the signature: without one, Cloudinary refuses the
 * upload. So only a signed-in admin can put anything in the account, and it can
 * only land in the folder the server named.
 */
export function ImageManager({
  productId,
  productName,
  images,
}: {
  productId: string;
  productName: string;
  images: string[];
}) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string[]>(images);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (next: string[]) =>
      api.put(`/api/v1/admin/products/${productId}/images`, { images: next }, {
        schema: productImagesResult,
      }),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gear"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  async function upload(files: FileList) {
    setError(null);

    const room = MAX_IMAGES - draft.length;
    if (room <= 0) {
      setError(`That is already ${MAX_IMAGES} images.`);
      return;
    }

    const chosen = Array.from(files).slice(0, room);

    // Check before uploading rather than after. Cloudinary would reject these
    // too, but a local check costs nothing and fails in a tenth of a second.
    for (const file of chosen) {
      if (!ACCEPTED.includes(file.type)) {
        setError(`${file.name} is a ${file.type || "unknown type"}. Use JPEG, PNG, WebP or AVIF.`);
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`);
        return;
      }
    }

    setUploading(true);

    try {
      const signed = await api.post("/api/v1/admin/uploads/signature", undefined, {
        schema: uploadSignatureSchema,
      });
      const s = signed.data;

      const uploaded: string[] = [];

      for (const file of chosen) {
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", s.apiKey);
        form.append("timestamp", String(s.timestamp));
        form.append("folder", s.folder);
        form.append("signature", s.signature);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`,
          { method: "POST", body: form },
        );

        if (!res.ok) {
          const detail = (await res.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          throw new Error(detail?.error?.message ?? `Cloudinary refused ${file.name}`);
        }

        const parsed = cloudinaryResult.safeParse(await res.json());
        if (!parsed.success) throw new Error("Cloudinary sent back an unexpected shape");

        uploaded.push(parsed.data.secure_url);
      }

      const next = [...draft, ...uploaded];
      setDraft(next);
      save.mutate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= draft.length) return;

    const next = [...draft];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraft(next);
    save.mutate(next);
  }

  function remove(index: number) {
    const next = draft.filter((_, i) => i !== index);
    setDraft(next);
    // Only the reference is dropped. The file stays in Cloudinary, because a
    // delete here would break any older page still pointing at it.
    save.mutate(next);
  }

  return (
    <div className="mt-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Images{" "}
          <span className="font-normal text-muted-foreground">
            ({draft.length}/{MAX_IMAGES}) · first one is the thumbnail
          </span>
        </p>

        <Button
          size="sm"
          variant="outline"
          disabled={uploading || draft.length >= MAX_IMAGES}
          onClick={() => fileInput.current?.click()}
        >
          <Upload className="size-4" aria-hidden="true" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          aria-label={`Upload images for ${productName}`}
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files);
          }}
        />
      </div>

      {(error || save.isError) && (
        <p className="mt-2 text-sm text-destructive">
          {error ?? save.error?.message}
        </p>
      )}

      {draft.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No images yet. This product shows a camera icon in the catalogue.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-3">
          {draft.map((url, index) => (
            <li key={url} className="relative">
              <img
                src={url}
                alt={`${productName}, image ${index + 1}`}
                className="size-24 rounded-md border object-cover"
                loading="lazy"
              />

              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-medium text-brand-foreground">
                  Main
                </span>
              )}

              <div className="mt-1 flex justify-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move image ${index + 1} earlier`}
                  className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <GripVertical className="size-3.5 rotate-90" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove image ${index + 1}`}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {save.isPending ? "Saving…" : "JPEG, PNG, WebP or AVIF, up to 5 MB each."}
      </p>
    </div>
  );
}
