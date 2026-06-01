# Studio Aruo Vercel Demo Platform Design

## Goal

Build a Vercel-hosted demo version of Studio Aruo that turns the current showcase/admin site into a role-based platform for designers and render artists. The demo should use real hosted infrastructure where it matters: Vercel for deployment, Neon Postgres for structured data, and Vercel Blob for image uploads. Payments remain simulated in phase one.

## Scope

Phase one includes:

- Account registration and login.
- Role selection at registration: designer or render artist.
- Role-based dashboard routing.
- Removal of the canvas/whiteboard workflow from the visible product.
- Designer workflows:
  - Upload works and display photos.
  - Browse render artist rankings.
  - Start collaborations with render artists.
  - Review render artists after collaboration.
  - Give "chicken legs" after collaboration.
  - Simulate balance top-ups.
- Render artist workflows:
  - Upload portfolio works.
  - Edit package pricing.
  - View received collaborations, reviews, and chicken legs.
  - View ranking position.
  - Manage public profile.
- Ranking based on reviews, chicken legs, collaborations, and work count.

Phase one excludes:

- Real payment integration.
- Email/SMS verification.
- Password reset by email.
- Team accounts.
- Production moderation workflows.
- True order delivery, invoicing, or escrow.

## Technical Approach

Use Vercel as the deployment target for both frontend and API endpoints. Use Neon Postgres through Vercel Marketplace for persistent relational data. Use Vercel Blob for uploaded images.

The current React/Vite app remains the UI base. The current Express server should be replaced or bypassed for deployment with Vercel-compatible API routes. Existing local-only admin password logic is removed from the user-facing flow.

Authentication for the demo can use email/username plus password with server-side password hashing and signed session tokens. Sessions are stored client-side as a token and validated by API routes.

## Routes

Frontend routes:

- `/` remains the public gallery/home page.
- `/login` handles login.
- `/register` handles account creation and role selection.
- `/dashboard` redirects by role after login.
- `/dashboard/designer` is the designer workspace.
- `/dashboard/artist` is the render artist workspace.
- `/artists` shows the render artist ranking.
- `/artists/:id` shows render artist profile, works, pricing, reviews, and collaboration actions.
- `/admin` redirects to `/dashboard` and no longer asks for a shared password.
- `/submit` is removed from navigation or redirected to `/dashboard`.

Navigation changes:

- Replace "需求交互版" with "登录 / 工作台".
- Keep public gallery, pricing/reference, guide/service pages where useful.
- Hide role-specific actions until the user logs in.

## Data Model

### users

- `id`
- `username`
- `password_hash`
- `role`: `designer` or `artist`
- `display_name`
- `avatar_url`
- `bio`
- `balance`
- `created_at`
- `updated_at`

### works

- `id`
- `user_id`
- `title`
- `description`
- `image_url`
- `image_path`
- `created_at`
- `updated_at`

### pricing_items

- `id`
- `artist_id`
- `name`
- `description`
- `price`
- `unit`
- `sort_order`
- `created_at`
- `updated_at`

### collaborations

- `id`
- `designer_id`
- `artist_id`
- `status`: `active` or `completed`
- `title`
- `note`
- `created_at`
- `updated_at`

### reviews

- `id`
- `collaboration_id`
- `designer_id`
- `artist_id`
- `rating`
- `content`
- `created_at`

Constraint: one review per collaboration.

### chicken_legs

- `id`
- `collaboration_id`
- `designer_id`
- `artist_id`
- `amount`
- `message`
- `created_at`

## Business Rules

- A user must choose a role during registration.
- A user's role cannot be changed in phase one.
- `/dashboard` content is determined by the logged-in user's role.
- Designers can start collaborations from an artist profile or ranking card.
- Designers can review and give chicken legs only to artists they have collaborated with.
- Each collaboration can receive at most one review.
- Chicken legs can be given multiple times if the designer has enough demo balance.
- Simulated recharge increases designer balance only.
- Render artist ranking score is computed from:
  - review count and average rating first,
  - chicken leg total second,
  - collaboration count third,
  - work count fourth.
- Uploaded images are stored in Vercel Blob; Postgres stores metadata and Blob URLs.

## API Surface

Authentication:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Uploads:

- `POST /api/blob/upload-token`
- `POST /api/works`
- `GET /api/works`
- `DELETE /api/works/:id`

Profiles and pricing:

- `GET /api/artists`
- `GET /api/artists/:id`
- `PUT /api/profile`
- `GET /api/pricing`
- `PUT /api/pricing`

Collaborations:

- `POST /api/collaborations`
- `GET /api/collaborations`
- `PUT /api/collaborations/:id`

Reviews and chicken legs:

- `POST /api/reviews`
- `POST /api/chicken-legs`
- `POST /api/balance/top-up`

## UI Design

### Registration

Registration is a focused form with account credentials and a two-option role selector. The role selector must explain the practical difference:

- Designer: upload display works, choose render artists, review and reward.
- Render artist: publish works, edit packages, receive reviews and rewards.

### Designer Dashboard

Designer dashboard sections:

- Profile summary and balance.
- Upload/display works.
- Recommended render artists.
- Active collaborations.
- Review and chicken leg actions for eligible collaborations.
- Simulated top-up control.

### Render Artist Dashboard

Render artist dashboard sections:

- Profile summary and ranking position.
- Portfolio upload.
- Package pricing editor.
- Received reviews.
- Chicken leg total.
- Collaboration list.

### Ranking

Ranking cards show:

- Artist avatar/name.
- Review count and average rating.
- Chicken leg total.
- Collaboration count.
- Representative works.
- Button to view profile or start collaboration.

## Error Handling

- Registration rejects duplicate usernames.
- Login returns a clear invalid credential message.
- Role-protected pages redirect unauthenticated users to login.
- API routes return `401` for unauthenticated requests and `403` for wrong-role actions.
- Blob uploads must reject non-image files.
- Review creation fails if no collaboration exists or a review already exists for that collaboration.
- Chicken leg creation fails if the designer has insufficient demo balance.

## Migration From Current App

- Remove `CanvasSubmission` from navigation and routing.
- Remove admin password UI and token logic from `Admin`.
- Replace shared admin behavior with role dashboards.
- Keep gallery, pricing display, and guide pages where they still support the public product.
- Replace localStorage-only business data with API-backed state for accounts, works, pricing, reviews, and ranking.
- Keep localStorage only for session token and minor UI preferences.

## Verification

Manual demo path:

1. Register a designer account.
2. Register a render artist account.
3. Log in as the artist and upload works.
4. Edit artist pricing.
5. Log in as the designer and browse ranking.
6. Start a collaboration with the artist.
7. Complete or mark the collaboration eligible.
8. Add a review.
9. Simulate recharge and give chicken legs.
10. Confirm the ranking updates.

Automated checks:

- TypeScript build passes.
- Auth API rejects invalid credentials.
- Role-protected APIs reject wrong-role requests.
- Ranking function sorts artists deterministically.
- Review rule prevents duplicate reviews for one collaboration.

