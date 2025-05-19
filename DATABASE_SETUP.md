# GhostTools Database Setup

This guide explains how to set up and initialize the PostgreSQL database for GhostTools.

## Prerequisites

- PostgreSQL installed locally or a PostgreSQL database service (like Supabase, Neon, or Vercel Postgres)
- Node.js and npm/yarn installed

## Option 1: Local PostgreSQL Setup

### 1. Install PostgreSQL

**On macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**On Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create a Database

```bash
# Log in to PostgreSQL
psql -U postgres

# Create a database
CREATE DATABASE ghosttools;

# Create a user (optional)
CREATE USER ghosttools_user WITH ENCRYPTED PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ghosttools TO ghosttools_user;

# Exit PostgreSQL
\q
```

### 3. Configure Environment Variables

Update your `.env.local` file with your PostgreSQL connection string:

```
DATABASE_URL=postgresql://ghosttools_user:your_password@localhost:5432/ghosttools
```

## Option 2: Using Vercel Postgres

### 1. Create a Vercel Postgres Database

- Go to your Vercel dashboard
- Navigate to Storage > Create Database
- Select Postgres and create a new database
- Copy the connection string

### 2. Configure Environment Variables

Add the connection string to your `.env.local` file:

```
DATABASE_URL=your_vercel_postgres_connection_string
```

## Option 3: Using Supabase

### 1. Create a Supabase Project

- Go to [Supabase](https://supabase.com/) and sign up/in
- Create a new project
- Go to Settings > Database > Connection String > URI
- Copy the connection string (replace `[YOUR-PASSWORD]` with your database password)

### 2. Configure Environment Variables

Add the connection string to your `.env.local` file:

```
DATABASE_URL=your_supabase_connection_string
```

## Database Initialization

Once you have set up your database and configured the connection string, you can initialize the database with Prisma:

### 1. Generate Prisma Client

```bash
npx prisma generate
```

### 2. Create Database Tables

```bash
npx prisma db push
```

This command will create all the necessary tables based on your Prisma schema.

### 3. Verify Database Tables

You can verify that the tables have been created correctly using Prisma Studio:

```bash
npx prisma studio
```

This will open a web interface where you can browse your database tables.

## Database Migrations (Optional)

For a production environment, it's recommended to use migrations:

```bash
# Create a migration
npx prisma migrate dev --name init

# Apply migrations to production
npx prisma migrate deploy
```

## Troubleshooting

### Connection Issues

If you encounter connection issues, verify:

1. The database server is running
2. The connection string is correct
3. The database user has the correct permissions
4. Network/firewall settings allow connections

### Schema Changes

If you update your Prisma schema:

1. Run `npx prisma generate` to update the Prisma client
2. Run `npx prisma db push` to update the database schema

## Next Steps

After setting up the database, you should:

1. Restart your development server
2. Test user registration and login
3. Verify that user data is being stored correctly
4. Test Stripe integration with subscription and credits