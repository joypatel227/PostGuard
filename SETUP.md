# 🚀 PostGuard — Partner Setup Guide

## Before You Start — Install These First

| Tool | Download |
|------|----------|
| Python 3.10+ | https://python.org/downloads |
| Node.js 18+ | https://nodejs.org |
| PostgreSQL 14+ | https://postgresql.org/download |

---

## Step 1 — Create PostgreSQL Database

Open **pgAdmin** → Query Tool, or open **psql** and run:

```sql
CREATE USER postguard_user WITH PASSWORD '1234';
CREATE DATABASE postguard_db OWNER postguard_user;
GRANT ALL PRIVILEGES ON DATABASE postguard_db TO postguard_user;
```

---

## Step 2 — Backend Setup

Open a terminal in the **PostGuard** folder:

```bash
cd backend
```

```bash
python -m venv venv
```

```bash
venv\Scripts\activate
```

```bash
pip install -r requirements.txt
```

```bash
python manage.py migrate
```

```bash
python manage.py create_lord
```
> ⬆ This creates YOUR lord account. Enter your email, name, phone, password when prompted.

```bash
python manage.py runserver
```
> ✅ Backend running at http://localhost:8000

---

## Step 3 — Frontend Setup

Open a **new terminal** in the **PostGuard** folder:

```bash
cd frontend
```

```bash
npm install
```

```bash
npm run dev
```
> ✅ Frontend running at http://localhost:5173

---

## Step 4 — Open the App

Go to 👉 **http://localhost:5173**

Log in with the lord account you created in Step 2.

---

## ⚠️ Both terminals must stay open while you work
- Terminal 1 = Django backend (`python manage.py runserver`)
- Terminal 2 = React frontend (`npm run dev`)
