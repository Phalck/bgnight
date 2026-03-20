# 🎲 Board Game Night

A web application for board game enthusiasts to manage their game collection, plan game nights, and track plays with friends.

**Live Demo:** https://bgnight.vercel.app

## 📋 Overview

Board Game Night is your all-in-one companion for organizing tabletop gaming sessions. Whether you're hosting a regular game night or planning a special event, this app helps you keep track of your games, suggest the perfect titles for any group, and log your plays to remember the good times.

## ✨ Features

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
- **Invite friends** - Generate shareable invites for your planned nights
- **YouTube integration** - Search for game tutorials to share with your group

### 📊 Play Tracking
- **Log plays** - Record who played what, when, and who won
- **Player management** - Track regular gaming buddies
- **Statistics** - View play history and game statistics
- **Ratings & notes** - Rate games and add personal notes

### 📈 Past BGNs Statistics
The Past BGNs page includes a comprehensive statistics panel that displays insights from all your logged game nights:

- **Top Winner** - Player with the most wins (displays "(tied)" when multiple players share the top spot)
- **Most Played Games** - Top 3 games ranked by play count
- **Busiest Game Night** - Date when you played the most games

The statistics panel is always visible alongside the filters, showing helpful placeholder messages when you haven't logged any plays yet. Statistics are calculated from all your logged plays and are not affected by the active filters, giving you a complete overview of your gaming history.

### ⚙️ Data Management
- **Backup** - Export your collection and play logs as JSON
- **Restore** - Import backups with conflict resolution
- **Account deletion** - Secure account removal with email verification

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

## 🚀 How to Use

### Getting Started
1. **Create an account** - Sign up with your email at https://bgnight.vercel.app
   - If the site is in **invite-only mode**, you will need an invite code from an administrator
   - The invite code field will appear automatically when required
2. **Import your collection** - Use the BGG import feature or add games manually
3. **Log a play** - Select a game and log your first play session with friends
4. **Start planning** - Create your first game night!

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
2. Set the date, time, and location
3. Select the number of players
4. Choose games from your collection
5. Generate an invite link to share

### Logging Plays
1. From your collection, click on a game
2. Click **Log Play**
3. Select players and winners
4. Add optional details (duration, rating, notes)
5. Save to track your gaming history

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

- `GET/POST /api/games` - Manage game collection
- `GET/POST /api/plays` - Log and retrieve plays
- `GET/POST /api/planned-nights` - Manage events
- `GET /api/backup/*` - Export data
- `POST /api/restore/*` - Import data
- `DELETE /api/delete/*` - Remove data
- `POST/DELETE /api/user/delete-request` - Account deletion

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
