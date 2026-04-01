import { Hono } from "https://esm.sh/hono@3.11.7";
import { cors } from "https://esm.sh/hono@3.11.7/cors";

const app = new Hono();

app.use('*', cors());

app.get("*", (c) => {
  return c.json({ 
    status: "minimal_ok", 
    time: new Date().toISOString(),
    message: "If you see this, the Edge Function runtime is working."
  });
});

export default app;
