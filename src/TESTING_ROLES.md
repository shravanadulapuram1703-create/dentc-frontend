# Testing User Roles in Dashboard

## How to Test Different User Roles

The dashboard dynamically displays welcome messages based on the logged-in user's role. To test different roles, use the following email patterns when logging in:

### Test Accounts

| Email Pattern | Role Assigned | Welcome Message | Icon |
|--------------|---------------|-----------------|------|
| `admin@example.com` | Admin | "Welcome, Admin" | Award/Trophy |
| `manager@example.com` | Manager | "Welcome, Manager" | Briefcase |
| `doctor@example.com` or `dr@example.com` | Doctor | "Welcome, Doctor" | UserCheck |
| `provider@example.com` | Provider | "Welcome, Doctor" | UserCheck |
| `desk@example.com` or `staff@example.com` | Front Desk/Staff | "Welcome" | Users |
| Any other email | Default Staff | "Welcome" | Users |

**Password:** Use any password (the mock auth accepts any credentials)

### Testing First-Time Login

To test the first-time user experience:

1. Use a **new email address** you haven't used before
2. The system will detect it's your first login
3. You'll see: **"Welcome! Let's get you started"** with a special onboarding message
4. To reset first-login status:
   - Open browser DevTools → Console
   - Run: `localStorage.clear()`
   - Refresh the page and login again

### Examples

```
✅ Admin User:
Email: admin@dental.com
Result: "Welcome, Admin - Admin User - System Administrator"

✅ Doctor:
Email: dr.smith@dental.com
Result: "Welcome, Doctor - Dr. Smith - Healthcare Provider"

✅ Manager:
Email: manager@dental.com
Result: "Welcome, Manager - Manager User - Practice Manager"

✅ Front Desk:
Email: frontdesk@dental.com
Result: "Welcome - Front Desk User - Team Member"

✅ First-Time User:
Email: newhire@dental.com (never used before)
Result: "Welcome! Let's get you started - Hello User, we're excited to have you on board"
```

## Features

✅ **Role-based personalization** - Dynamically changes welcome message based on backend user role  
✅ **First-time user detection** - Special message for new users  
✅ **Session persistence** - Welcome message remains consistent across page refreshes  
✅ **No page refresh required** - Message updates instantly when logging in with different roles  
✅ **Extensible** - Easy to add new roles without UI redesign  
✅ **Fallback handling** - Defaults to "Welcome" if role data unavailable  
✅ **Visual alignment** - Welcome banner is visually aligned with dashboard summary cards

## Architecture

- **AuthContext** (`/contexts/AuthContext.tsx`) - Manages user authentication, role assignment, and first-login tracking
- **Dashboard** (`/components/Dashboard.tsx`) - Consumes user data from AuthContext and renders dynamic welcome message
- **getWelcomeMessage()** - Pure function that maps user roles to welcome messages (easily extensible)
- **LocalStorage** - Persists user data and login history across sessions
