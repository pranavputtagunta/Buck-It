create extension if not exists pgcrypto;

create table if not exists profiles (
    id uuid primary key,
    name text,
    city text default 'San Diego',
    badges text[] default '{}',
    trust_score integer default 0,
    onboarding_completed boolean default false,
    created_at timestamptz default now()
);

create table if not exists bucket_list_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    title text not null,
    category text not null,
    deadline date not null,
    motivation text,
    source text default 'manual',
    created_at timestamptz default now()
);

create table if not exists buckets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete cascade,
    bucket_list_item_id uuid references bucket_list_items(id) on delete set null,
    title text not null,
    description text,
    location_name text,
    scheduled_at timestamptz,
    state text not null default 'planned',
    created_at timestamptz default now()
);