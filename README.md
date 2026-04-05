# Buck-It

Buck-It is an Expo React Native app with a FastAPI backend.

This README covers full local setup, including ngrok and all environment variables used by the project.

## Project Structure

- Frontend: root folder (Expo app)
- Backend: backend/

## Prerequisites

- Node.js 18+
- npm
- Python 3.10+
- ngrok
- Supabase project (URL, anon key, service role key)
- Gemini API key

## Environment Variables

Create two env files:

1. Frontend env file: .env (project root)
2. Backend env file: backend/.env

### Frontend .env (root)

Required:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_BASE_URL=https://YOUR_NGROK_DOMAIN.ngrok-free.app/api
```

Optional fallback:

```env
NGROK_URL=https://YOUR_NGROK_DOMAIN.ngrok-free.app
```

Notes:

- Prefer EXPO_PUBLIC_API_BASE_URL.
- The frontend normalizes API URLs automatically in src/services/apiClient.ts.
- If EXPO_PUBLIC_API_BASE_URL already ends with /api, it is used as-is.

### Backend .env (backend/.env)

Required:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
BROWSER_USE_API_KEY=YOUR_BROWSER_USE_API_KEY
```

Optional:

```env
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MODEL_NAME=gemini-1.5-flash
```

Notes:

- Backend reads SUPABASE_SERVICE_ROLE_KEY first, then SUPABASE_SERVICE_KEY.
- If GEMINI_MODEL and GEMINI_MODEL_NAME are both missing, backend defaults to gemini-1.5-flash.

## Local Run (with ngrok)

Use three terminals.

### Terminal 1: Backend

```powershell
cd backend
uvicorn main:app --reload
```

Expected local backend URL:

- http://127.0.0.1:8000

### Terminal 2: ngrok tunnel

```powershell
ngrok http 8000
```

Copy the HTTPS forwarding URL from ngrok, for example:

- https://abcd-1234.ngrok-free.app

Then set frontend env:

- EXPO_PUBLIC_API_BASE_URL=https://abcd-1234.ngrok-free.app/api

### Terminal 3: Expo frontend

```powershell
npm install
npx expo start
```

If you change .env values, restart Expo so new env vars are picked up.

## Health Checks

Backend health:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Backend through ngrok:

```powershell
Invoke-RestMethod https://YOUR_NGROK_DOMAIN.ngrok-free.app/health
```

## Common Issues

1. App cannot reach backend

- Confirm EXPO_PUBLIC_API_BASE_URL points to current ngrok URL.
- Ensure backend is running on port 8000.
- Restart Expo after editing env vars.

2. Supabase errors on startup

- Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in root .env.
- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.

3. AI features fail

- Verify GEMINI_API_KEY in backend/.env.
- Verify BROWSER_USE_API_KEY for concierge endpoints.

## Backend API Reference

See backend/README.md for route list and backend-specific details.
