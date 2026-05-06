// Supabase Edge Function: sri-nightly-retry
// Triggers the Next.js /api/sri/retry-failed endpoint to re-process
// invoices that failed or are pending authorization from SRI.
//
// Deploy:
//   supabase functions deploy sri-nightly-retry
//
// Set secrets:
//   supabase secrets set APP_URL=https://your-domain.com
//   supabase secrets set  SRI_RETRY_SECRET=your-secret-here
//
// Schedule (Supabase Dashboard → Edge Functions → sri-nightly-retry → Schedule):
//   Cron: 0 7 * * *   (2:00 AM Ecuador time = 7:00 AM UTC)

Deno.serve(async () => {
  const appUrl = Deno.env.get("APP_URL");
  const secret = Deno.env.get("SRI_RETRY_SECRET");

  if (!appUrl || !secret) {
    console.error("[sri-nightly-retry] Missing APP_URL or SRI_RETRY_SECRET");
    return new Response(
      JSON.stringify({ error: "Missing environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log("[sri-nightly-retry] Starting nightly SRI retry job...");

  try {
    const response = await fetch(`${appUrl}/api/sri/retry-failed`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    console.log(`[sri-nightly-retry] Done:`, result);

    return new Response(JSON.stringify(result), {
      status: response.ok ? 200 : response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sri-nightly-retry] Failed:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
