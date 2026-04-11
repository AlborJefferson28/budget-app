// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore
import { processWithOpenRouter } from "./providers/openrouter.ts";
// @ts-ignore
import { processWithGemini } from "./providers/gemini.ts";

// Declarar Deno globalmente para evitar error TS2584 en editores configurados para Node.js
declare const Deno: any;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIRequest {
  message: string;
  message_id?: string; // The ID of the assistant placeholder message to update
  image?: string; // base64
  user_id?: string; // Target user for actions
  context: {
    accounts: any[];
    wallets: any[];
    budgets: any[];
    ai_mode: "agendar" | "guardar";
  };
  history?: { role: "user" | "assistant", content: string }[];
}

serve(async (req: Request) => {
  console.log("Function requested! Method:", req.method);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No se proporcionó el encabezado de autorización." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isServiceRole = token === serviceRoleKey;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      isServiceRole ? serviceRoleKey : (Deno.env.get("SUPABASE_ANON_KEY") ?? ""),
      { global: { headers: { Authorization: authHeader } } }
    );

    let user = null;
    if (!isServiceRole) {
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: "No autorizado. Asegúrate de haber iniciado sesión." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      user = authUser;
    }

    const body = await req.json() as AIRequest;
    const { message, message_id, image, context, history = [], user_id: bodyUserId } = body;
    
    // Determine the user ID to use for subsequent operations
    const effectiveUserId = user?.id || bodyUserId;

    if (!effectiveUserId && isServiceRole) {
       // If it's service role but no user_id is provided in body, we might have issues with executeServerAction
       console.warn("Service role used but no user_id found in request body.");
    }

    const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!openRouterApiKey && !geminiApiKey) {
      throw new Error("Missing both OPENROUTER_API_KEY and GEMINI_API_KEY in Supabase Secrets.");
    }

    let result;
    let openRouterError = null;

    // --- Try OpenRouter first ---
    if (openRouterApiKey) {
      try {
        console.log("Processing with OpenRouter...");
        result = await processWithOpenRouter(message, image, context, openRouterApiKey, history);
        console.log("OpenRouter succeeded.");
      } catch (err: any) {
        console.warn("OpenRouter exhausted all models. Last error:", err.message);
        openRouterError = err;
      }
    }

    // --- Fallback: Try Gemini ---
    if (!result && geminiApiKey) {
      try {
        console.log("Falling back to Gemini...");
        result = await processWithGemini(message, image, context, geminiApiKey, history);
        console.log("Gemini succeeded.");
      } catch (err: any) {
        console.error("Gemini fallback also failed:", err.message);
        throw openRouterError || err;
      }
    }

    if (!result) {
      throw openRouterError || new Error("All AI providers failed to respond.");
    }

    if (!result.reply) {
      result.reply = result.action 
        ? "He procesado tu solicitud. ¿Algo más en lo que pueda ayudarte?" 
        : "Lo siento, no pude procesar esa solicitud correctamente. ¿Podrías intentar de nuevo?";
    }

    // Server-side enforcement & Auto-processing
    let isProcessed = false;
    if (result.action) {
      const restrictedTypes = ["user_settings", "account_management", "member_management"];
      if (restrictedTypes.includes(result.action.type)) {
        result.action = null;
        result.reply = "Lo siento, no tengo permiso para realizar cambios en la configuración o gestión de cuentas por motivos de seguridad.";
      } else {
        if (context.ai_mode) result.action.mode = context.ai_mode;
        
        // Execute action if in 'guardar' mode or 'agendar'
        try {
          isProcessed = await executeServerAction(supabaseClient, result.action, effectiveUserId, context);
        } catch (e) {
          console.error("Failed to execute server action:", e);
        }
      }
    }

    // Update the message in DB if message_id was provided
    if (message_id) {
      console.log("Updating message placeholder:", message_id);
      const { error: updateError } = await supabaseClient
        .from("ai_chat_messages")
        .update({
          content: result.reply,
          action_json: result.action,
          processed: isProcessed
        })
        .eq("id", message_id);
      
      if (updateError) console.error("Error updating message:", updateError);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Try to update message with error if possible
    try {
      const body = await req.clone().json();
      if (body.message_id) {
        const token = req.headers.get("Authorization")?.replace("Bearer ", "");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const isServiceRole = token === serviceRoleKey;

        const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", 
          isServiceRole ? serviceRoleKey : (Deno.env.get("SUPABASE_ANON_KEY") ?? ""), {
          global: { headers: { Authorization: req.headers.get("Authorization")! } }
        });
        await supabaseClient.from("ai_chat_messages").update({
          content: `🚨 Error: ${errorMessage}. Intenta de nuevo más tarde.`
        }).eq("id", body.message_id);
      }
    } catch (e) { /* ignore */ }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function executeServerAction(supabase: any, action: any, userId: string, context: any) {
  const { wallets = [], accounts = [] } = context;
  const activeAccountId = accounts[0]?.id;

  if (action.mode === 'agendar') {
    const accId = action.data.account_id || activeAccountId;
    const { error } = await supabase.from('pending_actions').insert({
      user_id: userId,
      account_id: accId,
      type: action.type,
      payload: { ...action.data, account_id: accId, created_by: userId },
      status: 'pending'
    });
    if (error) throw error;
    return true;
  } else if (action.mode === 'guardar') {
    let raw = { ...action.data, created_by: userId };
    if (!raw.account_id) raw.account_id = activeAccountId;

    if (action.type === 'transaction') {
      const defaultWalletId = wallets?.[0]?.id;
      if (raw.description && !raw.note) raw.note = raw.description;
      if (raw.date && !raw.occurred_at) raw.occurred_at = raw.date;
      
      if (raw.wallet_id && !raw.from_wallet && !raw.to_wallet) {
        if (raw.type === 'income') raw.to_wallet = raw.wallet_id;
        else raw.from_wallet = raw.wallet_id;
      }

      const resolveWalletId = (val: string) => {
        if (!val) return val;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(val)) return val;
        const found = wallets?.find((w: any) => w.name?.toLowerCase() === val.toLowerCase());
        return found?.id || defaultWalletId;
      };

      raw.from_wallet = resolveWalletId(raw.from_wallet);
      raw.to_wallet = resolveWalletId(raw.to_wallet);

      if (raw.type === 'expense') {
        if (!raw.from_wallet) raw.from_wallet = defaultWalletId;
        raw.to_wallet = null;
      } else if (raw.type === 'income') {
        if (!raw.to_wallet) raw.to_wallet = defaultWalletId;
        raw.from_wallet = null;
      } else if (raw.type === 'transfer') {
        if (!raw.from_wallet) raw.from_wallet = defaultWalletId;
        if (!raw.to_wallet) raw.to_wallet = wallets?.find((w: any) => w.id !== raw.from_wallet)?.id;
      }

      const validFields = ['account_id', 'from_wallet', 'to_wallet', 'amount', 'type', 'category', 'note', 'occurred_at', 'created_by'];
      const sanitized: any = {};
      validFields.forEach(f => { if (raw[f] !== undefined) sanitized[f] = raw[f]; });

      const { error } = await supabase.from('transactions').insert(sanitized);
      if (error) throw error;
      return true;
    } else if (action.type === 'allocation') {
      const validFields = ['amount', 'wallet_id', 'budget_id', 'created_by'];
      const sanitized: any = {};
      validFields.forEach(f => { if (raw[f] !== undefined) sanitized[f] = raw[f]; });
      const { error } = await supabase.from('allocations').insert(sanitized);
      if (error) throw error;
      return true;
    }
  }
  return false;
}
