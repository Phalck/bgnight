# 🎲 Board Game Night

A web application for board game enthusiasts to manage their game collection, plan game nights, and track plays with friends.

**Live Demo:** https://bgnight.vercel.app

## 📋 Overview

Board Game Night is your all-in-one companion for organizing tabletop gaming sessions. Whether you're hosting a regular game night or planning a special event, this app helps you keep track of your games, suggest the perfect titles for any group, and log your plays to remember the good times.

## ✨ Features

### 🎮 Game Collection Management
- **Import from BoardGameGeek** - Sync your BGG collection automatically
- **Manual entry** - Add games with custom details
- **Game details** - Store images, descriptions, player counts, play times, and more
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

### ⚙️ Data Management
- **Backup** - Export your collection and play logs as JSON
- **Restore** - Import backups with conflict resolution
- **Account deletion** - Secure account removal with email verification

## 🚀 How to Use

### Getting Started
1. **Create an account** - Sign up with your email at https://bgnight.vercel.app
2. **Import your collection** - Use the BGG import feature or add games manually
3. **Log a play** - Select a game and log your first play session with friends
4. **Start planning** - Create your first game night!

### Managing Your Collection

#### Adding Games
1. Go to **My Collection**
2. Click **Add Game**
3. Choose your import method:

**Option A: Search & Import from BGG (requires API key)**
- Enter your BGG username to search your collection
- Select games to import
- Optionally enrich with descriptions and images
- **Note:** Requires a Board Game Geek XML API key (see Environment Variables)

**Option B: Upload BGG CSV Export (no API key needed)**
- Export your collection as CSV from your [BGG account](https://boardgamegeek.com/collection)
- Upload the CSV file directly
- Games are imported automatically

**Option C: Manual Entry**
- Enter game details (title, players, duration, etc.)
- Upload or search for cover images
- Save to your collection

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
4. Enter your email address to receive a verification code
5. Check your email and enter the 6-digit verification code
6. Type **DELETE** to confirm the deletion
7. Click **Delete Permanently**

Your account and all associated data will be permanently removed.

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

The app is automatically deployed to Vercel on every push to the main branch.

To deploy manually:
```bash
vercel --prod
```

## 📝 License

MIT License - feel free to use this project for your own game nights!

## 🤝 Contributing

Contributions are welcome! This is a personal project, but if you'd like to suggest features or report bugs, please open an issue on GitHub.

---

Made with ❤️ for board game enthusiasts everywhere
