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
3. **Add players** - Create profiles for your regular gaming group
4. **Start planning** - Create your first game night!

### Managing Your Collection

#### Import from BoardGameGeek
**Note:** A Board Game Geek (BGG) XML API key is required for importing your collection.

1. **Get your BGG API key** - Visit [BoardGameGeek API](https://boardgamegeek.com/wiki/page/BGG_XML_API2) and sign in to obtain your API credentials
2. Go to **My Collection** in the app
3. Click **Import from BGG**
4. Enter your BGG username
5. Select which games to import
6. Optionally enrich with descriptions and images

#### Add Games Manually
1. Click **Add Game**
2. Enter game details (title, players, duration, etc.)
3. Upload or search for cover images
4. Save to your collection

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

# Board Game Geek API (Required for BGG collection import)
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
- The BGG XML API is rate-limited, so be mindful of usage

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
