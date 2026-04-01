# 🎲 Board Game Night

A web application for board game enthusiasts to manage their game collection, plan game nights, and track plays with friends.

**Live Demo:** https://bgnight.vercel.app

## 📋 Overview

Board Game Night is your all-in-one companion for organizing tabletop gaming sessions. Whether you're hosting a regular game night or planning a special event, this app helps you keep track of your games, suggest the perfect titles for any group, and log your plays to remember the good times.

## ✨ Features

### 🔔 Inbox System
Receive automatic invitations when you're added to board game nights:
- **Real-time notifications** - Bell icon with unread badge and animations
- **Automatic invitations** - Sent when linked players are added to planned nights
- **RSVP countdown** - Dynamic expiration timer on invitations
- **Full inbox management** - Mark read, delete, filter messages
- **Auto-cleanup** - Messages removed 24 hours after event date

### 👤 Player Linking & Profile Settings
- **Link players to users** - Connect players to registered accounts
- **Profile privacy controls** - Choose who can link to you and see your email
- **Visual indicators** - 👤 symbol shows linked players in selectors
- **Bidirectional unlinking** - Both owner and linked user can unlink

### 🎮 Game Collection Management
- **Import from BoardGameGeek** - Sync your BGG collection automatically
- **Bulk Update from BGG** - Refresh all games with latest BGG data (weight, rating, descriptions)
- **Manual entry** - Add games with custom details
- **Game details** - Store images, descriptions, player counts, play times, weight, BGG rating, and more
- **Visual indicators** - See game weight (⚖️) and BGG rating (⭐) on game cards
- **Search & filter** - Quickly find games in your collection

### 📅 Game Night Planning
- **Create events** - Plan game nights with date, time, and location
- **Game selection** - Choose from your collection based on player count and preferences
- **Edit planned nights** - Add/remove games and players, change event details
- **Cancel events** - Remove planned game nights with one click
- **Invite friends** - Generate shareable invites for your planned nights
- **Invite link management** - Generate, regenerate, or disable invite links with expiration times (4h, 8h, 24h, 48h)
- **YouTube integration** - Search for game tutorials to share with your group

### 📧 Invite System & RSVP
- **Public invite pages** - Players can RSVP (Coming/Maybe/Not Coming) without logging in
- **Game voting** - Invitees can vote on which games they want to play
- **Real-time responses** - View who has responded and their game preferences
- **Vote tracking** - See vote counts and voter names for each game
- **RSVP statistics** - Track responses: Coming, Maybe, Not Coming, No Response

### 🌐 Community BGNs
- **Browse all events** - Public page showing game nights from all users (no login required)
- **Filter by organizer** - View events by specific organizers
- **Date filtering** - Filter by Today, This Week, This Month, or All dates
- **Event discovery** - Find upcoming board game nights in your community
- **Read-only view** - See event details, games, and RSVP counts without needing an account
- **Your Event badge** - Your own planned nights are highlighted with a special badge so you can easily spot them

### 📊 Play Tracking
- **Log plays** - Record who played what, when, and who won
- **Player management** - Track regular gaming buddies
- **Statistics** - View play history and game statistics
- **Ratings & notes** - Rate games and add personal notes

### 📈 My Past BGNs Statistics
The My Past BGNs page includes a comprehensive statistics panel that displays insights from all your logged game nights:

- **Top Winner** - Player with the most wins (displays "(tied)" when multiple players share the top spot)
- **Most Played Games** - Top 3 games ranked by play count
- **Busiest Game Night** - Date when you played the most games

The statistics panel is always visible alongside the filters, showing helpful placeholder messages when you haven't logged any plays yet. Statistics are calculated from all your logged plays and are not affected by the active filters, giving you a complete overview of your gaming history.

### ⚙️ Data Management
- **Backup** - Export your collection and play logs as JSON
- **Restore** - Import backups with conflict resolution
- **Account deletion** - Secure account removal with email verification

### 👤 Profile Settings & Player Management
- **Profile Settings** - Control your visibility and privacy preferences:
  - **Allow Player Linking** - Let others link their players to your account
  - **Show Email in Search** - Display your email when others search for users to link
- **Manage Players** - Full player management with linking capabilities:
  - **Add Players** - Create new players for your game nights
  - **Edit Names** - Update player names anytime
  - **Link to Users** - Connect players to registered user accounts (if they allow it)
  - **Unlink Players** - Both the player owner and linked user can unlink
  - **View Stats** - See game and win counts for each player
  - **Delete Players** - Soft delete with confirmation
- **Linked Player Indicator** - Players linked to users show a 👤 symbol in selectors

### 📬 Inbox System
Receive and manage board game night invitations directly in the app:
- **Automatic Invitations** - When you're added as a linked player to a BGN, you receive an inbox message
- **Real-Time Notifications** - Bell icon in header shows unread count and animates on new messages
- **Toast Notifications** - Instant alerts when new invitations arrive (5 second display)
- **Polling** - Checks for new messages every 30 seconds
- **Message Details**:
  - Event date, time, and location
  - Sender name
  - Dynamic RSVP expiration countdown
  - Direct RSVP link button
- **Inbox Dropdown** - Quick access to 5 most recent messages from the header bell
- **Full Inbox Page** (`/inbox`) - View all messages with filters:
  - **All Messages** - Complete message history
  - **Unread** - Filter to see only unread messages
  - **Mark All Read** - One-click to mark everything as read
  - **Delete All** - Remove all messages at once
- **Message Actions** - Mark as read, delete individual messages
- **Auto-Cleanup** - Messages automatically deleted 24 hours after the event date
- **Privacy** - Only users who have enabled "Allow Player Linking" in their profile can receive inbox invitations

### 👑 Admin Panel (Admin Users Only)
The first user to register automatically becomes an admin and gains access to the admin panel at `/admin`.

**Admin Features:**
- **Dashboard** - View site statistics including total users, games, plays, and user growth charts
- **User Management** - Manage all users: reset passwords, enable/disable accounts, toggle admin roles, delete users
- **Site Settings** - Control registration settings (open/closed, invite-only mode)
- **Invite Codes** - Generate and manage invite codes for invite-only registration

**Accessing Admin Panel:**
1. Log in as an admin user
2. Click **Settings** (⚙️) in the header
3. Select **👑 Admin Panel** from the dropdown menu

## 🆕 Recent Updates

- **Settings Menu Consolidation** - Moved the Logout button from the header to the Settings menu dropdown for a cleaner navigation experience
- **Unlink Button Fix** - Updated the Unlink button icon on the Manage Players page to show only the remove icon (❌) instead of a link icon

## 🚀 How to Use

### Getting Started
1. **Browse Community BGNs** - Visit the landing page and click "Browse upcoming board game nights" to see events from all users (no login required!)
2. **Create an account** - Sign up with your email at https://bgnight.vercel.app
   - If the site is in **invite-only mode**, you will need an invite code from an administrator
   - The invite code field will appear automatically when required
3. **Import your collection** - Use the BGG import feature or add games manually
4. **Log a play** - Select a game and log your first play session with friends
5. **Start planning** - Create your first game night!

### Managing Your Collection

#### Adding Games
1. Go to **My Collection**
2. Click **Add Game**
3. Choose your import method:

**Option A: Search & Import from BGG (requires API key)**
- Enter game title to search BGG
- Select from matching results with preview
- Automatically imports: title, description, player count, play time, weight, rating, mechanics, categories
- **Note:** Requires a Board Game Geek XML API key (see Environment Variables)

**Option B: Upload BGG CSV Export (no API key needed)**
- Export your collection as CSV from your [BGG account](https://boardgamegeek.com/collection)
- Upload the CSV file directly
- Games are imported automatically

**Option C: Manual Entry**
- Enter game details (title, players, duration, weight, rating, etc.)
- Upload or search for cover images
- Save to your collection

#### Bulk Update from BGG
Keep your entire collection up-to-date with the latest BoardGameGeek data:

1. Go to **Settings** → **Bulk Update from BGG**
2. Review the preview showing how many games will be updated
3. Choose handling for manually-edited games:
   - **Overwrite all** - Update everything without prompts
   - **Ask for approval** - Pause and confirm for games you've manually edited
4. Choose retry strategy for failed updates:
   - **Retry automatically** - Wait 30 seconds and retry (up to 3 times)
   - **Skip and list** - Skip failed games and show list at end
5. If manual approval required, select which games to update
6. Monitor progress - you can leave the page and get notified when done
7. Review changes with visual diff (strikethrough old values, highlighted new)
8. Retry any failed games immediately or export a JSON report

**Features:**
- **Smart matching** - Games with BGG IDs auto-match; others are searched
- **Progress persistence** - Resume if you close the browser
- **Visual comparison** - See exactly what changed for each game
- **Rate limiting** - Respects BGG API limits with built-in delays
- **One session per user** - Prevents duplicate updates

### Game Card Display
Game cards show at-a-glance information:
- **Top row:** Thumbnail, Title, Designer
- **Badges row:** Players | Play Time | Weight ⚖️ | Rating ⭐ | Log Play
- **Details:** Mechanics, Categories, Rank (if available)

The **weight** (complexity) and **BGG rating** are imported from BoardGameGeek and displayed as compact badges on the game card.

### Planning a Game Night
1. Go to **Plan BGN**
2. Select games from your collection
3. Set the date, time, and location
4. Choose players to invite (👤 indicates linked players who will receive inbox notifications)
5. Select invite link expiration (4h, 8h, 24h, or 48h)
6. Click **Save & Close** - the invite link is automatically copied to your clipboard!
7. **Automatic inbox invitations** are sent to all linked players

### Managing Your Planned Game Nights
1. Go to **My Planned BGNs** to view all your events
2. **Edit** (✏️) - Modify games, players, or event details
3. **Cancel** - Delete a planned night
4. **Copy Invite** (✉️) - Copy the invite text with link to clipboard
5. **Invite Link Manager** - View link status, copy, regenerate, or disable links
6. **RSVP Tracking** - See who is coming, maybe coming, not coming, or hasn't responded
7. **Game Votes** - View vote counts and who voted for each game

### Sending Invites to Players
When you save a game night, the full invite text is automatically copied to your clipboard, including:
- Event date, time, and location
- List of games with player counts and durations
- YouTube tutorial links (if selected)
- RSVP link for players to respond and vote

Players can:
- Select their name from the dropdown
- RSVP (Coming/Maybe/Not Coming)
- Vote on games they're interested in playing
- View other players' responses and votes

### Browsing Community BGNs
1. Go to **Community BGNs** in the navigation (or click "Browse upcoming board game nights" on the homepage)
2. Browse upcoming game nights from all users
3. Filter by organizer or date range (Today, This Week, This Month)
4. **Your events** are highlighted with a "Your Event" badge and gold border
5. View event details, games, and RSVP statistics (read-only)

**Note:** Community BGNs is a read-only view. To RSVP or vote on games, you need to use the invite link sent by the organizer.

### Player Linking and Inbox Invitations
The app supports linking players to user accounts for automatic invitation delivery:

#### Setting Up Player Linking
**For the inviter:**
1. Go to **Settings** → **Manage Players**
2. Click **Add Player** to create players for your game nights
3. Click the **🔗 Link** button next to a player
4. Search for users who have enabled "Allow Player Linking" in their profile
5. Select the user to link

**For users who want to receive invitations:**
1. Go to **Settings** → **Profile**
2. Enable **"Allow others to add you as a player"**
3. Optionally enable **"Show email in search"** to help others identify you
4. Save your settings

#### How Inbox Invitations Work
When you plan a game night and select linked players:
1. Create a game night at **Plan BGN**
2. Select players (those with 👤 are linked to users)
3. Save the planned night
4. **Automatic invitations** are sent to all linked players' inboxes
5. Recipients get:
   - Real-time toast notification (if online)
   - Inbox message with event details and RSVP countdown
   - Direct link to RSVP page

#### Managing Your Inbox
- **Bell Icon** - Click the 🔔 in the header to see 5 most recent messages
- **Unread Badge** - Red circle shows count of unread messages
- **New Message Animation** - Bell pulses when new invitations arrive
- **View All** - Click "View All Messages" to go to the full inbox page
- **Filters** - Switch between "All Messages" and "Unread"
- **Actions** - Mark as read, delete messages, or RSVP directly

### Logging Plays
1. From your collection, click on a game
2. Click **Log Play**
3. Select players (👤 indicates linked users)
4. Select winners
5. Add optional details (duration, rating, notes)
6. Save to track your gaming history

### Backup & Restore
1. Click **Settings** (⚙️) in the header
2. Choose **Backup Collection** or **Backup Logged Plays**
3. Download the JSON file

To restore:
1. Click **Settings**
2. Choose **Restore Collection** or **Restore Logged Plays**
3. Upload your backup JSON file
4. Resolve any conflicts (Skip, Replace, or Keep Both)

### Delete Your Account
**⚠️ Warning:** This action is permanent and cannot be undone. All your data including games, plays, and planned nights will be deleted.

1. Click **Settings** (⚙️) in the header
2. Go to the **Danger Zone** section
3. Click **Remove User Account**
4. Type **DELETE** to confirm the deletion
5. Click **Delete Permanently**

Your account and all associated data will be permanently removed, and you will be automatically logged out.

### 👑 Admin Features

**Note:** Admin features are only available to users with the ADMIN role. The first user to register on the site automatically becomes an admin.

#### Managing Users
1. Go to **Admin Panel** → **Users**
2. View all registered users with search and filter options
3. Available actions for each user:
   - **👑 Toggle Admin** - Promote/demote user to/from admin role
   - **✅/🚫 Enable/Disable** - Activate or deactivate user account
   - **🔑 Reset Password** - Reset user's password to "ChangeMe123!" (user must change on next login)
   - **🗑️ Delete** - Permanently delete user and all their data

#### Site Settings
1. Go to **Admin Panel** → **Settings**
2. Configure registration options:
   - **Allow Registration** - Enable/disable new user registrations
   - **Invite-Only Mode** - Require invite codes for registration (must enable registration first)

#### Invite Codes
1. Go to **Admin Panel** → **Invite Codes**
2. Generate new invite codes:
   - Select number of codes to generate (1-50)
   - Optional: Set expiration date
   - Click "Generate Codes"
3. Copy codes and share with invited users
4. Monitor usage: View which codes have been used and when
5. Delete codes that are no longer needed

#### Site Statistics
The admin dashboard displays:
- **Total Users** - Overall user count
- **Active Users** - Users with active accounts
- **New This Month/Week** - Recent registrations
- **Total Games** - Games across all users
- **Total Plays** - Logged plays across all users
- **Active Invite Codes** - Available unused codes
- **User Growth Chart** - 6-month registration trend

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) with App Router
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **Authentication:** NextAuth.js with credentials provider
- **Styling:** CSS Modules
- **Deployment:** Vercel
- **External APIs:** 
  - BoardGameGeek XML API
  - YouTube Data API
  - Google Custom Search API

## 🏗️ Project Structure

```
/src
  /app                 # Next.js app router pages
    /api              # API routes (REST endpoints)
    /collection       # Game collection page
    /plan             # Game night planning
    /planned-nights   # View planned events
    /plays            # Play history
    ...
  /components          # React components
  /lib                # Utility functions & API clients
  /types              # TypeScript type definitions
/prisma               # Database schema & migrations
```

## 📝 API Routes

### Authenticated Routes
- `GET/POST /api/games` - Manage game collection
- `GET/POST /api/plays` - Log and retrieve plays
- `GET/POST /api/planned-nights` - Manage events
- `POST/PATCH/DELETE /api/planned-nights/[id]/invite` - Manage invite links
- `GET /api/backup/*` - Export data
- `POST /api/restore/*` - Import data
- `DELETE /api/delete/*` - Remove data
- `POST/DELETE /api/user/delete-request` - Account deletion

### Public Routes (No Authentication Required)
- `GET /api/public/planned-nights` - Browse all upcoming game nights
- `GET /api/invite/[token]` - View public invite page data
- `POST /api/invite/[token]/rsvp` - Submit RSVP response
- `POST /api/invite/[token]/vote` - Vote on games

### Inbox Routes
- `GET /api/inbox` - List inbox messages with dynamic RSVP expiration
- `GET /api/inbox/unread-count` - Get unread message count (for badge)
- `PATCH /api/inbox/[id]/read` - Mark message as read
- `PATCH /api/inbox/read-all` - Mark all messages as read
- `DELETE /api/inbox/[id]` - Delete message

### User & Player Routes
- `GET/PUT /api/user/profile` - Get/update profile settings (player linking, email visibility)
- `GET /api/users/search` - Search users who allow player linking
- `GET/POST /api/players` - List/create players
- `PUT/DELETE /api/players/[id]` - Update/delete player
- `PUT/DELETE /api/players/[id]/link` - Link/unlink player to user

## 🔐 Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Board Game Geek API (Optional - only needed for BGG search/import)
BGG_API_KEY="your-bgg-api-key"

# APIs (optional - for image search and YouTube)
GOOGLE_API_KEY="..."
GOOGLE_CX="..."
YOUTUBE_API_KEY="..."
```

**Getting a BGG API Key:**
- Visit [BoardGameGeek API](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
- Sign in to your BGG account
- Request an API key from the API documentation
- **Note:** Only required if you want to search and import directly from BGG. CSV upload works without an API key.

**Getting a Google API Key (for image search):**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **API Key**
5. Enable the **Custom Search API** for your project
6. Create a Custom Search Engine at [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
7. Copy your **Search Engine ID** (this is your `GOOGLE_CX` value)
- **Note:** Required for searching game images from Google

**Getting a YouTube API Key (for video search):**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Library**
4. Search for **YouTube Data API v3** and enable it
5. Go to **APIs & Services** → **Credentials**
6. Click **Create Credentials** → **API Key**
7. Copy the generated API key
- **Note:** Required for searching YouTube videos and tutorials for games

## 🚦 Development

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev

# Run development server
npm run dev

# Build for production
npm run build
```

## 🌐 Deployment

For detailed deployment instructions, including how to set up your own instance of Board Game Night on Vercel with all required services and environment variables, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## 📝 License

MIT License - feel free to use this project for your own game nights!

## 🤝 Contributing

Contributions are welcome! This is a personal project, but if you'd like to suggest features or report bugs, please open an issue on GitHub.

---

Made with ❤️ for board game enthusiasts everywhere
