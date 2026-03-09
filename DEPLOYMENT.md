# Deployment Guide - Vercel + Neon

This guide will walk you through deploying the Board Game Night app to Vercel with Neon PostgreSQL.

## Prerequisites

- A [Vercel](https://vercel.com) account (free)
- A [Neon](https://neon.tech) account (free tier available)
- [Vercel CLI](https://vercel.com/docs/cli) installed locally (optional)

## Step 1: Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up/login
2. Click **"Create a project"**
3. Name your project (e.g., "bgnight")
4. Choose a region close to your users (e.g., "US East (N. Virginia)")
5. Click **"Create Project"**
6. Copy the connection string shown (starts with `postgresql://`)

## Optional: Set Up BoardGameGeek API Token

To enable automatic game data import from BoardGameGeek:

1. Go to [boardgamegeek.com/applications](https://boardgamegeek.com/applications)
2. Register a new application (free for personal use)
3. Copy your API token
4. You'll add this to your environment variables in Step 3

**Note:** Without the BGG API token, the app will show "BGG integration coming soon" and you'll need to enter game data manually.

## Step 2: Prepare Your Local Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Neon connection string:
   ```bash
   DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"
   ```

3. Run database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from project directory:
   ```bash
   cd bgnight
   vercel
   ```

4. Follow the prompts to configure your project

5. Set environment variables:
   ```bash
   vercel env add DATABASE_URL
   # Paste your Neon connection string
   
   vercel env add NEXTAUTH_SECRET
   # Generate with: openssl rand -base64 32
   
   vercel env add NEXTAUTH_URL
   # Will be your deployed URL (e.g., https://bgnight.vercel.app)
   
    vercel env add YOUTUBE_API_KEY
    # Your YouTube API key (optional)
    
    vercel env add BGG_API_TOKEN
    # Your BoardGameGeek API token (optional, for automatic game data import)
    # Get it at: https://boardgamegeek.com/applications
    ```

6. Redeploy to apply environment variables:
   ```bash
   vercel --prod
   ```

### Option B: Using Vercel Web Interface

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository (or drag & drop your project folder)
3. Configure build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `.next`
4. Add environment variables in the dashboard:
   - `DATABASE_URL` (Neon connection string)
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (your deployment URL)
   - `YOUTUBE_API_KEY` (optional, for video search)
   - `BGG_API_TOKEN` (optional, for automatic game data import from BoardGameGeek)
5. Click **Deploy**

## Step 4: Verify Deployment

1. Visit your deployed URL
2. Register a new account
3. Import your game collection
4. Test all features

## Troubleshooting

### Database Connection Issues

- Ensure your Neon connection string includes `?sslmode=require`
- Check that the database user has proper permissions
- Verify the database is in the correct region

### Build Failures

- Check Vercel logs for specific errors
- Ensure all environment variables are set
- Verify `prisma/schema.prisma` uses `postgresql` provider

### Migration Failures

If migrations fail on Vercel:
1. Run migrations locally first
2. Push schema to Neon: `npx prisma db push`
3. Redeploy

## Updating Your Deployment

After making changes:

```bash
# If using Git
 git add .
 git commit -m "Update description"
 git push
# Vercel will auto-deploy

# If using CLI
vercel --prod
```

## Local Development with Neon

You can use your Neon database for local development too:

```bash
# .env.local
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
```

Or keep SQLite for local development and PostgreSQL for production.

## Important Notes

1. **Neon Free Tier**: Includes 500MB storage - plenty for personal use
2. **Serverless Cold Starts**: First request after idle may be slower
3. **Data Persistence**: Unlike SQLite, your data is safely stored in Neon
4. **Backups**: Neon automatically backs up your database