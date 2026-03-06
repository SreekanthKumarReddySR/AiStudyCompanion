# Sample UI Description

The frontend consists of several pages and components:

- **Login / Signup Page**: Simple form with email/password fields, submit buttons. Redirects to dashboard on success.

- **Dashboard**: Shows list of uploaded documents, buttons to upload new study materials.

- **File Upload Component**: Drag-and-drop area or file selector. Displays progress spinner once upload initiates.

- **Chat Interface**: Chat window with messages (user and assistant bubbles). Input box at bottom for questions. Displays citations or `source` links under assistant messages.

- **Summary & Quiz Pages**: After selecting a document, user can click "Generate Summary" or "Create Quiz". Modal or new section displays results.

- **Navigation Bar**: Links to Dashboard, Chat, Profile, Logout.

- **Responsive Design**: Mobile-friendly layout using CSS framework (e.g., Material-UI or Tailwind).

Components interact with backend via `api/` service modules. State managed with React Context or Redux.
