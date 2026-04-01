// @ts-nocheck
import { Hono } from "https://esm.sh/hono@3.11.7";
import { cors } from "https://esm.sh/hono@3.11.7/cors";
import { logger } from "https://esm.sh/hono@3.11.7/logger";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

console.log("[BOOT] Stable AI Backend (v2) starting...");

const app = new Hono();
const api = new Hono();

// 1. ABSOLUTE TOP PRIORITY: CORS (Prevents "Failed to fetch")
app.use("*", async (c, next) => {
  c.res.headers.set("Access-Control-Allow-Origin", "*");
  c.res.headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  c.res.headers.set("Access-Control-Allow-Headers", "*");
  if (c.req.method === "OPTIONS") return c.text("", 204);
  await next();
});
api.use('*', cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "x-client-info", "apikey"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// --- DATABASE LAYER ---
const getSupabaseAdmin = () => createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
const getSupabaseClient = () => createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_ANON_KEY') || '');

const kv = {
  set: async (key, value) => {
    const { error } = await getSupabaseAdmin().from("kv_store_5b740c2f").upsert({ key, value });
    if (error) throw new Error(error.message);
  },
  get: async (key) => {
    const { data, error } = await getSupabaseAdmin().from("kv_store_5b740c2f").select("value").eq("key", key).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.value;
  },
  getByPrefix: async (prefix) => {
    const { data, error } = await getSupabaseAdmin().from("kv_store_5b740c2f").select("value").like("key", prefix + "%");
    if (error) throw new Error(error.message);
    return data?.map(d => d.value) || [];
  }
};

// --- AUTH LAYER ---
async function verifyUser(req) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return null;
  const { data: { user }, error } = await getSupabaseClient().auth.getUser(token);
  return error || !user ? null : user;
}

// --- ROUTES ---

api.get("/health", (c) => c.json({ status: "ok", version: "2.0.0-stable" }));

api.post("/ai-copilot", async (c) => {
  try {
    const body = await c.req.json();
    const action = body.action || body.mode || 'rewrite';
    const text = body.text || body.content || body.question || '';
    const tone = body.tone || 'Professional';
    const context = body.conversationContext || '';
    
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) return c.json({ error: "Missing API Key" }, 501);

    // ADVANCED PERSONA-BASED PROMPTING
    let systemInstruction = "You are a High-End Communication Expert. Provide concise, surgical results.";
    
    if (action === 'rewrite') {
      systemInstruction = `Task: Rewrite the text into a ${tone} tone. Keep original meaning. ONLY return the rewritten text. NO preamble like 'Here is your rewrite'.`;
    } else if (action === 'tone') {
      systemInstruction = `Task: Analyze the tone of the provided text. Provide a brief breakdown (e.g., 'Polite, but slightly distant') and 1 single suggestion for improvement.`;
    } else if (action === 'tasks') {
      systemInstruction = `Task: Extract action items/tasks from the text. Use a clean bulleted list. If no tasks found, return 'No tasks identified'.`;
    } else if (action === 'summarize') {
      systemInstruction = `Task: Summarize the following conversation history. Structure: 1. Core Objective, 2. Key Decisions, 3. Next Steps.`;
    } else if (action === 'search' || action === 'followup') {
      systemInstruction = `Task: ${action}. Use context if relevant. Tone: ${tone}. Be professional and helpful.`;
    }

    const prompt = `System Instruction: ${systemInstruction}\n\nContext:\n${context}\n\nUser Input: "${text}"`;

    // DYNAMIC MODEL DISCOVERY: Ask Google which models are supported for this key
    let discoveredModels = [];
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey}`);
      const listData = await listRes.json();
      if (listData.models) {
        discoveredModels = listData.models
          .filter(m => m.supportedGenerationMethods.includes("generateContent"))
          .map(m => m.name.replace("models/", ""));
      }
    } catch (e) { console.error("Discovery error:", e); }

    // Fallback list if discovery fails
    const seedModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"];
    const modelsToTry = discoveredModels.length > 0 ? discoveredModels : seedModels;
    
    let lastError = "";
    let resultText = "";

    for (const model of modelsToTry) {
      // Try both v1 and v1beta for each discovered model
      for (const ver of ["v1", "v1beta"]) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${geminiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          
          const data = await res.json();
          if (data.error) {
            lastError = `${ver}/${model}: ${data.error.message}`;
            continue; 
          }

          resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (resultText) break; 
        } catch (e) {
          lastError = e.message;
        }
      }
      if (resultText) break;
    }

    if (!resultText) {
      return c.json({ result: `AI Error: No working model found among discovered list: ${modelsToTry.join(", ")}. Last error: ${lastError}` });
    }
    
    return c.json({ result: resultText.trim() });
  } catch (e) { return c.json({ error: e.message }, 500); }
});

api.get("/conversations", async (c) => {
  const user = await verifyUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const all = await kv.getByPrefix('conv:');
  const userConvs = all.filter(conv => conv.participants?.includes(user.id));
  return c.json({ success: true, conversations: userConvs });
});

api.get("/messages/:id", async (c) => {
  const user = await verifyUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const msgs = await kv.getByPrefix(`msg:${c.req.param('id')}`);
  return c.json({ success: true, messages: msgs });
});

api.post("/send-message", async (c) => {
  const user = await verifyUser(c.req.raw);
  const body = await c.req.json();
  const msgKey = `msg:${body.conversationId}:${Date.now()}`;
  const message = { ...body, id: msgKey, senderId: user?.id, timestamp: new Date().toISOString() };
  await kv.set(msgKey, message);
  return c.json({ success: true, message });
});

api.get("/profile/:userId", async (c) => {
  const profile = await kv.get(`user:${c.req.param('userId')}`);
  return c.json({ profile });
});

api.get("/users", async (c) => {
  const users = await kv.getByPrefix('user:');
  return c.json({ users });
});

// App Mounting
app.route("/", api);
app.route("/make-server-5b740c2f", api);
app.route("/v1/make-server-5b740c2f", api);
app.route("/functions/v1/make-server-5b740c2f", api);

export default app;