import fetch from 'node-fetch';

const PROJECT_ID = "wsvhuivpzqmvznznbqyq";
const DEBUG_SECRET = "ZORO_KV_DEBUG_77";
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-5b740c2f`;

async function debug() {
    console.log("--- DEBUGGING EDGE FUNCTION (REFINED) ---");
    
    const endpoints = [
        { name: "Health", url: `${BASE_URL}/health` },
        { name: "KV Users", url: `${BASE_URL}/debug-kv?prefix=user:`, headers: { 'x-debug-secret': DEBUG_SECRET } },
        { name: "KV Convs", url: `${BASE_URL}/debug-kv?prefix=conv:`, headers: { 'x-debug-secret': DEBUG_SECRET } }
    ];

    for (const ep of endpoints) {
        console.log(`\nTesting ${ep.name}...`);
        try {
            const res = await fetch(ep.url, { headers: ep.headers });
            console.log(`Status: ${res.status}`);
            const text = await res.text();
            try {
                const data = JSON.parse(text);
                console.log("Data:", JSON.stringify(data, null, 2));
            } catch (e) {
                console.log("Response (not JSON):", text.substring(0, 500));
            }
        } catch (e) {
            console.error(`${ep.name} Failed:`, e.message);
        }
    }
}

debug();
