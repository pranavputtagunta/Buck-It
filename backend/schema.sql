create extension if not exists pgcrypto;

create table if not exists users (
    id uuid primary key,
    display_name text not null,
    location text,
    photo_url text,
    badges text[] not null default '{}',
    created_at timestamptz not null default now()
);

create table if not exists bucket_list_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    title text not null,
    deadline timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists buckets (
    id uuid primary key default gen_random_uuid(),
    creator_id uuid not null references users(id) on delete cascade,
    title text not null,
    category text not null,
    event_time timestamptz not null,
    status text not null default 'planned' check (status in ('planned', 'active', 'completed')),
    visibility text not null default 'private' check (visibility in ('private', 'shared', 'public')),
    created_at timestamptz not null default now()
);

create table if not exists bucket_members (
    id uuid primary key default gen_random_uuid(),
    bucket_id uuid not null references buckets(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    role text not null default 'member' check (role in ('creator', 'member')),
    joined_at timestamptz not null default now(),
    unique (bucket_id, user_id)
);

create table if not exists bucket_invitations (
    id uuid primary key default gen_random_uuid(),
    bucket_id uuid not null references buckets(id) on delete cascade,
    inviter_id uuid not null references users(id) on delete cascade,
    invitee_id uuid not null references users(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
    created_at timestamptz not null default now(),
    responded_at timestamptz,
    unique (bucket_id, invitee_id)
);

create table if not exists bucket_comments (
    id uuid primary key default gen_random_uuid(),
    bucket_id uuid not null references buckets(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists bucket_media (
    id uuid primary key default gen_random_uuid(),
    bucket_id uuid not null references buckets(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    media_type text not null check (media_type in ('image', 'video')),
    public_url text not null,
    storage_path text,
    caption text,
    created_at timestamptz not null default now()
);

create index if not exists idx_bucket_list_items_user_id on bucket_list_items(user_id);
create index if not exists idx_buckets_creator_id on buckets(creator_id);
create index if not exists idx_buckets_status_visibility_time on buckets(status, visibility, event_time);
create index if not exists idx_bucket_members_user_id on bucket_members(user_id);
create index if not exists idx_bucket_invitations_invitee_id on bucket_invitations(invitee_id);
create index if not exists idx_bucket_comments_bucket_id on bucket_comments(bucket_id);
create index if not exists idx_bucket_media_bucket_id on bucket_media(bucket_id);