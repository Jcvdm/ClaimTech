# Supabase Database Setup

## Running Migrations

### Option 1: Using Supabase Dashboard (Recommended for now)

1. Go to your Supabase project: https://cfblmkzleqtvtfxujikf.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `migrations/001_initial_schema.sql`
5. Click **Run** to execute the migration
6. (Optional) Copy and paste the contents of `seed.sql` to add sample data
7. Click **Run** to execute the seed data

### Option 2: Using Supabase CLI (For production)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref cfblmkzleqtvtfxujikf
   ```

4. Push migrations:
   ```bash
   supabase db push
   ```

5. (Optional) Run seed data:
   ```bash
   supabase db reset --db-url "your-database-url"
   ```

## Database Schema

### Tables

1. **clients** - Insurance and private clients
2. **requests** - Vehicle damage assessment requests
3. **request_tasks** - Tasks associated with requests
4. **engineers** - Loss adjusters/engineers

### Relationships

- `requests.client_id` → `clients.id`
- `requests.assigned_engineer_id` → `engineers.id`
- `request_tasks.request_id` → `requests.id`
- `request_tasks.assigned_to` → `engineers.id`

## Row Level Security (RLS)

Currently, all tables have permissive policies for development:
- All operations allowed for all users

**TODO**: Tighten RLS policies when authentication is implemented.

## Sample Data

The `seed.sql` file includes:
- 5 sample clients (3 insurance, 2 private)
- 3 sample engineers
- 3 sample requests with various statuses
- 4 sample tasks

This data is useful for development and testing.

