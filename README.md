# M1st Studio

The team workspace for **M1st Creatives**: outreach, sales calls, client work and the team, in one place.

## What's inside

| Section | What it does |
| --- | --- |
| **Dashboard** | Today's outreach goal, 14-day chart, sales pipeline, your own work, team workload, revenue, live activity, niche test |
| **Outreach** | **Ready to send** queue: prepare personalized messages in a batch, copy, send, mark as sent. Follow-ups appear automatically 4 days later. **Sent log** tracks every lead's status |
| **Call scripts** | Word-for-word scripts (discovery call, monthly check-in, voicemail) that fill in the lead's name and business, step checklist, answers to common objections, and a call log |
| **Social** | Approved work ready to publish (caption, file link, buttons to open each free posting tool, mark as posted), a shared message log with who replies, and M1st's accounts |
| **Calendar** | Week and month views of all work, filterable by client or team member. Anyone can add their work |
| **Clients** | Client list with who's in charge, and a page per client with its own month calendar, team, upcoming work and brand notes |
| **Local shoots** | Photography, videography and filmmaking bookings: crew, gear, price, reservation fee and balance in pesos, delivery dates, gear clash warnings, a shoot calendar, and quick replies in English and Filipino |
| **Equipment** | Every item M1st owns, with live status: available, in use (by whom, until when), booked for a shoot today, or needs repair |
| **Team** | Org chart built from everyone's profile (photo, role, department, reports-to, skills, bio), profile cards, and who's in charge of each client |
| **Client portal** | What a client sees: their calendar, their account lead and team, and drafts to approve or send back with notes |

## How it runs today

The app is a plain HTML/CSS/JavaScript site with no build step. It's currently hosted as a Claude artifact, which gives it:

- a shared database (`claude.use("db")`) so the whole team sees the same data live
- photo storage for profile pictures (`claude.use("assets")`)

Everyone who edits needs a Claude account and an **Editor** invite from the artifact's Share menu.
Opened anywhere else (for example straight from GitHub), it runs in **local mode**: everything works, but data is only kept until the page is closed.

## Project layout

```
index.html          App shell (sidebar, header, dialog, toast)
css/app.css         All styles. Brand colors are the variables at the top
js/app.js           Navigation, routing, rendering
js/data.js          Shared state and database reads/writes
js/content.js       Wording: templates, call scripts, objections, packages, prices
js/ui.js            Reusable pieces: forms, pills, avatars, month calendar
js/views/grow.js    Dashboard, Outreach, Call scripts
js/views/deliver.js Calendar, Clients, Team, Client portal
js/views/social.js  Social: publish, messages, accounts
js/views/local.js   Local shoots and quick replies
js/views/gear.js    Equipment
assets/             Logo
```

Most day-to-day changes (new message templates, script wording, package prices) only touch `js/content.js`.

## Data

Collections in the database: `leads`, `clients`, `posts` (work items), `team`, `calls`, `socials`, `messages`, `bookings`, `gear`.

No social network is connected yet: the Social section opens each platform's own free tools in a new tab.

## Run locally

Any static file server works, for example:

```
npx serve .
```

## Next step: separate logins for clients

To give clients their own login without a Claude account, move the data layer in `js/data.js` to a hosted backend such as Supabase or Firebase. The rest of the app can stay as it is.
