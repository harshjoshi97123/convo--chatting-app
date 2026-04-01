import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wsvhuivpzqmvznznbqyq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM';

async function searchKV() {
    const supabase = createClient(SUPABASE_URL, ANON_KEY);
    console.log("Searching KV Store for 'Harsh' or 'Devendra'...");
    
    // Try to get all entries starting with 'user-conv:' or 'conv:'
    const { data: allKV, error } = await supabase
        .from('kv_store_5b740c2f')
        .select('*');
        
    if (error) {
        console.error("Error accessing KV store:", error.message);
        return;
    }
    
    console.log(`Analyzing ${allKV?.length || 0} total keys.`);
    
    const userConvKeys = allKV.filter(k => k.key.startsWith('user-conv:'));
    console.log(`Found ${userConvKeys.length} 'user-conv:' keys.`);
    
    const convKeys = allKV.filter(k => k.key.startsWith('conv:'));
    console.log(`Found ${convKeys.length} 'conv:' keys.`);

    const userKeys = allKV.filter(k => k.key.startsWith('user:'));
    console.log(`Found ${userKeys.length} 'user:' keys.`);

    const zoroConvEntries = allKV.filter(k => k.key.startsWith(`user-conv:a352fd73`));
    console.log(`Zoro has ${zoroConvEntries.length} user-conv entries.`);
    if (zoroConvEntries.length > 0) {
        console.log(`Sample Value: ${JSON.stringify(zoroConvEntries[0].value, null, 2)}`);
    } else {
        console.log("No user-conv entries found for Zoro.");
    }
}

searchKV();
