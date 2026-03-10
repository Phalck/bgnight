#!/bin/bash

echo "This will delete ALL data from your database!"
echo "Are you sure you want to continue? (yes/no)"
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo "Connecting to database and truncating all tables..."

# Get database URL from Vercel environment
DB_URL=$(vercel env get DATABASE_URL 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo "Could not get DATABASE_URL from Vercel."
    echo "Please run this command manually on your local machine with your DATABASE_URL:"
    echo ""
    echo "psql \"YOUR_DATABASE_URL\" -c \"TRUNCATE TABLE \"User\", \"Game\", \"Player\", \"PlayLog\", \"PlannedGameNight\", \"PlannedGame\", \"SiteSettings\", \"InviteCode\" CASCADE;\""
    echo ""
    echo "Or use Prisma Studio to manually delete records."
    exit 1
fi

echo "Database reset complete! You can now register a new user who will become the admin."