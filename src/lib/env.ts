import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default("Neon Bites <orders@example.com>"),
  EMAIL_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  PAYMENT_MODE: z.enum(["mock", "razorpay"]).default("mock"),
  PAYMENT_PROVIDER_KEY_ID: z.string().optional(),
  PAYMENT_PROVIDER_KEY_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Never print secret values — only which keys failed.
    const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration. Check variables: ${keys}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production" && env.PAYMENT_MODE === "mock") {
    throw new Error("PAYMENT_MODE=mock is not allowed in production. Configure a real payment gateway.");
  }
  if (env.PAYMENT_MODE === "razorpay" && (!env.PAYMENT_PROVIDER_KEY_ID || !env.PAYMENT_PROVIDER_KEY_SECRET)) {
    throw new Error("PAYMENT_MODE=razorpay requires PAYMENT_PROVIDER_KEY_ID and PAYMENT_PROVIDER_KEY_SECRET.");
  }
  cached = env;
  return env;
}

/**
 * Lazy, validated environment access. Validation runs on first access at runtime
 * (not at module import), so builds never require real secrets.
 */
export const env: Env = new Proxy({} as Env, {
  get(_, key: string) {
    return getEnv()[key as keyof Env];
  }
});

export const isProduction = (): boolean => getEnv().NODE_ENV === "production";
