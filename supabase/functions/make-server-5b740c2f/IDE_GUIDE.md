# Supabase Edge Function IDE Guide

The file `supabase/functions/make-server-5b740c2f/index.ts` is a **Deno** script, which is why your IDE (likely VS Code with a Node.js configuration) is showing "Cannot find name 'Deno'" or "Cannot find module 'npm:hono'".

These are **False Positives**—the code will run perfectly on Supabase because Supabase provides the Deno environment.

### How to fix the IDE warnings:

1.  **Install the Deno Extension** for your IDE (e.g., [Deno for VS Code](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno)).
2.  **Enable Deno for this workspace**:
    - Press `Ctrl + Shift + P`
    - Search for `Deno: Initialize Workspace Configuration`
    - Select `Yes` to enable Deno.
3.  **Reload your IDE**.

Once Deno is enabled, the IDE will recognize the `Deno` object and the `npm:` imports correctly.
