import { createClient } from '@supabase/supabase-js';

// Configuration from info.tsx
const projectId = "wsvhuivpzqmvznznbqyq";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM";
const supabaseUrl = `https://${projectId}.supabase.co`;

const supabase = createClient(supabaseUrl, publicAnonKey);

async function testAI() {
    console.log("--- Supabase AI Health Check ---");
    console.log(`Target URL: ${supabaseUrl}/functions/v1/make-server-5b740c2f/ai-copilot`);

    try {
        // 1. Check Health Endpoint
        console.log("\n1. Checking Server Health...");
        const healthRes = await fetch(`${supabaseUrl}/functions/v1/make-server-5b740c2f/health`);
        if (healthRes.ok) {
            console.log("✅ Server is ALIVE and reachable.");
        } else {
            console.log(`❌ Server Health Check Failed (${healthRes.status}). The function might not be deployed.`);
            return;
        }

        // 2. Test AI Endpoint (Minimal Request)
        console.log("\n2. Testing AI Co-Pilot Endpoint...");
        const aiRes = await fetch(`${supabaseUrl}/functions/v1/make-server-5b740c2f/ai-copilot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'rewrite', content: 'test', tone: 'Friendly' })
        });

        const data = await aiRes.json().catch(() => ({}));
        
        if (aiRes.ok) {
            console.log("✅ AI Response Received:", data.result);
        } else {
            console.log(`❌ AI Endpoint Failed (${aiRes.status})`);
            console.log("Detail:", data.error || "No error detail");
            
            if (aiRes.status === 401) {
                console.log("💡 Suggestion: You need to be authenticated. This test ran without a token.");
            } else if (data.error && data.error.includes("not configured")) {
                console.log("💡 CRITICAL: You need to set GEMINI_API_KEY in Supabase Secrets.");
                console.log("Run: supabase secrets set GEMINI_API_KEY=your_key_here");
            }
        }

    } catch (err) {
        console.error("\n❌ NETWORK ERROR: Could not reach Supabase.");
        console.error(err.message);
        if (err.message.includes("fetch")) {
            console.log("💡 Suggestion: Check your internet or if the Supabase project is active.");
        }
    }
}

testAI();
