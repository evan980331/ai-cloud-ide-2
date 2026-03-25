# Supabase Database Schema - projects table

This table stores the AI Cloud IDE project data, including the virtual file system (VFS) state.

## projects Table

| Column | Type | Description |
| :--- | :--- | :--- |
| id | uuid | Primary Key, default: gen_random_uuid() |
| name | text | Project name |
| files | jsonb | Array of FileData objects: `[{ id, name, content, language }]` |
| created_at | timestamp with time zone | Default: now() |
| updated_at | timestamp with time zone | Default: now() |

## SQL for Table Creation

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  files jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
-- For now, allow public access for demonstration purposes
alter table public.projects enable row level security;

create policy "Allow public read" on public.projects
  for select using (true);

create policy "Allow public insert/update" on public.projects
  for all using (true) with check (true);
```
