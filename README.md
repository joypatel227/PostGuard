# PostGuard — Security Agency Platform

A SaaS security agency management system with 3-role authentication (Lord → Admin → Supervisor).

**Stack:** React (Vite) + Django REST Framework + PostgreSQL

---

## 🗂 Project Structure

```
PostGuard/
├── backend/          ← Django REST API
│   ├── accounts/     ← Auth, users, invite codes, join requests
│   ├── company/      ← Company model
│   ├── attendance/   ← Attendance module
│   ├── core/         ← Django settings & URL config
│   └── requirements.txt
└── frontend/         ← React (Vite) app
    ├── src/
    │   ├── pages/    ← Login, Dashboards, Register, JoinRequest
    │   ├── components/ ← Sidebar, AuthContext, ProtectedRoute
    │   └── services/ ← Axios API client
    └── package.json
```

---

## ⚙️ Prerequisites

Make sure these are installed on your machine:

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://postgresql.org |
| Git | latest | https://git-scm.com |

---

## 🚀 Setup Guide (Partner / Fresh Machine)

### Step 1 — Clone the repo

```bash
git clone <your-repo-url>
cd PostGuard
```

---

### Step 2 — PostgreSQL Setup

Open **pgAdmin** or **psql** and run:

```sql
CREATE USER postguard_user WITH PASSWORD '1234';
CREATE DATABASE postguard_db OWNER postguard_user;
GRANT ALL PRIVILEGES ON DATABASE postguard_db TO postguard_user;
```

---

### Step 3 — Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate

# Install all Python packages
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Create the LORD account (super admin — do once)
python manage.py create_lord

# Start Django server
python manage.py runserver
```

→ API running at **http://localhost:8000**

---

### Step 4 — Frontend Setup

Open a **new terminal**:

```bash
cd frontend

# Install all Node packages
npm install

# Start React dev server
npm run dev
```

→ App running at **http://localhost:5173**

---

## 🔑 How to Onboard Users

### Method A — Invite Code
1. Lord logs in → Lord Dashboard → **Generate Admin Code** → copy 6-letter code
2. Send code to new Admin
3. Admin goes to `http://localhost:5173/register` → enters code → fills details → account created

4. Admin logs in → **Generate Supervisor Code** → same flow for supervisors

### Method B — Join Request
1. Person goes to `http://localhost:5173/join-request` → fills form → submits
2. Lord (for admins) or Admin (for supervisors) logs in → Requests tab → **Approve**
3. Approved user gets a temp password = first 8 chars of their email (before @)

---

## 🌐 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/login/` | Login — returns JWT + role |
| POST | `/api/auth/use-code/` | Register via invite code |
| POST | `/api/auth/join-request/` | Submit join request |
| POST | `/api/auth/generate-code/` | Generate invite code (Lord/Admin) |
| GET | `/api/auth/join-requests/` | List pending requests |
| POST | `/api/auth/join-requests/<id>/approve/` | Approve request |
| POST | `/api/auth/join-requests/<id>/reject/` | Reject request |
| GET | `/api/auth/my-users/` | List users under you |
| GET | `/api/auth/me/` | Current user info |

---

## 🛡 Roles & Permissions

| Role | Created By | Can Do |
|------|-----------|--------|
| **Lord** | `create_lord` command | Everything — manage all admins, all requests |
| **Admin** | Lord (code or approve) | Manage supervisors under them |
| **Supervisor** | Admin (code or approve) | View own profile (attendance coming soon) |