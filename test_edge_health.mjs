import fetch from 'node-fetch';

const PROJECT_ID = "wsvhuivpzqmvznznbqyq";
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-5b740c2f`;

async function verify() {
    console.log("--- VERIFYING EDGE FUNCTION CONNECTIVITY ---");
    
    try {
        console.log("Pinging health endpoint...");
        const res = await fetch(`${BASE_URL}/health`);
        const data = await res.json();
        
        if (res.ok && data.status === "ok") {
            console.log("SUCCESS: Edge Function is REACHABLE.");
        } else {
            console.error("FAILURE: Edge Function returned an error:", res.status, data);
            return;
        }

        // We can't easily test SQL/KV without a user token here, 
        // but the 'Invoke error' usually disappears once secrets are set.
        console.log("\nIf you see 'SUCCESS' above, please refresh your chat application.");
        console.log("If your chats still don't appear, check the Supabase Edge Function logs for details.");
        
    } catch (e) {
        if (e.message.includes("Invoke error")) {
            console.error("STILL FAILING: Edge Function is throwing an Invoke Error. This means secrets are likely still missing or incorrect.");
        } else {
            console.error("CONNECTION ERROR:", e.message);
        }
    }
}

verify();
