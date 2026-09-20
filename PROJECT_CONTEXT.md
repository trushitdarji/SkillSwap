# SkillSwap — Project Context

> **Single Source of Truth for the SkillSwap Project**

---

# 1. Project Identity

**Project Name:** SkillSwap

**Project Type:** Peer-to-Peer Skill Exchange Platform

**Development Context:** College Hackathon

**Repository:**

```text
https://github.com/trushitdarji/SkillSwap
```

SkillSwap is a platform where people can exchange knowledge by teaching skills they already know and learning skills they want.

The platform is designed around a simple concept:

```text
I can teach X
        +
I want to learn Y
        ↓
Find someone who can teach Y
        +
Wants to learn X
        ↓
Skill Swap
```

The goal is to create a peer-to-peer learning ecosystem without requiring monetary transactions.

---

# 2. Problem Statement

Users should be able to:

- Create a profile
- Add skills they can offer
- Add skills they want to learn
- Specify availability
- Choose public/private profile visibility
- Discover other users
- Search users by skills
- Send skill swap requests
- Accept or reject swap requests
- Cancel pending requests
- Complete accepted swaps
- Rate and review completed swaps
- Receive notifications

Administrators should be able to:

- Manage users
- Moderate skills
- Monitor swaps
- Ban users
- Manage roles
- Send platform announcements
- Monitor activity
- Download reports

---

# 3. Technology Stack

## Frontend

- React
- Vite
- JavaScript
- JSX
- CSS

## Backend Platform

- Supabase

## Database

- PostgreSQL

## Authentication

- Supabase Auth

## Storage

- Supabase Storage

## Realtime

- Supabase Realtime

## Routing

- React Router

## Version Control

- Git
- GitHub

---

# 4. Architecture

SkillSwap uses a React frontend connected directly to Supabase services.

```text
┌─────────────────────────────┐
│       React + Vite          │
│                             │
│ Home                        │
│ Authentication              │
│ Dashboard                   │
│ Profile                     │
│ Browse                      │
│ Swap Requests               │
│ Admin Dashboard             │
└──────────────┬──────────────┘
               │
               │ Supabase JS Client
               ▼
┌─────────────────────────────┐
│          Supabase           │
│                             │
│ Supabase Auth               │
│ PostgreSQL                  │
│ Row Level Security          │
│ Storage                     │
│ Realtime                    │
└─────────────────────────────┘
```

There is currently **no separate Express/Node.js backend server** in the repository.

Supabase provides the backend services required by the application.

---

# 5. Core Application Concept

The platform revolves around two skill types:

```text
Offer
Want
```

### Offer

A skill that a user can teach.

Example:

```text
JavaScript
Photoshop
Excel
Video Editing
```

### Want

A skill that a user wants to learn.

Example:

```text
Python
UI/UX
Photography
Public Speaking
```

The Browse and matching functionality uses these relationships to help users discover compatible exchange partners.

---

# 6. User Roles

There are two primary roles:

```text
user
admin
```

## User

Normal platform member.

Can:

- Manage own profile
- Manage own skills
- Browse users
- Send swap requests
- Accept/reject incoming requests
- Cancel own pending requests
- Complete swaps
- Rate completed swaps
- Manage own notifications

## Admin

Platform administrator.

Can additionally:

- Manage users
- Manage roles
- Ban/unban users
- Moderate skills
- Monitor swaps
- Reject inappropriate pending swaps
- Send announcements
- View reports
- View activity logs
- Download CSV reports

---

# 7. Application Routes

Current application routes:

```text
/
├── /login
├── /signup
├── /dashboard
├── /profile
├── /profile/:userId
├── /browse
├── /swap-requests
└── /admin
```

### Route table

| Route              | Component        | Purpose              |
| ------------------ | ---------------- | -------------------- |
| `/`                | `Home`           | Landing page         |
| `/login`           | `Login`          | Authentication       |
| `/signup`          | `Signup`         | Registration         |
| `/dashboard`       | `Dashboard`      | User dashboard       |
| `/profile`         | `Profile`        | Own profile          |
| `/profile/:userId` | `Profile`        | Public user profile  |
| `/browse`          | `Browse`         | User/skill discovery |
| `/swap-requests`   | `SwapRequests`   | Swap management      |
| `/admin`           | `AdminDashboard` | Administration       |

`/admin` is protected using `AdminRoute`.

---

# 8. Core User Workflow

The primary user journey is:

```text
Signup
   ↓
Login
   ↓
Create / Complete Profile
   ↓
Add Offered Skills
   ↓
Add Wanted Skills
   ↓
Browse Users
   ↓
Find Compatible User
   ↓
Send Swap Request
   ↓
Receiver Accepts / Rejects
   ↓
Accepted Swap
   ↓
Both Users Confirm Completion
   ↓
Completed Swap
   ↓
Rating & Feedback
```

---

# 9. Profile Rules

Each user profile can contain:

- Full name
- Username
- Location
- Bio
- Profile photo
- Availability
- Public/private visibility
- Offered skills
- Wanted skills

### Profile visibility

A profile can be:

```text
Public
Private
```

Public profiles can appear in discovery.

Private profiles should not be exposed as public searchable profiles.

---

# 10. Skill Rules

Users can add skills as either:

```text
offer
want
```

A user can have multiple offered and wanted skills.

Duplicate combinations are prevented at the database level:

```text
user_id
+
skill_id
+
skill_type
```

must be unique.

---

# 11. Skill Moderation

Skill submissions can enter a moderation workflow.

Possible moderation states include:

```text
pending
approved
rejected
```

Administrators can review pending skills.

The purpose is to prevent inappropriate or spam skill descriptions from appearing in public discovery.

---

# 12. Matching Concept

The platform compares user skill relationships.

Example:

```text
User A

Offers:
JavaScript

Wants:
Photoshop
```

Another user:

```text
User B

Offers:
Photoshop

Wants:
JavaScript
```

These users are highly compatible because:

```text
A offers JavaScript → B wants JavaScript

B offers Photoshop → A wants Photoshop
```

The Browse system can use this relationship to generate match information.

---

# 13. Swap Request Model

A swap request contains:

```text
sender
receiver
offered skill
requested skill
message
status
created_at
```

A request is created by the sender.

The receiver can accept or reject it.

The sender can cancel it while it is pending.

---

# 14. Swap Status Rules

Valid statuses:

```text
pending
accepted
rejected
cancelled
completed
```

Allowed lifecycle:

```text
                 ┌──► rejected
                 │
pending ─────────┼──► cancelled
                 │
                 ▼
              accepted
                 │
                 ▼
             completed
```

Invalid state transitions should be prevented at the database level.

---

# 15. Swap Completion Rules

An accepted swap requires confirmation from both participants.

The database stores:

```text
sender_completed_at
receiver_completed_at
```

### Completion process

```text
Sender confirms
      ↓
sender_completed_at populated

Receiver confirms
      ↓
receiver_completed_at populated

Both populated
      ↓
status = completed
```

A swap should not become completed after only one participant confirms.

---

# 16. Rating Rules

Ratings are allowed only after a swap has been completed.

A rating contains:

- Swap request
- Reviewer
- Reviewee
- Rating
- Feedback
- Timestamp

Rating rules:

- Rating must be between 1 and 5
- Reviewer must be a swap participant
- Reviewee must be the other participant
- Reviewer cannot rate themselves
- One reviewer can submit only one rating per swap

---

# 17. Notification System

Notifications are associated with individual users.

Common notification events include:

```text
New swap request
Swap accepted
Swap rejected
Swap cancelled
Swap completed
Rating received
Platform announcement
```

Notification state includes:

```text
is_read
```

Users can mark notifications as read.

The Dashboard displays unread notification information.

---

# 18. Announcements

Platform-wide announcements use the existing notification system.

An announcement is identified using:

```text
is_announcement = true
```

Administrators can provide:

```text
title
message
```

The announcement workflow is handled through an administrative database RPC.

---

# 19. Admin Dashboard

The Admin Dashboard is a protected administrative area.

Main sections:

```text
Overview
User Management
Skill Moderation
Swap Monitoring
Platform Announcements
Reports
```

---

# 20. Admin User Management

Administrators can:

- Search users
- Filter by role
- Filter by status
- View users in pages
- Change roles
- Ban users
- Unban users

Search supports:

- Full name
- Username
- Email
- Location

---

# 21. Admin Swap Monitoring

Administrators can monitor:

```text
All
Pending
Accepted
Completed
Rejected
Cancelled
```

Pending swaps can be rejected by administrators where necessary.

---

# 22. Admin Reporting

Available reports:

### Users

User/profile information.

### Swaps

Swap participants, skills, messages and status.

### Ratings

Ratings and feedback.

### Activity

Platform activity logs.

Reports can be exported as CSV.

---

# 23. Date-Based Reporting

Admin reports support:

```text
Last 1 Day
Last 2 Days
Last 7 Days
Last 30 Days
Last 90 Days
All Time
```

Date filtering currently affects:

- Swap monitoring
- Ratings
- Activity logs

Filtering is based on:

```text
created_at
```

---

# 24. Activity Logging

Important platform events can be recorded in `activity_logs`.

Supported actions include:

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

Activity logs are mainly intended for administrative monitoring and reports.

---

# 25. Database Entities

The main application tables are:

```text
profiles
skills
user_skills
swap_requests
ratings
notifications
activity_logs
```

Relationship overview:

```text
auth.users
    │
    ▼
profiles
    │
    ├──────────────► user_skills ─────► skills
    │
    ├──────────────► swap_requests
    │                         │
    │                         ▼
    │                       ratings
    │
    ├──────────────► notifications
    │
    └──────────────► activity_logs
```

Detailed database documentation is maintained separately in:

```text
DATABASE.md
```

---

# 26. Database Security

The application uses PostgreSQL Row Level Security.

RLS is enabled on the major application tables.

The security model is based on:

- User ownership
- Profile visibility
- Authentication state
- Admin role
- Database constraints
- Foreign keys
- Security-definer functions

The frontend must never contain a Supabase service-role key.

---

# 27. Admin Security Model

Admin access is protected at multiple levels.

### Frontend

`AdminRoute.jsx` checks the current user's role.

### Database

Administrative policies/functions also verify administrator status.

This means hiding `/admin` from the frontend is not the only security layer.

---

# 28. Important Database Decisions

## Profiles linked to Auth

The `profiles.id` value corresponds to:

```text
auth.users.id
```

This provides a one-to-one relationship between authentication and application profile data.

---

## Skill deletion

Referenced skills use restrictive deletion behavior.

This prevents deleting skills that are still referenced by user skill records or swap requests.

---

## User deletion

User-dependent records generally use cascading deletion where appropriate.

This keeps orphan records from being created.

---

## Ratings

Ratings are linked to swaps and participants and are restricted to valid completed exchanges.

---

## Swap completion

Completion requires both sides to confirm.

This was intentionally chosen instead of allowing a single participant to mark the swap completed.

---

# 29. Environment Configuration

Required environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

`.env` must not be committed to GitHub.

`.env` is included in `.gitignore`.

---

# 30. Project Structure

```text
SkillSwap/
│
├── public/
│
├── src/
│   ├── components/
│   │   └── AdminRoute.jsx
│   │
│   ├── lib/
│   │   └── supabase.js
│   │
│   ├── Pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Profile.jsx
│   │   ├── Browse.jsx
│   │   ├── SwapRequests.jsx
│   │   └── AdminDashboard.jsx
│   │
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── 001_initial_schema.sql
├── DATABASE.md
├── DEVELOPMENT_LOG.md
├── PROJECT_CONTEXT.md
├── PROJECT_PLAN.md
├── README.md
├── .env.example
├── .gitignore
├── package.json
└── vite.config.js
```

---

# 31. Development Principles

The project follows these development principles:

### Functionality First

Core functionality is prioritized before visual polish.

### Incremental Development

Features are implemented in smaller functional sections instead of rewriting the entire application.

### Test After Implementation

Each major feature should be tested after implementation.

### Database-First Security

Important authorization and integrity rules should be enforced at the database level where possible.

### No Service Role in Frontend

The Supabase service-role key must never be exposed in client-side code.

### Minimal Scope During Hackathon

Only features relevant to the SkillSwap problem statement should be prioritized during the hackathon.

---

# 32. Current Implementation Status

## Completed

- React/Vite setup
- Supabase connection
- Authentication
- Protected routes
- Profiles
- Profile editing
- Profile photos
- Skills
- Skill moderation
- Browse/search
- Skill matching
- Swap requests
- Swap lifecycle
- Two-sided completion
- Ratings
- Feedback
- Notifications
- Announcements
- Realtime updates
- Admin dashboard
- User management
- Role management
- Ban/unban
- Swap monitoring
- Reports
- CSV exports
- Activity logs
- Date filtering
- RLS/security

---

# 33. Current Limitations / Future Scope

The following can be expanded in future versions:

- Google authentication
- Forgot-password workflow
- More advanced matching algorithms
- More detailed analytics
- Advanced admin controls
- More notification types
- More profile customization
- Advanced moderation tools
- Dedicated backend API layer if required
- More comprehensive automated testing

These items should not be treated as required core functionality unless explicitly added to the project scope.

---

# 34. Source of Truth Rules for Future Development

When making future changes to SkillSwap:

1. Read `PROJECT_CONTEXT.md` first.
2. Check `DATABASE.md` before modifying database-related functionality.
3. Check existing page/component implementation before creating duplicate functionality.
4. Preserve existing RLS and authorization rules.
5. Do not expose service-role credentials.
6. Do not change swap lifecycle rules without updating database logic and documentation.
7. Do not bypass database-level security with frontend-only checks.
8. Test the affected workflow after changes.
9. Update `DEVELOPMENT_LOG.md` for significant architectural or feature changes.
10. Update `README.md` when user-facing functionality changes.

---

# 35. Project Documentation Map

| File                 | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `README.md`          | Project overview and setup                     |
| `PROJECT_CONTEXT.md` | Complete project context and development rules |
| `DATABASE.md`        | Database schema and security documentation     |
| `DEVELOPMENT_LOG.md` | Development history and milestones             |
| `PROJECT_PLAN.md`    | Project planning and feature roadmap           |

---

# 36. Final Product Workflow

The complete platform can be understood as:

```text
                    SkillSwap
                        │
          ┌─────────────┴─────────────┐
          │                           │
        User                        Admin
          │                           │
          ▼                           ▼
      Profile                    Dashboard
          │                           │
          ▼                     ┌─────┼─────┐
      Add Skills                 │     │     │
          │                     Users Skills Swaps
          ▼                     │     │     │
       Browse                   └─────┼─────┘
          │                           │
          ▼                     Announcements
      Find Match                     │
          │                          ▼
          ▼                       Reports
    Swap Request                     │
          │                          ▼
    Accept/Reject               Activity Logs
          │
          ▼
     Complete Swap
          │
          ▼
     Rating & Feedback
          │
          ▼
      Notifications
```

---

# 37. Project Goal

The long-term goal of SkillSwap is to provide a simple and trustworthy environment where people can exchange knowledge with each other.

The core philosophy is:

> **Everyone knows something. Everyone can learn something.**

SkillSwap connects those two sides through a structured peer-to-peer exchange system.
