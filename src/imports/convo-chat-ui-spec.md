Design a modern chat application interface called "Convo".

Remove all AI Copilot features such as:
- Summarize
- Rewrite
- Tone Check
- Task Extraction
- Follow-up suggestions

Do not include any AI buttons or AI panels in the interface.

Create a clean messaging interface with the following layout.

------------------------------------------------

1. Main Layout

Divide the screen into two sections:

Left Sidebar:
- User profile icon at the top
- Search bar
- Scrollable chat list
- Button to start new chat

Main Chat Area:
- Chat header with contact name and profile picture
- Scrollable chat messages
- Message input bar fixed at the bottom

Ensure long messages wrap properly and the chat area scrolls smoothly.

------------------------------------------------

2. Fix Profile Picture Display

There is currently an issue where the uploaded profile image does not appear inside the circular avatar while chatting.

Fix this by ensuring:

- The uploaded profile picture from the user profile settings appears correctly in the circular avatar.
- The same profile image should appear in:
  • Sidebar profile icon
  • Chat header avatar
  • Message bubble avatar
- The avatar should always be displayed as a circular image.
- If no profile picture is uploaded, show a default placeholder avatar.
- Ensure the image fits correctly inside the circle without stretching or overflow.

------------------------------------------------

3. Add New Features

Scheduled Messages:
Allow users to schedule messages. Show a small clock icon (⏰) and label "Scheduled" on the message bubble.

Message Reminders:
Allow users to set a reminder on a message. Long pressing a message should show an option "Remind Me Later".

Conversation Highlights:
Users can mark messages as important using a star icon (⭐). Create a highlights section where starred messages can be viewed.

Conversation Timeline:
Add a timeline icon in the chat header.

Clicking the timeline icon should open a panel showing important chat events such as:
- Highlighted messages
- Scheduled messages
- Shared files

------------------------------------------------

4. Dark Mode Support

Add a dark mode theme for the entire application.

Include:
- A toggle switch in settings to change between Light Mode and Dark Mode.
- Dark background colors for sidebar and chat area.
- High contrast text for readability.
- Dark styled message bubbles.
- Subtle shadows and modern dark UI styling.
- Consistent design between light and dark themes.

------------------------------------------------

5. UI Style

Use a modern SaaS style:
- Clean layout
- Rounded message bubbles
- Soft shadows
- Balanced spacing
- Minimal and organized interface

------------------------------------------------

6. Usability

Ensure:
- Sidebar chat list scrolls
- Chat messages scroll smoothly
- Message input stays fixed at the bottom
- Layout looks organized and professional

Focus on creating a polished prototype experience rather than backend functionality.