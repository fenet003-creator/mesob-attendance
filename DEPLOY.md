# Deployment Guide

## Architecture

```
Browser → Vercel (static frontend) → Render (Express API) → PlanetScale (MySQL)
```

## Prerequisites

- Git installed
- GitHub account
- Vercel account (vercel.com)
- Render account (render.com)
- PlanetScale account (planetscale.com)

---

## Step 1: Push to GitHub

```bash
cd bg-mesob-attendance
git init
git add .
git commit -m "Initial commit: BG Mesob Attendance System"
```

Create a new repository on GitHub (name: `bg-mesob-attendance`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/bg-mesob-attendance.git
git push -u origin main
```

---

## Step 2: Set Up PlanetScale Database

1. Go to [planetscale.com](https://planetscale.com) and sign up
2. Create a new organization and database named `bg-mesob-attendance`
3. Create a branch `main`
4. Go to **Connect** → **Node.js** and copy the connection string
5. Note the `host`, `username`, and `password`

### Initialize Schema

Run locally with PlanetScale credentials in your `.env`:

```bash
npm run init-db
```

Or use the PlanetScale shell to run `database/schema.sql`.

### Default Admin Account
- **Username:** `admin`
- **Password:** `admin123`

Change this after first login!

---

## Step 3: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `bg-mesob-attendance-api`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server/index.js`
   - **Plan:** Free (or Starter for always-on)

### Environment Variables

Add these in Render's dashboard under **Environment**:

```
DB_HOST=aws.connect.psdb.cloud
DB_USER=your_planetscale_user
DB_PASSWORD=pscale_pw_xxxxx
DB_NAME=bg_mesob_attendance
DB_SSL=true
JWT_SECRET=generate-a-random-64-char-string-here
JWT_EXPIRES_IN=8h
ALLOWED_ORIGIN=https://bg-mesob-attendance.vercel.app
```

Generate a JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Verify

Visit `https://bg-mesob-attendance-api.onrender.com/api/health`
Should return: `{"status":"ok","timestamp":"..."}`

---

## Step 4: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **Add New** → **Project**
3. Import your GitHub repository: `bg-mesob-attendance`
4. Configure:
   - **Framework Preset:** Other
   - **Build Command:** (leave empty or `echo "static"`)
   - **Output Directory:** `public`
   - **Install Command:** (leave empty)
5. Click **Deploy**

### Verify

Visit `https://bg-mesob-attendance.vercel.app`
- Should show the login page
- Login with `admin` / `admin123`
- API calls should reach the Render backend

---

## Step 5: Post-Deploy Checklist

- [ ] Login as admin (admin/admin123)
- [ ] Change the default admin password
- [ ] Create a test intern
- [ ] Login as the test intern
- [ ] Check in and check out
- [ ] View admin dashboard (should show attendance)
- [ ] View reports and export Excel
- [ ] Test profile photo upload
- [ ] Test mobile responsiveness (hamburger menu)

---

## Service URLs

| Service | URL |
|---------|-----|
| GitHub | `https://github.com/YOUR_USERNAME/bg-mesob-attendance` |
| Vercel (Frontend) | `https://bg-mesob-attendance.vercel.app` |
| Render (Backend) | `https://bg-mesob-attendance-api.onrender.com` |
| PlanetScale (DB) | Connection string from dashboard |

## Cost

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | Free |
| Render | Free tier | Free (spins down after 15min idle) |
| PlanetScale | Scaler | Free (5GB, 1B reads/mo) |
| **Total** | | **$0/month** |

> **Note:** Render free tier spins down after 15 min of inactivity. First request after idle takes ~30s to wake up. Upgrade to $7/mo Starter for always-on.
