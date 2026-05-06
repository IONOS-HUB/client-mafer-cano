import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sriService } from "@/features/sri/service";
import { getSRICompanyInfo } from "@/features/sri/config";
import { Sale, SaleItem } from "@/features/pos/types";
import { CustomerData } from "@/features/pos/invoice-types";

// Called nightly by the Supabase Edge Function sri-nightly-retry.
// Also callable manually for debugging:
//   curl -X POST https://your-app.com/api/sri/retry-failed \
//     -H "Authorization: Bearer $SRI_RETRY_SECRET"
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.SRI_RETRY_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "APP_URL not configured" }, { status: 500 });
  }

  const companyInfo = getSRICompanyInfo();
  if (!companyInfo) {
    return NextResponse.json({ error: "SRI company info not configured" }, { status: 500 });
  }

  // Service role key bypasses RLS — required for server-to-server calls without user sessions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Get IVA rate
  let ivaRate = 0.15;
  const { data: ivaData } = await supabase
    .from("tbl_iva")
    .select("value")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (ivaData?.value) ivaRate = ivaData.value;

  let retried = 0;
  let authorized = 0;
  let stillFailed = 0;

  // --- Scenario 1: Re-submit failed invoices ---
  const { data: errorSales } = await supabase
    .from("sales")
    .select("*")
    .eq("sri_status", "error")
    .lt("sri_retry_count", 5)
    .gt("created_at", sevenDaysAgo)
    .order("created_at", { ascending: true });

  for (const sale of errorSales ?? []) {
    const { data: rawItems } = await supabase
      .from("sale_items")
      .select("*, products (id, barcode, description, price, stock, created_at), services (id, description, created_at)")
      .eq("sale_id", sale.id);

    if (!rawItems?.length) continue;

    const saleItems: SaleItem[] = rawItems.map((item) => ({
      id: item.id,
      type: item.product_id ? "product" : "service",
      product: item.products ?? undefined,
      service: item.services ?? undefined,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      subtotal: item.unit_price * item.quantity,
    }));

    const completeSale: Sale = {
      id: sale.id,
      items: saleItems,
      total: sale.total,
      payment_method: sale.payment_method,
      invoice_number: sale.invoice_number,
      customer_data: sale.customer_data,
      created_at: sale.created_at,
    };

    const customerData = sale.customer_data as CustomerData | undefined;
    const invoiceData = sriService.generateInvoiceData(
      completeSale,
      companyInfo,
      customerData,
      ivaRate
    );

    await supabase
      .from("sales")
      .update({ sri_retry_count: (sale.sri_retry_count ?? 0) + 1, sri_last_retry_at: now })
      .eq("id", sale.id);

    retried++;

    try {
      const res = await fetch(`${appUrl}/api/sri/send-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: sale.id, invoiceData }),
      });

      const result = await res.json();

      if (result.success) {
        const updateData: Record<string, unknown> = {
          sri_status: "sent",
          sri_sent_at: now,
          sri_access_key: result.accessKey,
          sri_error_message: null,
        };
        if (result.authorizationNumber) {
          updateData.sri_status = "authorized";
          updateData.sri_authorization_number = result.authorizationNumber;
          updateData.sri_authorized_at = now;
          authorized++;
        }
        await supabase.from("sales").update(updateData).eq("id", sale.id);
      } else {
        await supabase
          .from("sales")
          .update({ sri_error_message: result.error ?? "Retry failed" })
          .eq("id", sale.id);
        stillFailed++;
      }
    } catch (err) {
      await supabase
        .from("sales")
        .update({ sri_error_message: err instanceof Error ? err.message : "Retry network error" })
        .eq("id", sale.id);
      stillFailed++;
    }
  }

  // --- Scenario 2: Check authorization for sent-but-pending invoices ---
  const { data: sentSales } = await supabase
    .from("sales")
    .select("*")
    .eq("sri_status", "sent")
    .is("sri_authorization_number", null)
    .not("sri_access_key", "is", null)
    .lt("sri_sent_at", fiveMinutesAgo)
    .gt("created_at", sevenDaysAgo);

  for (const sale of sentSales ?? []) {
    await supabase
      .from("sales")
      .update({ sri_retry_count: (sale.sri_retry_count ?? 0) + 1, sri_last_retry_at: now })
      .eq("id", sale.id);

    retried++;

    try {
      const res = await fetch(`${appUrl}/api/sri/check-authorization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessKey: sale.sri_access_key }),
      });

      const result = await res.json();

      if (result.authorizationNumber) {
        await supabase
          .from("sales")
          .update({
            sri_authorization_number: result.authorizationNumber,
            sri_status: "authorized",
            sri_authorized_at: now,
          })
          .eq("id", sale.id);
        authorized++;
      } else {
        stillFailed++;
      }
    } catch {
      stillFailed++;
    }
  }

  console.log(`[SRI retry-failed] retried=${retried} authorized=${authorized} stillFailed=${stillFailed}`);
  return NextResponse.json({ retried, authorized, stillFailed });
}
