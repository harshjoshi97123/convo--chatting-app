You are a senior full-stack developer helping build a chat application named "Convo".

We are facing two issues in our app:
1) The AI summarization feature shows: "Failed to generate summary".
2) The "Delete for Me" and "Delete for Everyone" feature is not working properly.

Your task is to fix both issues with production-level logic and safe error handling.

---------------------------------------------------
PART 1: FIX AI SUMMARIZATION FAILURE
---------------------------------------------------

Requirements:

- The summarization must NEVER return empty output.
- If the input text is too short (less than 20 characters), return the original message unchanged.
- Preserve key meaning and important details.
- Remove repetition and filler words.
- Keep the tone similar to original.
- Output ONLY the summarized text.
- Do not add explanations or extra commentary.
- If input is unclear, summarize it as best as possible instead of failing.

Also implement backend-level safety logic:

1. Validate input before calling AI.
2. If input is empty or invalid, return original text.
3. If AI response fails or is empty, return original text as fallback.
4. Ensure proper try-catch error handling.
5. Prevent app crash if AI API fails.

The feature should work for:
- Single long messages
- Conversation summaries (limit to last 100 messages)

---------------------------------------------------
PART 2: FIX DELETE FEATURE (IMPORTANT)
---------------------------------------------------

We need correct implementation of:

1) Delete for Me
2) Delete for Everyone

Do NOT hard delete messages from the database.

Use soft delete logic with this structure:

{
  messageId: "",
  senderId: "",
  receiverId: "",
  content: "",
  deletedFor: [], 
  isDeletedForEveryone: false
}

Delete for Me:
- Add current user ID to "deletedFor" array.
- When fetching messages, hide messages where userId exists in deletedFor array.

Delete for Everyone:
- Only allow if current user is the sender.
- Optionally allow within time limit (example: 10 minutes).
- Replace message content with: "This message was deleted".
- Set isDeletedForEveryone = true.
- Do NOT remove message from database.

Also:
- Emit real-time socket event after deletion.
- Update frontend state instantly.
- Ensure both users see updated message.

---------------------------------------------------

Make the solution clean, scalable, and production-ready.
Avoid breaking existing chat functionality.
Handle edge cases and errors properly.