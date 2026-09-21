import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

// One field shape for both modes so the resolver type never changes under
// react-hook-form; the RULES differ, the SHAPE does not.
const fields = z.object({
  name: z.string().max(120),
  email: z.email("That does not look like an email address"),
  password: z.string(),
});

type Values = z.infer<typeof fields>;

function schemaFor(mode: Mode) {
  return fields.superRefine((values, ctx) => {
    if (mode === "sign-up") {
      if (values.name.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Please tell us your name",
          path: ["name"],
        });
      }
      if (values.password.length < 8) {
        ctx.addIssue({
          code: "custom",
          message: "At least 8 characters",
          path: ["password"],
        });
      }
      return;
    }

    if (values.password.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Enter your password",
        path: ["password"],
      });
    }
  });
}

const labelClass = "text-sm font-medium";
const errorClass = "mt-1 text-sm text-destructive";

export function SignInPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  // Where to land afterwards. Only a same-site path is accepted — an absolute
  // URL here would be an open redirect straight out of a phishing playbook.
  const raw = params.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const isSignUp = mode === "sign-up";

  const form = useForm<Values>({
    resolver: zodResolver(schemaFor(mode)),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setServerError(null);

    const result = isSignUp
      ? await signUp.email({
          name: values.name,
          email: values.email,
          password: values.password,
        })
      : await signIn.email({ email: values.email, password: values.password });

    if (result.error) {
      setServerError(result.error.message ?? "That did not work. Try again.");
      return;
    }

    navigate(next, { replace: true });
  }

  return (
    <section className="mx-auto w-full max-w-sm px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isSignUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isSignUp
          ? "You need an account to reserve gear."
          : "Sign in to see your rentals."}
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {isSignUp && (
          <div>
            <label className={labelClass} htmlFor="name">
              Full name
            </label>
            <Input
              id="name"
              className="mt-1 w-full"
              autoComplete="name"
              aria-invalid={form.formState.errors.name ? true : undefined}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className={errorClass}>{form.formState.errors.name.message}</p>
            )}
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            className="mt-1 w-full"
            autoComplete="email"
            aria-invalid={form.formState.errors.email ? true : undefined}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className={errorClass}>{form.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            className="mt-1 w-full"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            aria-invalid={form.formState.errors.password ? true : undefined}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className={errorClass}>{form.formState.errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? "Just a moment…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link
          to={`${isSignUp ? "/sign-in" : "/sign-up"}?next=${encodeURIComponent(next)}`}
          className="underline underline-offset-4"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </section>
  );
}
