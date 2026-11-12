# AttendFlow

React/Vite attendance website. Data lives in `attendflow-service` on the platform backend
(`main-backend`); teachers sign in with platform (auth-service) accounts, and live check-ins
arrive through the platform's realtime WebSocket (chat-service `/ws`).

## Run locally

Start the platform (`main-backend/platform`, `./scripts/start.ps1`) with attendflow-service
added (`python scripts/add_attendflow.py`), then run `npm install` and `npm run dev`.
Leave `VITE_API_URL` empty: Vite proxies `/api` to `http://localhost:8080` and `/ws` to
`ws://localhost:8081`, so sign-in cookies work on `localhost:5173`.

## Production environment (Vercel)

The website must be on a subdomain of the auth cookie domain (`career.xmus.me`), for example
`attend.career.xmus.me`, and that origin must be allowed by the platform
(`scripts/deploy_attendflow.sh` does this). Set:

```dotenv
VITE_API_URL=https://api.career.xmus.me
VITE_WS_URL=wss://api.career.xmus.me/ws
```

## Student lists and location limits

1. Sign in as a teacher and open **Create Session**, or edit an existing session.
2. Under **Student list**, choose a saved list, or import a new CSV, XLSX, or XLS file once. It needs **ID** and **Name** columns (`Student ID` / `Full Name` also work). **Name_KH** and **Groupe** columns are saved too, and title rows above the header are fine. Name the list and click **Save list and use it**. The list is then available for every later session, so you do not import it again. Use one worksheet, up to 2,000 students and 5 MB. IDs are case-insensitive and allow 2–30 letters, digits, underscores, or hyphens. Empty rows are ignored; duplicate IDs and invalid rows reject the import.
3. Optionally enable **Require students to be near the classroom**. Use your current location while at the classroom, or enter its latitude and longitude. Set the allowed distance in meters (default 100 m; range 10–5,000 m).
4. Save the session and share its attendance link. When a list is used, students type their ID and the page shows the matching name (plus Khmer name and group) so they can confirm it. IDs not on the list are rejected, and the attendance record uses the name from the list. Location is requested only for sessions with the location requirement enabled.
5. Open session details to compare the list with submissions and see present and absent students.

Saved lists cannot be edited; import a new list if the class changes. Deleting a saved list warns how many sessions use it, because open sessions using a deleted list stop accepting check-ins. Switching a session's list keeps earlier attendance. Reopening a session still requires the current time to be within its opening/closing window.

## Security notes

attendflow-service checks everything on the server: session owner, opening times, class-list
membership (the listed name is recorded), one submission per student ID, and the distance to
the classroom, which it recomputes itself. Class lists are readable only by their teacher;
students can look up one ID at a time, and only while the session is open.

Device coordinates and reported accuracy can be spoofed; browser geolocation cannot prove physical presence. Student IDs are also self-reported, so knowing someone else's ID is not identity verification. Geolocation requires HTTPS (localhost is accepted for development).

## Validation

```powershell
npm test
npm run build
```

Server-side rules (privacy, check-in limits, location) are tested in attendflow-service (`pytest`).
