# Bucket Backend

FastAPI backend for onboarding, bucket list items, buckets, and planning.

## Endpoints

- `GET /health`
- `POST /api/onboard`
- `GET /api/bucket-list-items`
- `POST /api/bucket-list-items`
- `GET /api/buckets`
- `POST /api/buckets`
- `POST /api/plan-bucket`

## Setup

1. Install `backend/requirements.txt`.
2. Fill in `backend/.env`.
3. Apply `backend/supabase/schema.sql` in Supabase.
4. Run `uvicorn app.main:app --reload` from the `backend` folder.

## What You Need To Fill In

### Required now

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anon public key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

### Required for real AI

- `GEMINI_API_KEY`: Gemini API key

### Required later for Browser Use

- `BROWSER_USE_API_URL`: Browser Use endpoint
- `BROWSER_USE_API_KEY`: Browser Use API key if needed

## Exact Run Commands

From the `backend` folder:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Exact Test Commands

### Health

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

### Buckets

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/buckets | ConvertTo-Json -Depth 6
```

### Bucket List Items

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/bucket-list-items | ConvertTo-Json -Depth 6
```

### Onboarding

```powershell
$body = @{
	city = 'San Diego'
	answer_one = 'I want to get back into taekwondo'
	answer_two = 'My ideal weekend is outdoors with friends'
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8000/api/onboard -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 8
```

### Plan Bucket

```powershell
$body = @{
	activity = 'Kayaking'
	city = 'San Diego'
	preferences = 'Beginner friendly and scenic'
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8000/api/plan-bucket -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 6
```

## Notes

- If Supabase is not configured, the API uses mock in-memory data.
- If Gemini is not configured, onboarding uses mock generated goals.
- If Browser Use is not configured, planning returns a mock plan card.
