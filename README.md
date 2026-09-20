# 🔄 SkillSwap

> **Share Your Skills. Learn Something New.**

SkillSwap is a peer-to-peer skill exchange platform that allows users to **teach the skills they know and learn the skills they want**, without any monetary exchange.

The platform helps users discover compatible skill partners, send and manage swap requests, complete exchanges, provide ratings and feedback, and receive notifications about important platform activity.

It also includes an **Admin Dashboard** for user management, skill moderation, swap monitoring, announcements, activity tracking, and downloadable reports.

---

## 🎯 Problem Statement

Many people have valuable skills they can teach but may not have access to the skills they want to learn.

SkillSwap solves this by creating a platform where users can:

- List skills they can offer
- List skills they want to learn
- Discover other users based on skill compatibility
- Send skill swap requests
- Accept, reject, or cancel requests
- Complete swaps collaboratively
- Rate and review completed swaps

The goal is to make learning more accessible through **peer-to-peer knowledge exchange**.

---

# ✨ Key Features

## 🔐 1. Authentication

SkillSwap provides secure user authentication using Supabase Auth.

### Features

- User registration
- Email/password login
- Password validation
- Email format validation
- Duplicate account handling
- Session-based authentication
- Logout
- Protected application routes
- Banned-user login prevention
- Automatic profile creation after registration

New users receive a profile connected to their Supabase Auth account.

---

## 👤 2. User Profiles

Users can create and manage their SkillSwap profile.

### Profile information

- Full name
- Username
- Profile photo
- Location
- Bio
- Availability
- Public/private profile visibility

### Profile functionality

- Edit profile information
- Upload profile photo
- Replace existing profile photo
- Remove old profile photo from storage
- Add skills
- Remove skills
- Choose whether a skill is:
  - Offered
  - Wanted

- Add descriptions to skills
- View public profiles
- View another user's profile

---

## 🧠 3. Skill Management

Users can maintain two types of skills:

### Skills Offered

Skills that the user can teach other people.

Examples:

- JavaScript
- Photoshop
- Excel
- Photography
- Graphic Design
- Video Editing
- Node.js
- Public Speaking

### Skills Wanted

Skills that the user wants to learn from other people.

Skill entries are stored in Supabase and connected to users through the `user_skills` relationship.

Skills can also go through an **admin moderation workflow** before being approved for public discovery.

---

# 🔎 4. Browse & Discover

The Browse page allows users to discover other SkillSwap users.

### Search & filtering

Users can search for people based on:

- Skill
- Name
- Username
- Location
- Availability

The platform also provides skill-based recommendations.

### Recommendation system

SkillSwap compares:

- Skills the current user wants
- Skills other users offer
- Skills the current user offers
- Skills other users want

Users with compatible skills receive a higher match score.

This helps users discover people who can potentially participate in a mutually beneficial skill exchange.

---

# 🔄 5. Skill Swap Requests

Users can send skill exchange requests to other users.

A request contains:

- Sender
- Receiver
- Skill being offered
- Skill being requested
- Optional message
- Request status
- Creation timestamp

### Request lifecycle

```text
Pending
   │
   ├── Accept → Accepted
   │                │
   │                └── Both complete → Completed
   │
   ├── Reject → Rejected
   │
   └── Cancel → Cancelled
```

### User actions

Users can:

- Send swap request
- Accept incoming request
- Reject incoming request
- Cancel outgoing pending request
- View pending requests
- View accepted swaps
- Mark an accepted swap as completed
- View completed swaps

Duplicate pending requests for the same exchange are prevented at the database level.

---

# 🤝 6. Two-Sided Swap Completion

A swap is completed only after **both participants confirm completion**.

The database stores:

- `sender_completed_at`
- `receiver_completed_at`

This allows SkillSwap to track completion independently for both participants.

Once both participants complete the exchange, the swap becomes:

```text
completed
```

This prevents one participant from unilaterally marking a swap as fully completed.

---

# ⭐ 7. Ratings & Feedback

After completing a swap, users can rate their exchange partner.

### Rating system

- Rating range: **1–5 stars**
- Optional written feedback
- One rating per user per swap
- Reviewer cannot rate themselves
- Ratings are linked to the completed swap

Ratings help create trust between SkillSwap users and provide reputation information after completed exchanges.

---

# 🔔 8. Notifications

SkillSwap includes a notification system for important user activity.

Notifications can represent events such as:

- New swap request
- Swap accepted
- Swap rejected
- Swap cancelled
- Swap completed
- Rating received
- Platform announcements

### Notification features

- Notification dropdown
- Unread notification count
- Read/unread state
- Mark notification as read
- Announcement notifications
- Recent notification history

The user dashboard also listens for real-time notification and swap updates using Supabase Realtime.

---

# 📢 9. Platform Announcements

Administrators can send platform-wide announcements.

Admin can provide:

- Announcement title
- Announcement message

The announcement is distributed to users through the notifications system.

Users can then see announcements inside their notification area.

---

# 🛡️ 10. Admin Dashboard

SkillSwap includes a dedicated Admin Dashboard protected by an admin route.

### Admin capabilities

- View platform statistics
- View registered users
- Search users
- Filter users by role
- Filter users by account status
- Paginate user records
- Change user roles
- Ban/unban users
- Moderate submitted skills
- Monitor swap requests
- Reject pending swaps
- Send platform announcements
- View ratings and feedback reports
- View activity logs
- Download CSV reports
- Filter reporting data by date range

---

# 🧹 11. Skill Moderation

New user skills can enter a moderation queue.

Administrators can review pending skill submissions and:

- Approve skills
- Reject skills

Only approved skills are used for public skill discovery and recommendations.

This helps prevent inappropriate or unwanted skill descriptions from appearing across the platform.

---

# 📊 12. Admin Reporting

The Admin Dashboard provides reporting functionality for platform activity.

### User reports

Includes:

- Name
- Username
- Email
- Location
- Profile visibility
- Role
- Account status

### Swap reports

Includes:

- Sender
- Receiver
- Offered skill
- Requested skill
- Message
- Status
- Creation date

### Rating reports

Includes:

- Reviewer
- Reviewee
- Rating
- Feedback
- Creation date

### Activity reports

Includes:

- User
- Action type
- Description
- Timestamp

Reports can be downloaded as CSV files.

---

# 📅 13. Report Date Filtering

Admin reporting supports multiple time ranges:

- Last 1 Day
- Last 2 Days
- Last 3 Days
- Last 7 Days
- Last 30 Days
- Last 90 Days
- All Time

The selected date range affects:

- Swap monitoring
- Rating reports
- Activity logs

This makes it easier for administrators to inspect recent platform activity.

---

# 📝 14. Activity Logging

Important platform actions are recorded in activity logs.

Tracked activities include events such as:

- Swap requested
- Swap accepted
- Swap rejected
- Swap cancelled
- Swap completed
- Rating submitted

These logs are used by the Admin Dashboard for monitoring and reporting.

---

# 🔒 15. Database Security

SkillSwap uses **Supabase PostgreSQL with Row Level Security (RLS)**.

The database includes security policies controlling access to:

- Profiles
- Skills
- User skills
- Swap requests
- Ratings
- Notifications

Examples of access restrictions:

- Users can manage their own profiles
- Users can manage their own skills
- Users can only create swap requests as themselves
- Swap participants can access their relevant swap requests
- Users can submit ratings as themselves
- Users can access their own notifications
- Administrators have additional management permissions

The database also includes validation constraints, foreign keys, indexes, and role protection.

---

# 🗃️ Database Structure

The core database entities include:

| Table           | Purpose                                   |
| --------------- | ----------------------------------------- |
| `profiles`      | User profile information and roles        |
| `skills`        | Available platform skills                 |
| `user_skills`   | Connects users with offered/wanted skills |
| `swap_requests` | Skill exchange requests and lifecycle     |
| `ratings`       | Ratings and feedback after swaps          |
| `notifications` | User notifications and announcements      |
| `activity_logs` | Administrative activity tracking          |

### Important relationships

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
     └──────────────► notifications
```

---

# 🖥️ Application Pages

SkillSwap currently contains **8 unique React page components** exposed through **9 route definitions**.

| Page            | Route              | Purpose                                |
| --------------- | ------------------ | -------------------------------------- |
| Home            | `/`                | Landing page and platform introduction |
| Login           | `/login`           | User authentication                    |
| Signup          | `/signup`          | New user registration                  |
| Dashboard       | `/dashboard`       | User activity, swaps and notifications |
| Profile         | `/profile`         | Manage own profile                     |
| Public Profile  | `/profile/:userId` | View another user's profile            |
| Browse          | `/browse`          | Discover users and skill matches       |
| Swap Requests   | `/swap-requests`   | Manage incoming/outgoing swaps         |
| Admin Dashboard | `/admin`           | Platform administration                |

The two profile routes use the same React `Profile` component, which is why there are 8 unique page components but 9 route definitions.

---

# 📄 Page-by-Page Functionality

## 🏠 Home Page

Route:

```text
/
```

Contains:

- SkillSwap introduction
- Hero section
- How It Works
- Popular skills
- Platform features
- Community/trust section
- Login navigation
- Signup navigation
- Browse navigation

---

## 🔑 Login Page

Route:

```text
/login
```

Contains:

- Email input
- Password input
- Password visibility toggle
- Validation
- Supabase authentication
- Banned-user verification
- Login loading state
- Error handling
- Navigation to Dashboard after successful login

---

## 📝 Signup Page

Route:

```text
/signup
```

Contains:

- Full name
- Email
- Password
- Password visibility toggle
- Input validation
- Community guidelines confirmation
- Supabase account creation
- Automatic profile creation
- Navigation to Login after successful registration

---

## 📊 Dashboard

Route:

```text
/dashboard
```

Contains:

- Current user information
- Pending swap requests
- Active swaps
- Completed swaps
- Sent requests
- Swap accept/reject/cancel actions
- Swap completion
- Ratings
- Feedback
- Notifications
- Announcements
- Unread notification counter
- Responsive mobile navigation

The Dashboard also uses Supabase Realtime for notification and swap status updates.

---

## 👤 Profile

Routes:

```text
/profile
/profile/:userId
```

Contains:

- Profile information
- Profile photo
- Location
- Bio
- Availability
- Public/private visibility
- Offered skills
- Wanted skills
- Skill descriptions
- Add/remove skills
- Skill moderation status
- Send swap request from another user's profile

---

## 🔍 Browse

Route:

```text
/browse
```

Contains:

- Skill discovery
- Search
- Skill filters
- Availability filtering
- Public user discovery
- Skill compatibility recommendations
- Match scoring
- User profiles
- Swap request modal
- Offered/requested skill selection
- Optional swap message
- Notifications

---

## 🔄 Swap Requests

Route:

```text
/swap-requests
```

Contains:

### Incoming Requests

- View requests received from other users
- Accept
- Reject
- Complete accepted swaps
- Rate completed swaps

### Outgoing Requests

- View requests sent by the current user
- Track request status
- Cancel pending requests
- Complete accepted swaps
- Rate completed swaps

### Filters

- All
- Pending
- Accepted
- Completed

---

## 🛠️ Admin Dashboard

Route:

```text
/admin
```

Protected using an Admin Route.

Contains:

### Overview

- Total users
- Public profiles
- Active swaps
- Completed swaps

### User Management

- User search
- Role filtering
- Status filtering
- Pagination
- Role management
- Ban/unban management

### Skill Moderation

- Pending skill queue
- Approve/reject skills

### Swap Monitoring

- All
- Pending
- Accepted
- Completed
- Rejected
- Cancelled
- Admin rejection of pending swaps

### Announcements

- Create announcement
- Send to users
- Announcement status

### Reports

- Users report
- Swaps report
- Ratings/feedback report
- Activity log report
- CSV downloads
- Date filtering

---

# 🛠️ Tech Stack

| Layer                   | Technology              |
| ----------------------- | ----------------------- |
| Frontend                | React                   |
| Build Tool              | Vite                    |
| Language                | JavaScript (JSX)        |
| Styling                 | CSS                     |
| Routing                 | React Router            |
| Backend Platform        | Supabase                |
| Database                | PostgreSQL via Supabase |
| Authentication          | Supabase Auth           |
| Storage                 | Supabase Storage        |
| Realtime                | Supabase Realtime       |
| Database Security       | PostgreSQL RLS          |
| Version Control         | Git + GitHub            |
| Development Environment | VS Code                 |

### Main dependencies

```text
react
react-dom
react-router-dom
@supabase/supabase-js
vite
eslint
```

---

# 🏗️ Architecture

SkillSwap uses a frontend-focused architecture where React communicates directly with Supabase.

```text
┌─────────────────────────────┐
│        React + Vite         │
│                             │
│ Home / Auth / Dashboard     │
│ Profile / Browse / Swaps    │
│ Admin Dashboard             │
└──────────────┬──────────────┘
               │
               │ Supabase JS
               ▼
┌─────────────────────────────┐
│          Supabase           │
│                             │
│ Authentication              │
│ PostgreSQL Database         │
│ Row Level Security          │
│ Storage                     │
│ Realtime                    │
└─────────────────────────────┘
```

There is no separate Express/Node.js backend server in the current repository. Supabase provides the backend services used by the application.

---

# 📁 Project Structure

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
│   │   ├── Home.css
│   │   ├── Login.jsx
│   │   ├── Login.css
│   │   ├── Signup.jsx
│   │   ├── Signup.css
│   │   ├── Dashboard.jsx
│   │   ├── Dashboard.css
│   │   ├── Profile.jsx
│   │   ├── Profile.css
│   │   ├── Browse.jsx
│   │   ├── Browse.css
│   │   ├── SwapRequests.jsx
│   │   ├── SwapRequests.css
│   │   ├── AdminDashboard.jsx
│   │   └── AdminDashboard.css
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
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

# ⚙️ Environment Variables

Create a `.env` file in the project root.

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Never expose a Supabase service-role key in the frontend.

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/trushitdarji/SkillSwap.git
cd SkillSwap
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create:

```text
.env
```

and add the required Supabase variables.

## 4. Start development server

```bash
npm run dev
```

The Vite development server will provide a local URL such as:

```text
http://localhost:5173
```

---

# 📦 Available Scripts

### Development

```bash
npm run dev
```

Starts the Vite development server.

### Production Build

```bash
npm run build
```

Creates the production build.

### Preview Production Build

```bash
npm run preview
```

Runs the production build locally for preview.

### Lint

```bash
npm run lint
```

Runs ESLint across the project.

---

# 🔐 Security Highlights

SkillSwap implements several database-level security controls.

### Row Level Security

RLS is enabled on the main application tables.

### User ownership

Users can only perform user-level operations on resources they are authorized to access.

### Admin protection

Administrative functionality is protected using an Admin Route and database-level admin checks.

### Data validation

The database contains constraints for:

- Usernames
- Roles
- Skill types
- Swap statuses
- Ratings
- Messages
- Feedback
- User relationships

### Foreign keys

Relationships use PostgreSQL foreign keys with appropriate delete behavior.

---

# 📈 Current Project Status

## ✅ Implemented

- Authentication
- User registration
- Login/logout
- Protected routes
- User profiles
- Profile editing
- Profile photo storage
- Skills offered/wanted
- Skill moderation
- Browse/search
- Skill compatibility recommendations
- Swap requests
- Accept/reject/cancel
- Two-sided swap completion
- Ratings and feedback
- Notifications
- Announcements
- Supabase Realtime updates
- Admin dashboard
- User management
- User search/filter/pagination
- Ban/unban
- Admin role management
- Swap monitoring
- Reports
- CSV exports
- Activity logs
- Report date filtering
- PostgreSQL RLS

---

# 🚧 UI Elements / Future Improvements

Some UI elements are currently present as design placeholders and can be expanded in future versions.

Examples include:

- Google authentication UI
- Forgot password UI
- Advanced admin navigation interactions
- More detailed analytics
- Additional notification types
- Advanced matching algorithms
- More comprehensive profile customization

These are intentionally separated from the implemented feature list so the README accurately represents the current application.

---

# 🎓 Hackathon Project

SkillSwap was developed as a hackathon project with the goal of building a functional peer-to-peer skill exchange platform within a limited development timeframe.

The project focuses on implementing the complete core workflow:

```text
Register
   ↓
Create Profile
   ↓
Add Skills
   ↓
Discover Users
   ↓
Find Skill Match
   ↓
Send Swap Request
   ↓
Accept / Reject / Cancel
   ↓
Complete Swap
   ↓
Rate & Review
```

Alongside the user workflow, administrators can monitor and manage the platform through the Admin Dashboard.

---

# 👨‍💻 Project

**SkillSwap**

A peer-to-peer skill exchange platform designed to make knowledge sharing simple, accessible, and collaborative.

---

## 📜 License

This project was created as a hackathon project for educational and demonstration purposes.
