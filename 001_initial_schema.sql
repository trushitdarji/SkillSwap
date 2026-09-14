-- SkillSwap
-- 001_initial_schema.sql
-- Fresh Supabase database migration.
--
-- This migration creates:
--   profiles, skills, user_skills, swap_requests, ratings, notifications
-- plus indexes, validation triggers, admin helpers, grants, and RLS policies.
--
-- IMPORTANT:
--   Run this only against a fresh database / before these objects exist.
--   Do not put the Supabase service-role key in the frontend.

create extension if not exists pgcrypto;


-- =========================================================
-- 1. TABLES
-- =========================================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    username text not null,
    avatar_url text,
    location text,
    bio text,
    availability text,
    is_public boolean not null default true,
    role text not null default 'user'
        check (role in ('user', 'admin')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint profiles_full_name_not_blank
        check (length(btrim(full_name)) > 0),

    constraint profiles_username_format
        check (username ~ '^[A-Za-z0-9_]{3,30}$')
);


create table public.skills (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamptz not null default now(),

    constraint skills_name_not_blank
        check (length(btrim(name)) > 0),

    constraint skills_name_length
        check (length(name) <= 100),

    constraint skills_name_trimmed
        check (name = btrim(name))
);


create table public.user_skills (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null
        references public.profiles(id) on delete cascade,
    skill_id uuid not null
        references public.skills(id) on delete restrict,
    skill_type text not null
        check (skill_type in ('offer', 'want')),
    created_at timestamptz not null default now(),

    constraint user_skills_unique
        unique (user_id, skill_id, skill_type)
);


create table public.swap_requests (
    id uuid primary key default gen_random_uuid(),

    sender_id uuid not null
        references public.profiles(id) on delete cascade,

    receiver_id uuid not null
        references public.profiles(id) on delete cascade,

    offered_skill_id uuid not null
        references public.skills(id) on delete restrict,

    requested_skill_id uuid not null
        references public.skills(id) on delete restrict,

    message text,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'accepted',
                'rejected',
                'cancelled',
                'completed'
            )
        ),

    sender_completed_at timestamptz,
    receiver_completed_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint swap_requests_not_self
        check (sender_id <> receiver_id),

    constraint swap_message_length
        check (message is null or length(message) <= 2000)
);


create table public.ratings (
    id uuid primary key default gen_random_uuid(),

    swap_request_id uuid not null
        references public.swap_requests(id) on delete cascade,

    reviewer_id uuid not null
        references public.profiles(id) on delete cascade,

    reviewee_id uuid not null
        references public.profiles(id) on delete cascade,

    rating integer not null
        check (rating between 1 and 5),

    feedback text,

    created_at timestamptz not null default now(),

    constraint ratings_unique_reviewer_per_swap
        unique (swap_request_id, reviewer_id),

    constraint ratings_different_users
        check (reviewer_id <> reviewee_id),

    constraint ratings_feedback_length
        check (feedback is null or length(feedback) <= 2000)
);


create table public.notifications (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.profiles(id) on delete cascade,

    type text not null,
    title text not null,
    message text not null,

    is_read boolean not null default false,
    created_at timestamptz not null default now(),

    constraint notifications_title_not_blank
        check (length(btrim(title)) > 0),

    constraint notifications_message_not_blank
        check (length(btrim(message)) > 0)
);


-- =========================================================
-- 2. INDEXES
-- =========================================================

create unique index profiles_username_unique_idx
    on public.profiles (lower(username));

create unique index skills_name_unique_idx
    on public.skills (lower(name));

create index user_skills_user_id_idx
    on public.user_skills (user_id);

create index user_skills_skill_id_idx
    on public.user_skills (skill_id);

create index swap_requests_sender_created_idx
    on public.swap_requests (sender_id, created_at desc);

create index swap_requests_receiver_status_created_idx
    on public.swap_requests (receiver_id, status, created_at desc);

create index swap_requests_status_created_idx
    on public.swap_requests (status, created_at desc);

create index ratings_reviewee_created_idx
    on public.ratings (reviewee_id, created_at desc);

create index ratings_swap_request_idx
    on public.ratings (swap_request_id);

create index notifications_user_read_created_idx
    on public.notifications (user_id, is_read, created_at desc);

-- Prevent duplicate pending requests for the same
-- sender/receiver/skill combination.
create unique index swap_requests_pending_unique_idx
    on public.swap_requests (
        sender_id,
        receiver_id,
        offered_skill_id,
        requested_skill_id
    )
    where status = 'pending';


-- =========================================================
-- 3. UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger swap_requests_set_updated_at
before update on public.swap_requests
for each row
execute function public.set_updated_at();


-- =========================================================
-- 4. ADMIN CHECK
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;


-- =========================================================
-- 5. PROFILE SECURITY
-- =========================================================

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if new.id is distinct from old.id then
        raise exception 'Profile id cannot be changed';
    end if;

    if new.created_at is distinct from old.created_at then
        raise exception 'Profile created_at cannot be changed';
    end if;

    if new.role is distinct from old.role
       and not public.is_admin() then
        raise exception 'Only an admin can change the role';
    end if;

    return new;
end;
$$;

create trigger profiles_protect_fields
before update on public.profiles
for each row
execute function public.protect_profile_fields();


-- =========================================================
-- 6. SWAP REQUEST INSERT VALIDATION
-- =========================================================
--
-- This function is SECURITY DEFINER intentionally.
-- A sender must be able to validate the receiver's skill
-- ownership even if the receiver has a private profile.
-- The function validates data at the database boundary instead
-- of trusting the client.

create or replace function public.validate_swap_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    -- New requests always start pending.
    if new.status <> 'pending' then
        raise exception 'New swap requests must start as pending';
    end if;

    -- New requests cannot claim completion.
    if new.sender_completed_at is not null
       or new.receiver_completed_at is not null then
        raise exception 'Completion timestamps must be empty for a new request';
    end if;

    -- Sender must actually offer the offered skill.
    if not exists (
        select 1
        from public.user_skills us
        where us.user_id = new.sender_id
          and us.skill_id = new.offered_skill_id
          and us.skill_type = 'offer'
    ) then
        raise exception 'Sender does not own the offered skill';
    end if;

    -- Receiver must actually want the requested skill.
    if not exists (
        select 1
        from public.user_skills us
        where us.user_id = new.receiver_id
          and us.skill_id = new.requested_skill_id
          and us.skill_type = 'want'
    ) then
        raise exception 'Receiver does not want the requested skill';
    end if;

    return new;
end;
$$;

create trigger swap_requests_validate_insert
before insert on public.swap_requests
for each row
execute function public.validate_swap_request();


-- =========================================================
-- 7. SWAP UPDATE / LIFECYCLE SECURITY
-- =========================================================
--
-- Legal normal-user flow:
--
-- pending -> accepted     receiver only
-- pending -> rejected     receiver only
-- pending -> cancelled    sender only
-- accepted -> completed   automatic, after both confirmations
--
-- Users cannot directly set completed.
-- Completion timestamps are server-generated and cannot be
-- backdated, future-dated, cleared, or assigned to the
-- other participant.

create or replace function public.validate_swap_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    actor uuid := auth.uid();
begin
    if actor is null then
        raise exception 'Authentication required';
    end if;

    -- Participants, not arbitrary authenticated users, may update.
    if actor <> old.sender_id
       and actor <> old.receiver_id then
        raise exception 'Only swap participants can update this request';
    end if;

    -- These fields are immutable after creation.
    if new.id is distinct from old.id
       or new.sender_id is distinct from old.sender_id
       or new.receiver_id is distinct from old.receiver_id
       or new.offered_skill_id is distinct from old.offered_skill_id
       or new.requested_skill_id is distinct from old.requested_skill_id
       or new.created_at is distinct from old.created_at then
        raise exception 'Immutable swap fields cannot be changed';
    end if;

    -- -----------------------------------------------------
    -- STATUS
    -- -----------------------------------------------------

    if new.status is distinct from old.status then

        -- Receiver accepts/rejects.
        if old.status = 'pending'
           and new.status in ('accepted', 'rejected') then

            if actor <> old.receiver_id then
                raise exception 'Only the receiver can accept or reject a request';
            end if;

        -- Sender cancels.
        elsif old.status = 'pending'
              and new.status = 'cancelled' then

            if actor <> old.sender_id then
                raise exception 'Only the sender can cancel a request';
            end if;

        -- No other manual status transition is allowed.
        else
            raise exception 'Invalid swap status transition';
        end if;
    end if;

    -- A normal user cannot manually write completed.
    if new.status = 'completed'
       and old.status <> 'completed' then
        raise exception 'Completed status is set automatically after both users confirm';
    end if;

    -- -----------------------------------------------------
    -- MESSAGE
    -- -----------------------------------------------------
    --
    -- Only the sender may edit the message, and only while
    -- the request remains pending.

    if new.message is distinct from old.message then
        if actor <> old.sender_id
           or old.status <> 'pending'
           or new.status <> 'pending' then
            raise exception 'Only the sender can edit the message while the request is pending';
        end if;
    end if;

    -- -----------------------------------------------------
    -- SENDER COMPLETION
    -- -----------------------------------------------------

    if new.sender_completed_at is distinct from old.sender_completed_at then

        if actor <> old.sender_id
           or old.status <> 'accepted'
           or old.sender_completed_at is not null
           or new.sender_completed_at is null then
            raise exception 'Invalid sender completion confirmation';
        end if;

        -- Never trust a client-supplied timestamp.
        new.sender_completed_at := clock_timestamp();
    end if;

    -- -----------------------------------------------------
    -- RECEIVER COMPLETION
    -- -----------------------------------------------------

    if new.receiver_completed_at is distinct from old.receiver_completed_at then

        if actor <> old.receiver_id
           or old.status <> 'accepted'
           or old.receiver_completed_at is not null
           or new.receiver_completed_at is null then
            raise exception 'Invalid receiver completion confirmation';
        end if;

        -- Never trust a client-supplied timestamp.
        new.receiver_completed_at := clock_timestamp();
    end if;

    -- -----------------------------------------------------
    -- ACCEPTED SWAPS
    -- -----------------------------------------------------
    --
    -- Once accepted, users cannot manually change status to
    -- rejected/cancelled/etc. Completion is derived below.

    if old.status = 'accepted'
       and new.status is distinct from old.status then
        raise exception 'Accepted swaps can only become completed automatically';
    end if;

    -- -----------------------------------------------------
    -- TWO-SIDED COMPLETION
    -- -----------------------------------------------------

    if old.status = 'accepted'
       and new.sender_completed_at is not null
       and new.receiver_completed_at is not null then

        new.status := 'completed';
    end if;

    return new;
end;
$$;

create trigger swap_requests_validate_update
before update on public.swap_requests
for each row
execute function public.validate_swap_update();


-- =========================================================
-- 8. RATING VALIDATION
-- =========================================================
--
-- SECURITY DEFINER is intentional so validation can inspect
-- the completed swap regardless of the caller's normal
-- row visibility.

create or replace function public.validate_rating()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    s public.swap_requests%rowtype;
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;

    -- Normal users can only submit a rating as themselves.
    if new.reviewer_id <> auth.uid() then
        raise exception 'Reviewer must be the authenticated user';
    end if;

    select *
    into s
    from public.swap_requests
    where id = new.swap_request_id;

    if s.id is null then
        raise exception 'Swap request not found';
    end if;

    if s.status <> 'completed' then
        raise exception 'Rating is allowed only after swap completion';
    end if;

    if not (
        (
            new.reviewer_id = s.sender_id
            and new.reviewee_id = s.receiver_id
        )
        or
        (
            new.reviewer_id = s.receiver_id
            and new.reviewee_id = s.sender_id
        )
    ) then
        raise exception 'Reviewer and reviewee must be swap participants';
    end if;

    return new;
end;
$$;

create trigger ratings_validate_insert
before insert on public.ratings
for each row
execute function public.validate_rating();


-- =========================================================
-- 9. NOTIFICATION UPDATE SECURITY
-- =========================================================
--
-- Normal users may only change is_read on their own row.
-- They cannot rewrite notification ownership/content.

create or replace function public.protect_notification_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
    if not public.is_admin() then

        if new.id is distinct from old.id
           or new.user_id is distinct from old.user_id
           or new.type is distinct from old.type
           or new.title is distinct from old.title
           or new.message is distinct from old.message
           or new.created_at is distinct from old.created_at then
            raise exception 'Users can only mark their own notifications as read';
        end if;

    end if;

    return new;
end;
$$;

create trigger notifications_protect_update
before update on public.notifications
for each row
execute function public.protect_notification_update();


-- =========================================================
-- 10. ENABLE RLS
-- =========================================================

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.swap_requests enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;


-- =========================================================
-- 11. RLS POLICIES — PROFILES
-- =========================================================

create policy profiles_select
on public.profiles
for select
to authenticated
using (
    id = auth.uid()
    or is_public = true
    or public.is_admin()
);

create policy profiles_insert
on public.profiles
for insert
to authenticated
with check (
    id = auth.uid()
    and role = 'user'
);

create policy profiles_update
on public.profiles
for update
to authenticated
using (
    id = auth.uid()
    or public.is_admin()
)
with check (
    id = auth.uid()
    or public.is_admin()
);


-- =========================================================
-- 12. RLS POLICIES — SKILLS
-- =========================================================

create policy skills_select
on public.skills
for select
to authenticated
using (true);

create policy skills_insert
on public.skills
for insert
to authenticated
with check (true);


-- =========================================================
-- 13. RLS POLICIES — USER SKILLS
-- =========================================================

create policy user_skills_select
on public.user_skills
for select
to authenticated
using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
        select 1
        from public.profiles p
        where p.id = user_skills.user_id
          and p.is_public = true
    )
);

create policy user_skills_insert
on public.user_skills
for insert
to authenticated
with check (
    user_id = auth.uid()
);

create policy user_skills_delete
on public.user_skills
for delete
to authenticated
using (
    user_id = auth.uid()
    or public.is_admin()
);


-- =========================================================
-- 14. RLS POLICIES — SWAP REQUESTS
-- =========================================================

create policy swap_requests_select
on public.swap_requests
for select
to authenticated
using (
    sender_id = auth.uid()
    or receiver_id = auth.uid()
    or public.is_admin()
);

create policy swap_requests_insert
on public.swap_requests
for insert
to authenticated
with check (
    sender_id = auth.uid()
);

create policy swap_requests_update
on public.swap_requests
for update
to authenticated
using (
    sender_id = auth.uid()
    or receiver_id = auth.uid()
    or public.is_admin()
)
with check (
    sender_id = auth.uid()
    or receiver_id = auth.uid()
    or public.is_admin()
);


-- =========================================================
-- 15. RLS POLICIES — RATINGS
-- =========================================================

-- Ratings are public reputation data for authenticated users.
create policy ratings_select
on public.ratings
for select
to authenticated
using (true);

create policy ratings_insert
on public.ratings
for insert
to authenticated
with check (
    reviewer_id = auth.uid()
);


-- =========================================================
-- 16. RLS POLICIES — NOTIFICATIONS
-- =========================================================

create policy notifications_select
on public.notifications
for select
to authenticated
using (
    user_id = auth.uid()
    or public.is_admin()
);

create policy notifications_update
on public.notifications
for update
to authenticated
using (
    user_id = auth.uid()
    or public.is_admin()
)
with check (
    user_id = auth.uid()
    or public.is_admin()
);


-- =========================================================
-- 17. API ROLE GRANTS
-- =========================================================
--
-- RLS remains the actual row-level security boundary.
-- These grants allow the authenticated API role to perform
-- the operations that the policies then restrict.

grant usage on schema public to authenticated;

grant select, insert, update
on public.profiles
to authenticated;

grant select, insert
on public.skills
to authenticated;

grant select, insert, delete
on public.user_skills
to authenticated;

grant select, insert, update
on public.swap_requests
to authenticated;

grant select, insert
on public.ratings
to authenticated;

grant select, update
on public.notifications
to authenticated;


-- =========================================================
-- END OF 001_initial_schema.sql
-- =========================================================
