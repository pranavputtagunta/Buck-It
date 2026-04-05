from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import supabase


router = APIRouter(prefix="/api/bucket-invitations", tags=["Bucket Invitations"])


class BucketInvitationCreate(BaseModel):
    bucket_id: str
    inviter_id: str
    invitee_id: str


class BucketInvitationDecision(BaseModel):
    actor_id: str
    status: str


def _sync_bucket_visibility(bucket_id: str) -> None:
    bucket_response = (
        supabase.table("buckets")
        .select("id, visibility")
        .eq("id", bucket_id)
        .execute()
    )

    if not bucket_response.data:
        return

    bucket = bucket_response.data[0]
    if bucket.get("visibility") == "public":
        return

    members_response = (
        supabase.table("bucket_members")
        .select("id")
        .eq("bucket_id", bucket_id)
        .execute()
    )
    member_count = len(members_response.data or [])
    visibility = "shared" if member_count > 1 else "private"

    supabase.table("buckets").update({"visibility": visibility}).eq("id", bucket_id).execute()


def _mark_bucket_shared(bucket_id: str) -> None:
    bucket_response = (
        supabase.table("buckets")
        .select("id, visibility")
        .eq("id", bucket_id)
        .execute()
    )

    if not bucket_response.data:
        return

    if bucket_response.data[0].get("visibility") != "public":
        supabase.table("buckets").update({"visibility": "shared"}).eq("id", bucket_id).execute()


def _ensure_bucket_membership(bucket_id: str, user_id: str, role: str = "member") -> None:
    membership_response = (
        supabase.table("bucket_members")
        .select("id")
        .eq("bucket_id", bucket_id)
        .eq("user_id", user_id)
        .execute()
    )

    if membership_response.data:
        return

    supabase.table("bucket_members").insert({
        "bucket_id": bucket_id,
        "user_id": user_id,
        "role": role,
    }).execute()


def _get_invitation(invitation_id: str) -> dict:
    invitation_response = (
        supabase.table("bucket_invitations")
        .select("*")
        .eq("id", invitation_id)
        .execute()
    )

    if not invitation_response.data:
        raise HTTPException(status_code=404, detail="Invitation not found")

    return invitation_response.data[0]


def _get_bucket(bucket_id: str) -> dict:
    bucket_response = supabase.table("buckets").select("id, creator_id").eq("id", bucket_id).execute()
    if not bucket_response.data:
        raise HTTPException(status_code=404, detail="Bucket not found")
    return bucket_response.data[0]


@router.post("/")
async def create_bucket_invitation(payload: BucketInvitationCreate):
    try:
        bucket = _get_bucket(payload.bucket_id)
        if bucket["creator_id"] != payload.inviter_id:
            raise HTTPException(status_code=403, detail="Only the bucket creator can send invitations")

        invite_response = supabase.table("bucket_invitations").insert({
            "bucket_id": payload.bucket_id,
            "inviter_id": payload.inviter_id,
            "invitee_id": payload.invitee_id,
            "status": "pending",
        }).execute()
        return {"status": "success", "data": invite_response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_bucket_invitations(user_id: str):
    try:
        response = (
            supabase.table("bucket_invitations")
            .select("*")
            .eq("invitee_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{invitation_id}")
async def respond_to_bucket_invitation(invitation_id: str, payload: BucketInvitationDecision):
    try:
        if payload.status not in {"accepted", "declined", "cancelled"}:
            raise HTTPException(status_code=400, detail="Status must be accepted, declined, or cancelled")

        invitation = _get_invitation(invitation_id)
        bucket_id = invitation["bucket_id"]
        bucket = _get_bucket(bucket_id)

        if payload.status in {"accepted", "declined"} and invitation["invitee_id"] != payload.actor_id:
            raise HTTPException(status_code=403, detail="Only the invited user can accept or decline this invitation")

        if payload.status == "cancelled" and payload.actor_id not in {invitation["inviter_id"], bucket["creator_id"]}:
            raise HTTPException(status_code=403, detail="Only the inviter or bucket creator can cancel this invitation")

        response = (
            supabase.table("bucket_invitations")
            .update({"status": payload.status})
            .eq("id", invitation_id)
            .execute()
        )

        if payload.status == "accepted":
            _ensure_bucket_membership(bucket_id, payload.actor_id)
            _mark_bucket_shared(bucket_id)

        return {"status": "success", "data": response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{invitation_id}")
async def delete_bucket_invitation(invitation_id: str, actor_id: str):
    try:
        invitation = _get_invitation(invitation_id)
        bucket = _get_bucket(invitation["bucket_id"])

        if actor_id not in {invitation["inviter_id"], bucket["creator_id"]}:
            raise HTTPException(status_code=403, detail="Only the inviter or bucket creator can delete this invitation")

        supabase.table("bucket_invitations").delete().eq("id", invitation_id).execute()
        return {"status": "success", "message": "Bucket invitation deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))