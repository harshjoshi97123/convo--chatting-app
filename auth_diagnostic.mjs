const projectId = "wsvhuivpzqmvznznbqyq";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzdmh1aXZwenFtdnpuem5icXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODk5MzAsImV4cCI6MjA3ODM2NTkzMH0.DzHKEqQQbe63Ix2-1h1XJvKBZWqYd26NgiS4Vz9wDuM";

const headers = {
  "apikey": anonKey,
  "Content-Type": "application/json"
};

async function runDiagnostics() {
  const testEmail = "diagnostic_zoro_" + Date.now() + "@example.com";
  const testUsername = "diag_user_" + Date.now();
  console.log("=== SUPABASE DIAGNOSTICS ===");
  console.log("Target Email:", testEmail);

  // 1. Test Auth Signup
  console.log("\n[1] Testing Auth Signup...");
  const authRes = await fetch(`https://${projectId}.supabase.co/auth/v1/signup`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: testEmail,
      password: "password123",
      data: { name: "Diag User", username: testUsername }
    })
  });
  
  const authData = await authRes.json();
  console.log("Auth Status:", authRes.status);
  
  if (!authRes.ok) {
     console.error("Auth Failed:", authData);
     return;
  }
  
  const userId = authData.user?.id || authData.id; // handle different payload shapes
  console.log("Auth Success. Auto-login session established?:", !!authData.session);
  console.log("User ID:", userId);
  
  if (!userId) {
     console.error("No user ID returned. Cannot proceed with DB test.");
     return;
  }

  // 2. Test DB Insert (RLS check)
  console.log("\n[2] Testing Postgres users table insert (Checking RLS)...");
  const dbHeaders = {
    ...headers,
    "Authorization": `Bearer ${anonKey}`,
    "Prefer": "return=representation"
  };
  
  const dbRes = await fetch(`https://${projectId}.supabase.co/rest/v1/users`, {
    method: "POST",
    headers: dbHeaders,
    body: JSON.stringify({
      id: userId,
      name: "Diag User",
      username: testUsername,
      email: testEmail,
      avatar: ""
    })
  });
  
  const dbData = await dbRes.text();
  console.log("DB Insert Status:", dbRes.status);
  
  if (!dbRes.ok) {
     console.error("-> FAILURE: Postgres rejected the insert! Did you run 'fix_users_rls.sql'?");
     console.error("DB Error:", dbData);
  } else {
     console.log("-> SUCCESS: Postgres accepted the insert. RLS is configured correctly!");
  }
  
  // 3. Test Handle Resolution (Login check)
  console.log("\n[3] Testing Handle-to-Email Lookup...");
  const lookupRes = await fetch(`https://${projectId}.supabase.co/rest/v1/users?select=email&username=eq.${testUsername}`, {
    method: "GET",
    headers: dbHeaders
  });
  
  const lookupData = await lookupRes.json();
  console.log("Lookup Status:", lookupRes.status);
  if (lookupRes.ok && lookupData.length > 0) {
     console.log("-> SUCCESS: Resolved username to:", lookupData[0].email);
  } else {
     console.error("-> FAILURE: Could not look up username via Select!");
     console.error("Data:", lookupData);
  }
}

runDiagnostics();
