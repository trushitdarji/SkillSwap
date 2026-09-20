# SkillSwap Database Documentation

## Overview

SkillSwap uses **Supabase PostgreSQL** as its primary database.

The database handles:

- User profiles
- Skills
- Offered and wanted skills
- Skill moderation
- Swap requests
- Swap completion
- Ratings and feedback
- Notifications
- Platform announcements
- Activity logging
- Admin permissions
- Row Level Security (RLS)

Authentication is handled by **Supabase Auth**, while application-specific user information is stored in the `profiles` table.

---

# Database Architecture

```text
                         auth.users
                             │
                             │ 1 : 1
                             ▼
                         profiles
                             │
              ┌──────────────┼───────────────┐
              │              │               │
              ▼              ▼               ▼
         user_skills   swap_requests    notifications
              │              │
              ▼              │
           skills            │
                             ▼
                          ratings

profiles
    │
    ▼
activity_logs
```

---

# Tables

The main application tables are:

| Table           | Purpose                                     |
| --------------- | ------------------------------------------- |
| `profiles`      | Stores user profile information and roles   |
| `skills`        | Stores platform skills                      |
| `user_skills`   | Connects users with offered/wanted skills   |
| `swap_requests` | Stores skill exchange requests              |
| `ratings`       | Stores ratings and feedback                 |
| `notifications` | Stores user notifications and announcements |
| `activity_logs` | Stores platform activity for administration |

---

# 1. `profiles`

The `profiles` table stores application-level information for authenticated users.

The primary key is the same UUID used by Supabase Auth.

### Important fields

| Column              | Type        | Description                   |
| ------------------- | ----------- | ----------------------------- |
| `id`                | UUID        | References `auth.users.id`    |
| `full_name`         | TEXT        | User's full name              |
| `username`          | TEXT        | Unique username               |
| `location`          | TEXT        | Optional user location        |
| `bio`               | TEXT        | User biography                |
| `profile_photo_url` | TEXT        | Profile photo URL             |
| `availability`      | TEXT        | User availability             |
| `is_public`         | BOOLEAN     | Controls profile visibility   |
| `role`              | TEXT        | `user` or `admin`             |
| `is_banned`         | BOOLEAN     | Whether account is banned     |
| `created_at`        | TIMESTAMPTZ | Account/profile creation time |
| `updated_at`        | TIMESTAMPTZ | Last profile update           |

### Relationship

```text
auth.users.id
      │
      ▼
profiles.id
```

Foreign key:

```sql
profiles.id
REFERENCES auth.users(id)
ON DELETE CASCADE
```

If an authentication account is deleted, its profile is automatically removed.

---

# 2. `skills`

Stores the platform's available skills.

### Important fields

| Column        | Type        | Description                  |
| ------------- | ----------- | ---------------------------- |
| `id`          | UUID        | Primary key                  |
| `name`        | TEXT        | Skill name                   |
| `description` | TEXT        | Skill description            |
| `parent_id`   | UUID        | Optional parent skill        |
| `status`      | TEXT        | Skill moderation status      |
| `created_by`  | UUID        | User who submitted the skill |
| `created_at`  | TIMESTAMPTZ | Creation timestamp           |

### Skill hierarchy

Skills support optional parent-child relationships.

Example:

```text
Programming
├── JavaScript
├── Python
└── Java

Design
├── Photoshop
├── UI/UX
└── Graphic Design
```

`parent_id` references another row in the same `skills` table.

```sql
parent_id
REFERENCES public.skills(id)
ON DELETE RESTRICT
```

This prevents deleting a parent skill while child skills still depend on it.

---

# 3. `user_skills`

Connects users with skills.

A user can have multiple skills, and each skill can belong to multiple users.

This creates a many-to-many relationship:

```text
profiles
    │
    │
    ▼
user_skills
    ▲
    │
    │
  skills
```

### Important fields

| Column        | Type        | Description                     |
| ------------- | ----------- | ------------------------------- |
| `id`          | UUID        | Primary key                     |
| `user_id`     | UUID        | User owning the skill           |
| `skill_id`    | UUID        | Referenced skill                |
| `skill_type`  | TEXT        | `offer` or `want`               |
| `description` | TEXT        | User's description of the skill |
| `status`      | TEXT        | Moderation status               |
| `created_at`  | TIMESTAMPTZ | Creation timestamp              |

### Skill types

```text
offer → User can teach this skill

want → User wants to learn this skill
```

### Unique constraint

The same user cannot add the same skill with the same type more than once.

```text
(user_id, skill_id, skill_type)
```

is unique.

---

# 4. `swap_requests`

Stores skill exchange requests between users.

### Important fields

| Column                  | Type        | Description              |
| ----------------------- | ----------- | ------------------------ |
| `id`                    | UUID        | Primary key              |
| `sender_id`             | UUID        | User sending request     |
| `receiver_id`           | UUID        | User receiving request   |
| `offered_skill_id`      | UUID        | Skill sender offers      |
| `requested_skill_id`    | UUID        | Skill sender wants       |
| `message`               | TEXT        | Optional request message |
| `status`                | TEXT        | Current swap status      |
| `sender_completed_at`   | TIMESTAMPTZ | Sender completion time   |
| `receiver_completed_at` | TIMESTAMPTZ | Receiver completion time |
| `created_at`            | TIMESTAMPTZ | Request creation time    |
| `updated_at`            | TIMESTAMPTZ | Last update              |

---

# Swap Relationships

A swap request connects:

```text
Sender Profile
      │
      ├── offered_skill
      │
      ▼
  swap_requests
      ▲
      │
      ├── requested_skill
      │
      ▼
Receiver Profile
```

Foreign keys:

```text
sender_id
    → profiles.id

receiver_id
    → profiles.id

offered_skill_id
    → skills.id

requested_skill_id
    → skills.id
```

User profile deletion cascades to their swap requests.

Skills referenced by a swap use restrictive deletion behavior.

---

# Swap Status Lifecycle

The valid statuses are:

```text
pending
accepted
rejected
cancelled
completed
```

### Normal lifecycle

```text
                 ┌──────────► rejected
                 │
pending ─────────┼──────────► cancelled
                 │
                 ▼
              accepted
                 │
                 ▼
             completed
```

### Rules

A pending request can be:

- Accepted
- Rejected
- Cancelled

An accepted request can become:

- Completed

A completed request cannot return to pending.

Database-level validation is used to prevent invalid status transitions.

---

# Two-Sided Completion

SkillSwap requires both participants to confirm completion.

The swap contains:

```text
sender_completed_at
receiver_completed_at
```

### Example

```text
Sender completes
       ↓
sender_completed_at = timestamp

Receiver completes
       ↓
receiver_completed_at = timestamp

Both timestamps exist
       ↓
status = completed
```

This prevents one participant from marking the entire exchange as completed without the other participant confirming it.

---

# Duplicate Swap Prevention

The database prevents duplicate pending requests for the same exchange.

A partial unique constraint/index is used for pending requests based on:

```text
sender_id
receiver_id
offered_skill_id
requested_skill_id
```

Only one matching request can remain in `pending` state.

---

# 5. `ratings`

Stores feedback after a completed swap.

### Important fields

| Column            | Type        | Description               |
| ----------------- | ----------- | ------------------------- |
| `id`              | UUID        | Primary key               |
| `swap_request_id` | UUID        | Completed swap            |
| `reviewer_id`     | UUID        | User giving rating        |
| `reviewee_id`     | UUID        | User receiving rating     |
| `rating`          | INTEGER     | Rating from 1 to 5        |
| `feedback`        | TEXT        | Optional written feedback |
| `created_at`      | TIMESTAMPTZ | Rating timestamp          |

---

# Rating Rules

Ratings are only valid when:

1. The related swap is completed.
2. Reviewer is one of the two swap participants.
3. Reviewee is the other participant.
4. Reviewer cannot rate themselves.
5. A reviewer can submit only one rating for a swap.

Unique constraint:

```text
(swap_request_id, reviewer_id)
```

---

# Rating Relationship

```text
swap_requests
      │
      ▼
   ratings
   │     │
   ▼     ▼
reviewer reviewee
```

The rating record is automatically removed if the associated swap is deleted.

---

# 6. `notifications`

Stores notifications for users.

Notifications are also used for platform-wide announcements.

### Important fields

| Column            | Type        | Description                |
| ----------------- | ----------- | -------------------------- |
| `id`              | UUID        | Primary key                |
| `user_id`         | UUID        | Notification recipient     |
| `type`            | TEXT        | Notification type          |
| `title`           | TEXT        | Notification title         |
| `message`         | TEXT        | Notification content       |
| `is_read`         | BOOLEAN     | Read/unread state          |
| `is_announcement` | BOOLEAN     | Platform announcement flag |
| `created_at`      | TIMESTAMPTZ | Creation timestamp         |

---

# Notification Types

Notifications can represent events such as:

```text
swap_request
swap_accepted
swap_rejected
swap_cancelled
swap_completed
rating_received
announcement
```

The exact event type is stored with the notification record.

---

# Platform Announcements

Administrators can send platform-wide announcements.

Instead of maintaining a separate announcement table, announcements are stored in:

```text
notifications
```

with:

```text
is_announcement = true
```

The admin announcement RPC creates notification records for users.

---

# 7. `activity_logs`

Stores important platform activity for administrative monitoring.

### Important fields

| Column        | Type        | Description                 |
| ------------- | ----------- | --------------------------- |
| `id`          | UUID        | Primary key                 |
| `user_id`     | UUID        | User responsible for action |
| `action_type` | TEXT        | Type of activity            |
| `description` | TEXT        | Human-readable description  |
| `created_at`  | TIMESTAMPTZ | Activity timestamp          |

---

# Activity Types

Supported activity types include:

```text
user_registered
profile_updated
skill_added
skill_removed
swap_requested
swap_accepted
swap_rejected
swap_cancelled
swap_completed
rating_submitted
```

These records are primarily used by administrators for:

- Activity monitoring
- Reports
- CSV exports
- Date-based analytics

---

# Foreign Key Delete Behavior

SkillSwap uses different delete behaviors depending on the relationship.

| Relationship                       | Delete behavior |
| ---------------------------------- | --------------- |
| `profiles → auth.users`            | CASCADE         |
| `user_skills → profiles`           | CASCADE         |
| `user_skills → skills`             | RESTRICT        |
| `swap_requests → sender profile`   | CASCADE         |
| `swap_requests → receiver profile` | CASCADE         |
| `swap_requests → offered skill`    | RESTRICT        |
| `swap_requests → requested skill`  | RESTRICT        |
| `ratings → swap request`           | CASCADE         |
| `ratings → reviewer profile`       | CASCADE         |
| `ratings → reviewee profile`       | CASCADE         |
| `notifications → profile`          | CASCADE         |
| `skills → parent skill`            | RESTRICT        |
| `activity_logs → profile`          | SET NULL        |

### Reasoning

**CASCADE** is used when child data has no useful meaning without the parent.

**RESTRICT** is used for important shared entities such as skills to prevent accidental deletion of referenced data.

**SET NULL** is used for activity logs so historical administrative records can remain even if the related profile is removed.

---

# Database Constraints

The database contains validation constraints to maintain data integrity.

## Profile constraints

- Role must be `user` or `admin`
- Full name cannot be blank
- Username follows validation rules
- Username is case-insensitively unique

## Skill constraints

- Skill name cannot be blank
- Skill name has a maximum length
- Skill name is case-insensitively unique
- Parent skill relationship is protected

## User skill constraints

- Skill type must be `offer` or `want`
- Duplicate user/skill/type combinations are prevented

## Swap constraints

- Sender and receiver must be different users
- Status must be a valid swap status
- Message length is restricted
- Skill references must exist

## Rating constraints

- Rating must be between 1 and 5
- Reviewer and reviewee must be different
- Feedback length is restricted
- Duplicate ratings per reviewer/swap are prevented

## Notification constraints

- Notification title cannot be blank
- Notification message cannot be blank

---

# Indexes

Indexes are used to improve performance for common queries.

Important indexes exist for:

### `user_skills`

```text
user_id
skill_id
skill_type
```

### `swap_requests`

```text
sender_id
receiver_id
status
created_at
```

### `ratings`

```text
swap_request_id
reviewer_id
reviewee_id
```

### `notifications`

```text
user_id
created_at
```

### `activity_logs`

```text
user_id
created_at
```

Indexes are especially useful for:

- Dashboard queries
- Browse/search
- Swap filtering
- Notification retrieval
- Admin reports
- Date-range filtering

---

# Row Level Security (RLS)

Row Level Security is enabled on the application's database tables.

The purpose of RLS is to ensure that authorization is enforced at the database level rather than relying only on frontend checks.

---

# Profiles RLS

### SELECT

Authenticated users can:

- View their own profile
- View public profiles
- Administrators can access profiles required for administration

### INSERT

Users can create their own profile.

### UPDATE

Users can update their own profile.

Administrators have additional management permissions.

Normal users cannot freely modify administrative role information.

---

# Skills RLS

Authenticated users can read skills.

Skill creation/moderation is controlled through database policies and application workflow.

Normal users do not receive unrestricted administrative modification access.

---

# User Skills RLS

Users can:

- View permitted user skills
- Add their own skills
- Remove their own skills

Administrators can perform moderation-related operations.

Visibility respects profile privacy rules.

---

# Swap Requests RLS

Users can:

- View swaps where they are sender or receiver
- Create requests as themselves
- Update requests they are authorized to manage

Administrators have additional access for platform monitoring and moderation.

The database also validates legal swap status transitions.

---

# Ratings RLS

Users can:

- View ratings according to application access rules
- Insert ratings as themselves

Rating creation is restricted to valid swap participants.

Administrators have additional reporting access.

---

# Notifications RLS

Users can:

- View their own notifications
- Update their own notifications, such as marking them as read

Administrators can manage notifications required for platform announcements.

Normal users cannot insert arbitrary notifications for other users.

---

# Activity Logs RLS

Activity logs are primarily administrative records.

### SELECT

Restricted to administrators.

### INSERT

Authenticated users can create activity records only for themselves.

This prevents a user from inserting activity records on behalf of another user.

---

# Admin Security

SkillSwap uses an admin role:

```text
profiles.role
```

Valid roles:

```text
user
admin
```

Administrative access is protected at two levels:

### Frontend

`AdminRoute.jsx` checks the authenticated user's profile role before displaying the Admin Dashboard.

### Database

Database policies and security-definer functions perform admin authorization checks.

This provides database-level protection even if frontend navigation is bypassed.

---

# Admin Role Protection

Normal users cannot simply update their own profile and change:

```text
role = 'admin'
```

Role changes are protected using database-level logic.

This prevents privilege escalation through direct database requests.

---

# Security-Definer Functions

Administrative database functions use controlled security-definer behavior where required.

Security-definer functions use a controlled `search_path` to reduce the risk of object-resolution attacks.

Administrative operations verify the authenticated user's role before performing privileged actions.

---

# Admin Announcement RPC

SkillSwap uses an administrative RPC for platform announcements:

```text
create_admin_announcement(title, message)
```

The function:

1. Verifies the authenticated user is an administrator.
2. Validates the announcement title.
3. Validates the announcement message.
4. Creates announcement notifications for users.
5. Returns the number of users notified.

Direct public execution is not allowed.

Authenticated users can execute the function, but the function itself verifies administrator authorization.

---

# Storage

Supabase Storage is used for user profile photos.

Typical flow:

```text
User selects photo
       ↓
Supabase Storage
       ↓
Profile photo URL
       ↓
profiles.profile_photo_url
```

When a user replaces or removes a profile photo, the application also handles the previous stored file where applicable.

---

# Authentication Relationship

Supabase Auth manages authentication accounts.

The database does not duplicate authentication credentials.

Instead:

```text
Supabase Auth
     │
     │ auth.users.id
     ▼
profiles.id
```

This keeps authentication data separate from application profile data.

---

# Data Flow Examples

## Creating a User

```text
User signs up
     ↓
Supabase Auth creates auth.users record
     ↓
Application creates profiles record
     ↓
User can access protected application routes
```

---

## Adding a Skill

```text
User selects skill
     ↓
user_skills record created
     ↓
skill_type = offer / want
     ↓
Skill becomes part of user's profile
```

---

## Creating a Swap

```text
User discovers another profile
     ↓
Selects offered skill
     ↓
Selects requested skill
     ↓
Creates swap_requests record
     ↓
Notification generated
```

---

## Completing a Swap

```text
Accepted swap
     ↓
Sender confirms completion
     ↓
Receiver confirms completion
     ↓
Both timestamps populated
     ↓
Swap becomes completed
     ↓
Participants can submit ratings
```

---

## Rating a User

```text
Completed swap
     ↓
Reviewer submits rating
     ↓
Database validates reviewer
     ↓
Rating stored
     ↓
Reviewee receives rating/feedback
```

---

# Date-Based Reporting

The Admin Dashboard supports date-based reporting.

The frontend calculates a start date based on the selected range:

```text
1 day
2 days
7 days
30 days
90 days
All time
```

For time-based reporting queries, records are filtered using their `created_at` timestamp.

This currently applies to:

- Swap monitoring
- Ratings reports
- Activity logs

---

# Database Integrity Principles

SkillSwap follows these principles:

### 1. Database-level validation

Important rules are enforced using PostgreSQL constraints rather than relying only on frontend validation.

### 2. Ownership checks

Users can only manipulate resources they are authorized to control.

### 3. Referential integrity

Foreign keys prevent invalid references.

### 4. Controlled deletion

Different foreign-key delete behaviors are used depending on the importance of the relationship.

### 5. Least privilege

RLS policies restrict users to the minimum data access required for normal operations.

### 6. Admin separation

Administrative actions require explicit admin authorization.

### 7. Secure privileged functions

Security-definer functions validate authorization and use controlled execution settings.

---

# Database Migration

The database schema is maintained through SQL migration files in the repository.

The main schema migration contains:

- Tables
- Foreign keys
- Constraints
- Indexes
- RLS policies
- Functions
- Triggers
- Security rules

Before deploying the application, the required SQL migrations should be executed against the Supabase PostgreSQL database.

---

# Database Summary

SkillSwap's database is designed around seven core application entities:

```text
profiles
skills
user_skills
swap_requests
ratings
notifications
activity_logs
```

Together they support the complete platform workflow:

```text
Authentication
      ↓
User Profile
      ↓
Skills Offered / Wanted
      ↓
Browse & Match
      ↓
Swap Request
      ↓
Accept / Reject / Cancel
      ↓
Two-Sided Completion
      ↓
Rating & Feedback
      ↓
Notifications
      ↓
Admin Monitoring & Reports
```

The database combines **PostgreSQL relational integrity, Supabase Auth, RLS, database constraints, indexes, triggers, and controlled administrative functions** to provide the backend foundation for SkillSwap.
