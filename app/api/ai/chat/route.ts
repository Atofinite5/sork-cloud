import OpenAI from 'openai';
import { db } from '@/lib/db';
import { usageEvents } from '@/lib/db/schema';
import { validateLicenseKey } from '@/lib/validateLicense';
import { getUserQuota } from '@/lib/quota';
import { z } from 'zod';

const bodySchema = z.object({
  system: z.string(),
  user: z.string(),
  temperature: z.number().min(0).max(2).optional().default(0.2),
  maxTokens: z.number().int().positive().optional().default(4096),
});

const MODEL = process.env.AI_MODEL ?? 'minimaxai/minimax-m2.7';
const BASE_URL = process.env.AI_BASE_URL ?? 'https://integrate.api.nvidia.com/v1';

/**
 * AI proxy used by the CLI when the user pastes a sork_live_* key.
 *
 * Flow:
 *   1. Validate the license key (Bearer header)
 *   2. Check quota — free users are capped at FREE_REQUEST_LIMIT lifetime requests
 *   3. If quota exhausted, return 402 with Skydo upgrade links
 *   4. Otherwise call NVIDIA, log usage, return JSON
 */
export async function POST(req: Request): Promise<Response> {
  const license = await validateLicenseKey(req.headers.get('authorization'));
  if (!license) {
    return Response.json({ error: 'Invalid or expired API key' }, { status: 401 });
  }

  // Quota check — free users get FREE_REQUEST_LIMIT then 402
  const quota = await getUserQuota(license.userId);
  if (quota.exhausted) {
    return Response.json(
      {
        error: 'Free plan exhausted',
        message: `You've used all ${quota.limit} free requests. Upgrade to continue.`,
        used: quota.used,
        limit: quota.limit,
        upgradeLinks: {
          pro: process.env.NEXT_PUBLIC_PAYMENT_LINK_PRO,
          pro_plus: process.env.NEXT_PUBLIC_PAYMENT_LINK_PRO_PLUS,
          dashboard: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/pricing`,
        },
      },
      { status: 402 }, // 402 Payment Required
    );
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey, baseURL: BASE_URL });

  let completion: OpenAI.Chat.ChatCompletion;
  try {
    completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: body.temperature,
      max_tokens: body.maxTokens,
      messages: [
        { role: 'system', content: body.system },
        { role: 'user', content: body.user },
      ],
      response_format: { type: 'json_object' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI provider error';
    return Response.json({ error: message }, { status: 502 });
  }

  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  const costUsd = ((inputTokens * 0.3 + outputTokens * 0.3) / 1_000_000).toFixed(6);

  // Log usage — counted toward free-plan limit
  await db.insert(usageEvents).values({
    userId: license.userId,
    licenseKeyId: license.licenseKeyId,
    endpoint: 'triage',
    model: MODEL,
    inputTokens,
    outputTokens,
    costUsd,
    status: 'ok',
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { raw: content };
  }

  // Include remaining quota in response headers so the CLI can warn
  const remaining = quota.unlimited ? '∞' : String(Math.max(0, quota.remaining - 1));
  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'x-sork-quota-used': String(quota.used + 1),
      'x-sork-quota-limit': quota.unlimited ? 'unlimited' : String(quota.limit),
      'x-sork-quota-remaining': remaining,
    },
  });
}
