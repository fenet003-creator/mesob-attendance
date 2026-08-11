# BG Mesob – Internship Attendance Management System

A web-based attendance management system for BG Mesob that replaces manual attendance sheets with a digital platform for administrators and interns.

## Features

### Admin (HR)
- Secure login with role-based access
- Dashboard with real-time attendance statistics
- Add, edit, delete, and search interns
- Monitor daily attendance
- Generate daily, weekly, and monthly reports
- Export reports to Excel
- Change password and manage settings

### Intern
- Secure login
- Check in / check out with automatic status detection
- View profile and attendance history
- View attendance statistics (Present, Late, Absent, percentage)

### Attendance Rules
| Check-in Time | Status |
|---------------|--------|
| Before 8:15 AM | Present |
| 8:15 AM – 8:30 AM | Late |
| No check-in | Absent |

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js with Express
- **Database:** MySQL

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [MySQL](https://www.mysql.com/) (v8+)

## Setup

### 1. Clone and install dependencies

```bash
cd bg-mesob-attendance
npm install
```

### 2. Configure environment

Copy the example env file and update your MySQL credentials:

```bash
copy .env.example .env
```

Edit `.env`:

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bg_mesob_attendance
JWT_SECRET=your_secure_random_string
JWT_EXPIRES_IN=8h
```

### 3. Initialize the database

Make sure MySQL is running, then:

```bash
npm run init-db
```

This creates the database, tables, and a default admin account:
- **Username:** `admin`
- **Password:** `admin123`

> Change the default admin password after first login.

### 4. Start the server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Admin workflow
1. Log in with admin credentials
2. Go to **Interns** → **Add Intern** to register new interns (creates login account automatically)
3. Monitor attendance on the **Dashboard**
4. Generate and export reports from the **Reports** page

### Intern workflow
1. Log in with credentials provided by admin
2. Click **Check In** when arriving, **Check Out** when leaving
3. View history and statistics on respective pages

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/interns` | List/search interns (admin) |
| POST | `/api/interns` | Create intern (admin) |
| PUT | `/api/interns/:id` | Update intern (admin) |
| DELETE | `/api/interns/:id` | Delete intern (admin) |
| POST | `/api/attendance/check-in` | Check in (intern) |
| POST | `/api/attendance/check-out` | Check out (intern) |
| GET | `/api/attendance/today` | Today's attendance |
| GET | `/api/attendance/history` | Attendance history |
| GET | `/api/attendance/stats` | Attendance statistics |
| GET | `/api/dashboard/summary` | Dashboard summary (admin) |
| GET | `/api/reports` | Generate report (admin) |
| GET | `/api/reports/export/excel` | Export Excel (admin) |

## Project Structure

```
bg-mesob-attendance/
├── database/
│   ├── schema.sql          # Database schema
│   └── init.js             # Database initialization script
├── public/
│   ├── admin/              # Admin pages
│   ├── intern/             # Intern pages
│   ├── css/                # Stylesheets
│   ├── js/                 # Client-side JavaScript
│   └── uploads/            # Profile photo uploads
├── server/
│   ├── config/db.js        # MySQL connection pool
│   ├── middleware/auth.js  # JWT authentication
│   ├── routes/             # API route handlers
│   ├── utils/              # Helper utilities
│   └── index.js            # Express app entry point
├── .env.example
└── package.json
```

## Future Enhancements

- QR code attendance
- Email/SMS notifications
- PDF export
- Analytics dashboard with charts
- Mobile-responsive improvements
