import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mode, content, tone, conversationContext, user_id, message } = await req.json();
    console.log("AI Request started for user_id:", user_id, "Payload format:", { mode, hasContent: !!content, tone, hasMessage: !!message });
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ADVANCED PERSONA-BASED PROMPTING (Ported from make-server)
    const action = mode;
    const text = message || content || '';
    const context = conversationContext || '';
    
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

    const promptText = `System Instruction: ${systemInstruction}\n\nContext:\n${context}\n\nUser Input: "${text}"`;

    const scenarios = [
      { v: "v1beta", m: "gemini-2.5-flash" },
      { v: "v1beta", m: "gemini-2.0-flash" },
      { v: "v1beta", m: "gemini-1.5-flash" },
    ]
    
    const report: string[] = []
    let isRateLimited = false;
    let retryAfter = 15;

    for (const { v, m } of scenarios) {
      try {
        const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${geminiKey}`
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        })

        const data = await res.json()
        if (res.status === 200 && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const resultText = data.candidates[0].content.parts[0].text
          return new Response(JSON.stringify({ result: resultText.trim() }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        if (res.status === 429 || data.error?.code === 429) {
          isRateLimited = true;
          // Extract specific delay if available, else default to 15s
          retryAfter = 20; 
        }

        report.push(`${m}(${v}): ${res.status}`);
      } catch (err) {
        report.push(`${m}(${v}): ERR`);
      }
    }

    const status = isRateLimited ? 429 : 500;
    return new Response(JSON.stringify({ 
      error: isRateLimited ? "Rate limit reached. Auto-retry enabled." : "AI Exhausted.",
      logs: report.join(' | '),
      retryAfter: retryAfter
    }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
