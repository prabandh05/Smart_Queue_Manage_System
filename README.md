# Smart Queue Management System (React + Supabase)

Production-ready template for a queue system with role-based dashboards, slot booking, SMS notifications, and live display.

## Features
- Auth with Supabase (profiles with is_officer / is_admin)
- Officer and citizen dashboards
- Token generation with 30-minute slots, lunch break, capacity = 3 per service/slot
- Disability priority flag (vision/hearing/mobility)
- Live display (public) with realtime updates
- SMS notifications via Supabase Edge Function (Twilio)

## Prerequisites
- Node 18+ and pnpm/npm
- Supabase project
- Twilio account (SMS-capable number)

## Setup
1) Install deps
```
npm install
```
2) Env (.env.local)
```
VITE_SUPABASE_URL=YOUR_URL
VITE_SUPABASE_ANON_KEY=YOUR_ANON
```
3) Supabase SQL (run in SQL editor)
- Apply the single setup schema at `supabase/migrations/00000000000000_full_schema.sql`.

4) Edge Function
- Create function `send-sms-notification` from `supabase/functions/send-sms-notification`
- Set secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

## Develop
```
npm run dev
```
Open http://localhost:5000

## Reset database (destructive)
- Truncate key tables:
```
truncate table public.tokens restart identity cascade;
truncate table public.counters restart identity cascade;
truncate table public.notifications restart identity cascade;
truncate table public.queue_stats restart identity cascade;
truncate table public.profiles restart identity cascade;
```

## Notes
- Replace favicon at `public/favicon.ico` (current is React logo).
- This project removes vendor tags and example metadata.


Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

