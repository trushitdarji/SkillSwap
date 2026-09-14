# SkillSwap — Project Context

> This file is the primary source of truth for the SkillSwap project.
>
> Before implementing any feature, read this file first.
> If a new decision changes the architecture, update this file before
> continuing implementation.

---

## 1. Project Overview

SkillSwap is a web platform where users can exchange skills with other users.

The core idea is:

> "I can teach/help someone with a skill I know, and in return I can learn a skill I want."

Example:

- User A offers Python
- User A wants Photoshop
- User B offers Photoshop
- User B wants Python

User A can send a swap request to User B.

The request is handled directly between the two users.

Admin does NOT approve normal swap requests.

---

## 2. Problem Statement

The platform should allow users to:

- Create an account
- Create and manage their profile
- Add skills they can offer
- Add skills they want to learn
- Make their profile public or private
- Discover other users by skills
- Send skill-swap requests
- Accept or reject received requests
- Cancel their own pending requests
- Complete a mutually accepted swap
- Rate the other participant after completion
- Receive notifications about important swap activity

The original problem statement specifically requires:

- Basic profile information
- Optional location
- Optional profile photo
- Skills offered
- Skills wanted
- Availability
- Public/private profile visibility
- Browse/search users by skill
- Accept/reject swap requests
- View current/pending requests
- Ratings/feedback after a swap
- Ability to delete/cancel a swap request if it is not accepted

---

## 3. Core Product Principle

The platform is based on direct user-to-user skill exchange.

There is no requirement for an admin to manually approve every swap.

The flow is:

User A
↓
Finds User B
↓
Sends swap request
↓
User B accepts/rejects
↓
If accepted
↓
Both users complete the exchange
↓
Both confirm completion
↓
Swap becomes completed
↓
Users can rate each other

---

# 4. User Roles

## 4.1 Normal User

A normal user can:

- Register/login
- Manage their own profile
- Add/remove their own skills
- Search/discover users
- Send swap requests
- View their own sent requests
- View requests received by them
- Accept/reject requests they receive
- Cancel their own pending requests
- Confirm completion of accepted swaps
- Rate the other participant after completion
- Read and manage their own notifications

---

## 4.2 Admin

Admin functionality is separate from the normal user flow.

Admin may eventually handle:

- User moderation
- Skill moderation
- Swap oversight
- Reports
- Platform announcements
- Moderation-related operations

However:

> Admin approval is NOT required for normal user-to-user swap requests.

Admin permissions must be enforced by the database/RLS layer.

The frontend must never be the only protection for admin functionality.

---

# 5. Authentication

Authentication will use Supabase Auth.

Supabase's:

`auth.users`

is responsible for authentication.

Application-specific user information will be stored in:

`public.profiles`

The application must not duplicate passwords or authentication credentials inside `profiles`.

---

# 6. User Profile

Each authenticated user has one application profile.

The profile contains:

- Full name
- Username
- Avatar/profile photo
- Location
- Bio
- Availability
- Public/private visibility
- Role
- Created timestamp
- Updated timestamp

Profile visibility:

### Public

Other users can discover and view the profile according to the platform rules.

### Private

Other users should not be able to freely view private profile information.

The owner can always access their own profile.

---

# 7. Skills System

## Dynamic Skills

Skills are dynamic.

We will NOT restrict users to a predefined category-only skill list.

Users may provide skills such as:

- Python
- React
- Photoshop
- Excel
- Guitar
- Video Editing
- UI Design
- Public Speaking
- etc.

The skill catalogue is stored in:

`skills`

User-specific skill relationships are stored in:

`user_skills`

---

## Skill Categories

Skill categories are NOT mandatory.

Do not introduce a category-based skill architecture unless a future product decision explicitly requires it.

The system should support dynamic skill input.

---

# 8. Offered vs Wanted Skills

Each user skill relationship has a type:

- `offer`
- `want`

Example:

User A:

- Python → offer
- React → offer
- Photoshop → want
- Guitar → want

This allows the platform to understand both:

> What can this user teach?

and:

> What does this user want to learn?

---

# 9. Skill Data Integrity

The database must prevent:

- Duplicate global skills
- Duplicate user-skill relationships
- Invalid skill types

The database should use constraints rather than trusting the frontend.

---

# 10. User Discovery / Search

Users should be able to browse/search other users by skill.

Example:

Search:

`Python`

The platform can find users who offer Python.

Search should support the dynamic skill catalogue.

Potential discovery information:

- User name
- Profile photo
- Location
- Bio
- Availability
- Offered skills
- Wanted skills
- Reputation/ratings where appropriate

Private profiles must respect profile visibility rules.

---

# 11. Swap Request

A swap request represents a direct request from one user to another.

Example:

User A → User B

User A offers:

`Python`

User A requests:

`Photoshop`

The database stores:

- Sender
- Receiver
- Offered skill
- Requested skill
- Optional message
- Status
- Completion timestamps
- Created timestamp
- Updated timestamp

---

# 12. Swap Request Rules

## No self-request

A user cannot send a swap request to themselves.

Invalid:

User A → User A

---

## Sender skill validation

The sender must actually have the offered skill marked as:

`offer`

The frontend cannot simply claim that the sender owns a skill.

The database must validate this.

---

## Receiver skill validation

The receiver must actually have the requested skill marked as:

`want`

The database must validate this.

---

## Duplicate pending requests

The same pending swap request combination cannot be duplicated.

A user may try again later after the previous request is rejected/cancelled.

---

# 13. Swap Statuses

Allowed statuses:

- `pending`
- `accepted`
- `rejected`
- `cancelled`
- `completed`

---

# 14. Swap State Machine

Allowed transitions:

````text
pending
   ├── accepted
   ├── rejected
   └── cancelled

accepted
   └── completed

# 15. Who Can Accept/Reject/Cancel?

## Receiver

The receiver can:

- Accept a pending request
- Reject a pending request

## Sender

The sender can:

- Cancel a pending request

## Neither participant

A normal user cannot directly mark a swap as:

`completed`

Completion is controlled by the two-sided completion mechanism.

---

# 16. Two-Sided Completion

A completed swap requires confirmation from BOTH participants.

The swap contains:

- `sender_completed_at`
- `receiver_completed_at`

Flow:

```text
accepted
   ↓
Sender confirms
   ↓
sender_completed_at set
   ↓
Still accepted
   ↓
Receiver confirms
   ↓
receiver_completed_at set
   ↓
Both timestamps exist
   ↓
status = completed
````

---

# 17. Rating System

Ratings are only allowed after a swap has been completed.

A user can rate the other participant of a completed swap.

The rating contains:

- Swap request
- Reviewer
- Reviewee
- Rating value
- Optional feedback
- Created timestamp

Rating value must be between:

`1` and `5`

A user cannot rate themselves.

A user cannot rate someone who did not participate in the swap.

A user can submit only one rating per completed swap.

The database must enforce rating eligibility.

---

# 18. Rating Eligibility

A rating is valid only when:

- The swap exists
- The swap status is `completed`
- The reviewer participated in the swap
- The reviewee is the other participant
- Reviewer and reviewee are different users
- The authenticated user is the reviewer
- The reviewer has not already rated that swap

The frontend must not be trusted to enforce these rules.

The database must validate them.

---

# 19. Notifications

The platform will provide notifications for important activity.

Examples include:

- New swap request
- Swap request accepted
- Swap request rejected
- Swap request cancelled
- Swap completion confirmation
- Swap completed
- Rating-related events where appropriate

Notifications belong to a specific user.

A notification contains:

- User ID
- Notification type
- Title
- Message
- Read/unread state
- Created timestamp

Users can read and manage their own notifications.

Users must not be able to create arbitrary notifications for other users.

The database/application trusted layer should generate notifications.

---

# 20. Database Schema

The initial database contains these application tables:

```text
profiles
skills
user_skills
swap_requests
ratings
notifications
```

Authentication users are stored by Supabase in:

auth.users

The application profile is stored in:

public.profiles

# 21. Database Relationships

The main database relationships are:

```text
auth.users
    |
    | 1:1
    ↓
profiles
    |
    ├── user_skills
    |
    └── swap_requests
            |
            └── ratings

skills
    |
    ├── user_skills
    |
    └── swap_requests

profiles
    |
    └── notifications
```

# 22. Database Constraints

The database must enforce important data integrity rules.

Profiles:

- Username must follow the allowed username format.
- Username must be unique case-insensitively.
- Full name cannot be blank.
- Role must be either `user` or `admin`.

Skills:

- Skill name cannot be blank.
- Skill name has a reasonable maximum length.
- Skill names are unique case-insensitively.

User skills:

- Skill type must be either `offer` or `want`.
- The same user cannot have the same skill with the same skill type more than once.

Swap requests:

- Sender and receiver must be different users.
- Status must be one of the allowed statuses.
- Message has a reasonable maximum length.
- Duplicate pending requests are prevented.

Ratings:

- Rating must be between `1` and `5`.
- Reviewer and reviewee must be different users.
- Only one rating per reviewer per swap is allowed.
- Feedback has a reasonable maximum length.

Notifications:

- Title cannot be blank.
- Message cannot be blank.
- Read state is controlled by the notification owner.

The database must enforce these rules rather than relying only on frontend validation.

# 23. Case-Insensitive Uniqueness

The database must treat values such as:

````text
Python
python
PYTHON

Trushit
trushit
TRUSHIT

lower(username)
lower(name)

# 24. Database Indexes

The initial database should include indexes that support actual application queries.

Required indexes include:

```text
user_skills(user_id)
user_skills(skill_id)

swap_requests(sender_id, created_at)
swap_requests(receiver_id, status, created_at)
swap_requests(status, created_at)

ratings(reviewee_id, created_at)
ratings(swap_request_id)

notifications(user_id, is_read, created_at)
````

# 25. Row Level Security

Row Level Security (RLS) must be enabled on all application tables:

````text
profiles
skills
user_skills
swap_requests
ratings
notifications

User
  ↓
RLS policy
  ↓
Can this user access this row?
  ↓
Database allows or denies the operation

# 26. Profiles Security

Authenticated users can:

- Read their own profile.
- Update their own profile.
- Create their own profile.

Public profiles may be visible to other authenticated users according to the `is_public` setting.

Private profiles must not expose their private profile information through normal user queries.

Normal users must not:

- Update another user's profile.
- Change another user's profile data.
- Delete another user's profile through the normal application flow.
- Promote themselves to admin.

Admin operations are protected separately.

# 27. Skills Security

Skills are global application data.

Authenticated users may be allowed to create new skills through the application.

Normal users must not be allowed to:

- Rename existing global skills.
- Delete existing global skills.
- Modify another user's skill relationships.

User-specific skill relationships are stored separately in `user_skills`.

Users can manage their own:

```text
offer
want

# 28. Swap Request Security

A swap request is visible only to:

- The sender
- The receiver
- An authorized admin

A normal user cannot read another user's private swap requests.

A normal user can create a swap request only as themselves.

The database must verify:

```text
sender_id = auth.uid()

```md
# 29. Swap Status Transition Security

The database must enforce who can perform each swap status transition.

Allowed transitions:

```text
pending → accepted
pending → rejected
pending → cancelled
accepted → completed

Permissions:

Receiver:
- pending → accepted
- pending → rejected

Sender:
- pending → cancelled

Both participants:
- Confirm completion

Database:
- Changes accepted → completed only after both completion confirmations
````

### 30

````md
# 30. Two-Sided Completion Security

A swap can become `completed` only after both participants confirm completion.

The database stores:

```text
sender_completed_at
receiver_completed_at

When the sender confirms:

sender_completed_at = server timestamp

The swap remains:

status = accepted

until the receiver also confirms.

When the receiver confirms:

receiver_completed_at = server timestamp

and both timestamps exist:

status = completed
```
````
