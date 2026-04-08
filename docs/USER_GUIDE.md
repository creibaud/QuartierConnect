# User Guide — QuartierConnect

---

## Registration

1. Open `http://localhost:3000/register`.
2. Enter your email address and a password (minimum 8 characters, at least one digit and one special character).
3. Click **Register**. A QR code is displayed — this is your TOTP secret.
4. Scan the QR code with an authenticator app (Google Authenticator, Aegis, etc.).
5. Enter the 6-digit code shown by the app and click **Confirm**.
6. You are registered and redirected to the login page.

> Keep your authenticator app installed. You will need a TOTP code on every login.

---

## Login

1. Open `http://localhost:3000/login`.
2. Step 1: enter your email and password, click **Continue**.
3. Step 2: enter the 6-digit TOTP code from your authenticator app, click **Login**.
4. You are redirected to the dashboard.

If you enter the wrong password 5 times in 15 minutes your IP is rate-limited for 15 minutes.

---

## SSO Cross-Platform (Web → Desktop)

Use this flow to log into the desktop app without re-entering your password.

**On the web app:**
1. Go to the dashboard and click **Generate SSO token**.
2. A 6-character token is displayed with a 5-minute countdown. Copy it.

**On the desktop app:**
1. On the login screen, paste the SSO token into the **SSO token** field.
2. Click **Connect with SSO**.

The token is single-use and expires after 5 minutes. Generate a new one if it expires.

---

## Services

### Browse services
1. From the dashboard, click **Services**.
2. Use the category filter and neighborhood filter to narrow results.
3. Click a service card to view details.
4. Use the thumbs up / thumbs down buttons to vote on a service.

### Create a service listing
1. On the services page, click **Add service**.
2. Fill in the title, description, category, and type (free / paid / exchange).
3. Optionally select a neighborhood.
4. Click **Publish**.

### Respond to a service listing
Send a direct message to the service creator via the **Message** button on the service detail page.

---

## Contracts

### Sign a contract
1. From the dashboard, click **Contracts**.
2. A contract awaiting your signature is shown with the status **Pending your signature**.
3. Click the contract to view its content.
4. Click **Sign** — enter your TOTP code to confirm.
5. The status changes to **Fully signed** once all listed signatories have signed.

### Create a contract
1. On the contracts page, click **New contract**.
2. Enter a title, the full contract text, and the email addresses of the signatories.
3. Click **Create**. The SHA-256 hash of the content is computed automatically and stored.

---

## Events

### View the calendar
1. From the dashboard, click **Events**.
2. The calendar view shows events by date. Click a day to see its events.
3. Use the category filter to restrict results.

### Mark interest
On an event card, click the interest button (star / bookmark). The interested count updates immediately.

---

## Incidents

### Report an incident
1. From the dashboard, click **Incidents**.
2. Click **Report an incident**.
3. Fill in the title and description. Optionally select a neighborhood.
4. Click **Submit**. The incident is created with status **Open**.

### View incident status
Each incident card shows the current status: **Open**, **In progress**, or **Resolved**. Click the card for full details and the vote buttons (up / down).

Moderators and admins can transition statuses: `open → in progress → resolved`.

---

## Messaging

### Start a conversation
1. From a service or user profile, click **Send message**.
2. A conversation is created (or an existing one reopened).

### Send a message
Type in the message box and press Enter or click **Send**.

### Send a file
Click the attachment icon, select a file (max 10 MB). Images are displayed inline; other files as download links.

Messages are delivered in real time via WebSocket. A connection indicator shows whether the live channel is active.

---

## Points

Points are credited when you provide services or participate in community activities.

- View your balance on the dashboard (bottom of the stats cards).
- Go to **Points → History** to see sent and received transactions.
- To transfer points: click **Send points**, enter the recipient's ID or email and the amount, add an optional note, confirm.

The minimum balance floor is -10 points.

---

## Admin — Manage Neighborhoods

1. Log in with an admin account at `http://localhost:3001`.
2. Go to **Neighborhoods → New**.
3. Enter a name, city, and optional description.
4. Optionally enter coordinates `[latitude, longitude]`.
5. Click **Create**.

To edit or delete a neighborhood, click the row in the list and use the action buttons.

---

## Admin — Moderate Users

1. Go to **Users** in the admin back-office.
2. The table shows all registered users, their roles, and registration dates.
3. To change a role: click the user row, select the new role from the dropdown, click **Save**.
4. Roles: `resident` (default), `moderator` (can transition incidents and soft-delete), `admin` (full access).

---

## Desktop App

### Login via SSO
The desktop app does not have a password form — use the SSO flow described above.

1. Launch the desktop JAR: `java -jar target/quartierconnect-desktop.jar`
2. The login screen shows an **SSO token** field.
3. Generate a token from the web app, paste it, click **Connect**.

### View incidents offline
The app stores your incidents in a local SQLite database. When offline:
- The incident list still displays all cached incidents.
- New incidents created offline are marked as dirty.
- On next connection, the sync service pushes them to the API via `POST /incidents/sync`.

### Install a plugin
1. Copy a plugin JAR to `~/.quartierconnect/plugins/`.
2. Restart the desktop app.
3. The plugin appears in **Settings → Plugins**.
