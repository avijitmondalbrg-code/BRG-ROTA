# BRG Smart Rota - Setup Guide

## 1. Prerequisites
- **Node.js**: Ensure Node.js is installed on your computer.
- **Supabase Account**: You have already set this up.

## 2. Install Dependencies
Open your terminal (Command Prompt or VS Code Terminal) in this project folder and run:

```bash
npm install
```

## 3. Database Setup (Supabase)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click on the **SQL Editor** icon (sidebar, usually looks like `>_`).
3. Click **New Query**.
4. Copy **ALL** the code from the file named `db_schema.sql` in this project.
5. Paste it into the Supabase SQL Editor.
6. Click **Run** (Green button).
   - This creates the tables (employees, shifts, assignments) needed for the app.

## 4. Run the Development Server
In your terminal, run:

```bash
npm run dev
```

- You will see a URL like `http://localhost:5173`.
- Hold **Ctrl** (or Cmd) and click that link to open the app in your browser.

## 5. Using the App
- **Login**: Click Login at the top right. Password is `admin`.
- **First Time**: If the schedule is empty, go to the **Manage** tab and click **Load Defaults** to add some sample staff and shifts.
- **Troubleshooting**: If you see "Database Error", verify your API keys in the `.env` file.
"# BRG-ROTA" 
