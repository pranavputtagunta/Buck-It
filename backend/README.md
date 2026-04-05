# Bucket Backend

FastAPI backend for users, bucket lists, buckets, invitations, onboarding, and AI planning.

## Current Routes

- `GET /`
- `GET /health`
- `POST /api/onboard/`
- `GET /api/users/{user_id}`
- `POST /api/users/`
- `PATCH /api/users/{user_id}/badges`
- `POST /api/bucket-list/`
- `POST /api/bucket-list/bulk`
- `GET /api/bucket-list/{user_id}`
- `GET /api/bucket-list/item/{item_id}`
- `PATCH /api/bucket-list/{item_id}`
- `DELETE /api/bucket-list/{item_id}`
- `GET /api/buckets/`
- `GET /api/buckets/feed/global`
- `GET /api/buckets/discover/{user_id}`
- `GET /api/buckets/discover-page/{user_id}`
- `GET /api/buckets/user/{user_id}`
- `GET /api/buckets/user/{user_id}/grouped`
- `GET /api/buckets/{bucket_id}`
- `POST /api/buckets/`
- `POST /api/buckets/accept-discover`
- `POST /api/buckets/{bucket_id}/join`
- `POST /api/buckets/{bucket_id}/clone`
- `PATCH /api/buckets/{bucket_id}`
- `PATCH /api/buckets/{bucket_id}/status`
- `DELETE /api/buckets/{bucket_id}`
- `DELETE /api/buckets/{bucket_id}/members/{member_user_id}`
- `GET /api/buckets/list-item/{bucket_list_item_id}`
- `GET /api/bucket-comments/bucket/{bucket_id}`
- `POST /api/bucket-comments/`
- `PATCH /api/bucket-comments/{comment_id}`
- `DELETE /api/bucket-comments/{comment_id}`
- `GET /api/bucket-media/bucket/{bucket_id}`
- `POST /api/bucket-media/`
- `DELETE /api/bucket-media/{media_id}`
- `POST /api/bucket-invitations/`
- `GET /api/bucket-invitations/user/{user_id}`
- `PATCH /api/bucket-invitations/{invitation_id}`
- `DELETE /api/bucket-invitations/{invitation_id}`
- `POST /api/concierge/plan-bucket`
- `POST /api/plan-bucket-from-list`

## Setup

1. Install `backend/requirements.txt`.
2. Fill in `backend/.env`.
3. Make sure your existing Supabase project has the tables this backend expects.
4. Run the API from the `backend` folder.

## Environment Variables

### Required

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `BROWSER_USE_API_KEY`

## Access

- All API routes are intentionally open and do not use login or bearer tokens.
- The backend trusts client-provided `user_id` and `actor_id` values.
- Access control is handled by app rules such as creator ownership, bucket membership, and invitation status.
- `GET /health` and `GET /` remain public.

## Run Command

From the `backend` folder:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

## Quick Checks

### Backend Audit Suite

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_backend_audit -v
```

### Health

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

### Buckets

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/buckets/ | ConvertTo-Json -Depth 8
```

### Plan Bucket From List

```powershell
$body = @{
    user_id = '<user-id>'
    bucket_list_item_id = '<bucket-list-item-id>'
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8000/api/plan-bucket-from-list -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 8
```

### Join a Public Bucket

```powershell
$body = @{
    actor_id = '<user-id>'
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8000/api/buckets/<bucket-id>/join -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 8
```

### Add a Bucket Comment

```powershell
$body = @{
    bucket_id = '<bucket-id>'
    actor_id = '<user-id>'
    content = 'I can bring snacks.'
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8000/api/bucket-comments/ -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 8
```

### Add Bucket Media Metadata

```powershell
$body = @{
    bucket_id = '<bucket-id>'
    actor_id = '<user-id>'
    media_type = 'image'
    public_url = 'https://example.com/photo.jpg'
    caption = 'Sunrise was worth it.'
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8000/api/bucket-media/ -Method Post -ContentType 'application/json' -Body $body | ConvertTo-Json -Depth 8
```

## Notes

- Bucket creators are now automatically added to `bucket_members`.
- Invitation acceptance now creates membership in backend code instead of relying on a database trigger.
- Media endpoints store metadata only; files should be uploaded directly to Supabase Storage or another file host and then referenced by `public_url`.
