# 🚀 Deploying to MongoDB Atlas & Cloud Hosting

This guide explains how to connect your Notice Board to **MongoDB Atlas (Free Cloud Database)** and deploy it online (on **Render**, **Railway**, or **Vercel**).

---

## 🍃 Step 1: Set Up MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in or create a free account.
2. Click **Create a Deployment** and select the **M0 Free Cluster**.
3. **Database Access (Create Database User)**:
   * Go to **Security** → **Database Access** in the left sidebar.
   * Click **Add New Database User**.
   * Choose **Password Authentication**.
   * Username: e.g. `noticeadmin`
   * Password: Click **Autogenerate Secure Password** or choose one (e.g. `VignanNotice2026!`). **Copy and save this password.**
   * Database User Privileges: Select **Read and write to any database** (Atlas admin).
   * Click **Add User**.
4. **Network Access (Allow Cloud Connections)**:
   * Go to **Security** → **Network Access** in the left sidebar.
   * Click **Add IP Address**.
   * Click **Allow Access from Anywhere** (`0.0.0.0/0`). *(Required for cloud deployment so your hosted server can connect).*
   * Click **Confirm**.
5. **Get Your Connection String**:
   * Go to **Database** (Clusters) in the left sidebar.
   * Click **Connect**.
   * Select **Drivers** (Node.js).
   * Copy the connection string. It will look like this:
     ```
     mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
     ```
   * Replace `<password>` with your database user password, and add `/notice-board` right before `?`:
     ```
     mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
     ```

---

## 💻 Step 2: Test MongoDB Atlas Locally Before Deploying

1. Open `server/.env` in your project.
2. Update the `MONGODB_URI` line with your Atlas connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
   ```
3. Seed the sample notices and demo accounts directly into Atlas:
   ```bash
   npm run seed --prefix server
   ```
   You should see:
   ```
   Connecting to MongoDB Atlas (Cloud)...
   ✓ Connected to MongoDB
   ✓ Seeded users with roles, admin types, and reg numbers.
   ✓ Seeded notices with audience rules.
   ```

---

## 🌐 Step 3: Deploy Online in 5 Minutes (Render.com - Recommended)

Render provides free hosting for Node.js backends and full-stack apps.

### Option A: Deploy Both Frontend & Backend on One Web Service

Because `server.js` serves the production build in `/dist` automatically, you can deploy the complete project on a single Render Web Service:

1. Push your project to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   * **Name**: `vignan-notice-board`
   * **Region**: Nearest to you (e.g., Singapore / Frankfurt)
   * **Branch**: `main`
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm install && npm run build && npm install --prefix server
     ```
   * **Start Command**:
     ```bash
     node server/server.js
     ```
5. Click **Advanced** → **Add Environment Variables**:
   * `NODE_ENV`: `production`
   * `PORT`: `5000` (Render binds automatically)
   * `MONGODB_URI`: mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority

   * `JWT_SECRET`: *Any secure random string*
   * `CLIENT_ORIGIN`: `*`
6. Click **Create Web Service**.
7. Render will build the React app, connect to MongoDB Atlas, and give you a live URL (e.g. `https://vignan-notice-board.onrender.com`)!

---

### Option B: Deploy Backend on Render, Frontend on Vercel

If you prefer keeping them separate:
1. **Backend on Render**:
   * Root Directory: `server`
   * Build Command: `npm install`
   * Start Command: `node server.js`
   * Environment Variable: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN=https://your-app.vercel.app`
2. **Frontend on Vercel**:
   * Import repo on [Vercel](https://vercel.com).
   * Framework Preset: `Vite`
   * Environment Variable: `VITE_API_URL=https://your-render-backend.onrender.com/api`
   * Deploy!
