import copy
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

import main
from routers import bucket_comments, bucket_invitations, bucket_list, bucket_media, buckets, concierge, onboard, plan_bucket_from_list, users


class FakeQuery:
    def __init__(self, supabase, table_name):
        self.supabase = supabase
        self.table_name = table_name
        self.filters = []
        self.order_by = None
        self.order_desc = False
        self.limit_count = None
        self.operation = "select"
        self.payload = None

    def select(self, _columns="*"):
        self.operation = "select"
        return self

    def eq(self, key, value):
        self.filters.append(("eq", key, value))
        return self

    def in_(self, key, values):
        self.filters.append(("in", key, set(values)))
        return self

    def gte(self, key, value):
        self.filters.append(("gte", key, value))
        return self

    def order(self, key, desc=False):
        self.order_by = key
        self.order_desc = desc
        return self

    def limit(self, count):
        self.limit_count = count
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = payload
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def execute(self):
        if self.operation == "insert":
            return self._execute_insert()
        if self.operation == "update":
            return self._execute_update()
        if self.operation == "delete":
            return self._execute_delete()
        return self._execute_select()

    def _matching_rows(self):
        rows = self.supabase.tables.setdefault(self.table_name, [])
        matched = []
        for row in rows:
            include = True
            for filter_type, key, value in self.filters:
                row_value = row.get(key)
                if filter_type == "eq" and row_value != value:
                    include = False
                    break
                if filter_type == "in" and row_value not in value:
                    include = False
                    break
                if filter_type == "gte" and (row_value is None or row_value < value):
                    include = False
                    break
            if include:
                matched.append(row)
        return matched

    def _decorate_row(self, row):
        result = copy.deepcopy(row)
        if self.table_name in {"bucket_members", "bucket_comments", "bucket_media"}:
            user_id = row.get("user_id")
            if user_id:
                user = next((item for item in self.supabase.tables.get("users", []) if item.get("id") == user_id), None)
                if user:
                    result["users"] = {
                        "id": user.get("id"),
                        "display_name": user.get("display_name"),
                    }
        return result

    def _execute_select(self):
        rows = [self._decorate_row(row) for row in self._matching_rows()]
        if self.order_by:
            rows = sorted(rows, key=lambda item: item.get(self.order_by) or "", reverse=self.order_desc)
        if self.limit_count is not None:
            rows = rows[: self.limit_count]
        return SimpleNamespace(data=rows)

    def _execute_insert(self):
        payloads = self.payload if isinstance(self.payload, list) else [self.payload]
        inserted = []
        for payload in payloads:
            row = copy.deepcopy(payload)
            row.setdefault("id", str(uuid4()))
            row.setdefault("created_at", self.supabase.timestamp)
            if self.table_name == "bucket_members":
                row.setdefault("joined_at", self.supabase.timestamp)
            if self.table_name == "bucket_comments":
                row.setdefault("updated_at", self.supabase.timestamp)
            self.supabase.tables.setdefault(self.table_name, []).append(row)
            inserted.append(copy.deepcopy(row))
        return SimpleNamespace(data=inserted)

    def _execute_update(self):
        updated = []
        for row in self._matching_rows():
            row.update(copy.deepcopy(self.payload))
            if self.table_name == "bucket_comments":
                row["updated_at"] = self.supabase.timestamp
            updated.append(copy.deepcopy(row))
        return SimpleNamespace(data=updated)

    def _execute_delete(self):
        rows = self.supabase.tables.setdefault(self.table_name, [])
        remaining = []
        deleted = []
        matched_ids = {id(row) for row in self._matching_rows()}
        for row in rows:
            if id(row) in matched_ids:
                deleted.append(copy.deepcopy(row))
            else:
                remaining.append(row)
        self.supabase.tables[self.table_name] = remaining
        return SimpleNamespace(data=deleted)


class FakeSupabase:
    def __init__(self, initial_tables=None):
        self.tables = copy.deepcopy(initial_tables or {})
        self.timestamp = "2026-04-04T12:00:00+00:00"

    def table(self, table_name):
        return FakeQuery(self, table_name)


class BackendAuditTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.original_overrides = dict(main.app.dependency_overrides)

    def tearDown(self):
        main.app.dependency_overrides = self.original_overrides

    def _patch_supabase(self, fake_supabase):
        return patch.multiple(
            "routers",
        )

    def _module_patches(self, fake_supabase):
        return [
            patch.object(users, "supabase", fake_supabase),
            patch.object(bucket_list, "supabase", fake_supabase),
            patch.object(buckets, "supabase", fake_supabase),
            patch.object(bucket_invitations, "supabase", fake_supabase),
            patch.object(bucket_comments, "supabase", fake_supabase),
            patch.object(bucket_media, "supabase", fake_supabase),
            patch.object(concierge, "supabase", fake_supabase),
            patch.object(plan_bucket_from_list, "supabase", fake_supabase),
        ]

    def test_health_and_open_access(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

        fake = FakeSupabase({"users": []})
        patches = self._module_patches(fake)
        for item in patches:
            item.start()
        self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

        protected = self.client.get("/api/users/test-user")
        self.assertEqual(protected.status_code, 200)
        self.assertEqual(protected.json()["status"], "success")

    def test_user_bucket_list_and_discover_routes_are_open(self):
        fake = FakeSupabase({
            "users": [{"id": "user-1", "display_name": "Pranav", "location": "San Diego", "badges": []}],
            "bucket_list_items": [{
                "id": "item-1",
                "user_id": "user-1",
                "title": "Find great tacos",
                "deadline": None,
            }],
            "buckets": [{
                "id": "bucket-1",
                "creator_id": "other-user",
                "title": "Taco Tuesday",
                "category": "Social & Nightlife",
                "event_time": "2026-06-15T18:00:00+00:00",
                "status": "planned",
                "visibility": "public",
                "created_at": "2026-04-04T12:00:00+00:00",
            }],
            "bucket_members": [],
            "bucket_invitations": [],
        })

        patches = self._module_patches(fake)
        for item in patches:
            item.start()
        self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

        user_response = self.client.get("/api/users/user-1")
        bucket_list_response = self.client.get("/api/bucket-list/user-1")
        discover_response = self.client.get("/api/buckets/discover/user-1")

        self.assertEqual(user_response.status_code, 200)
        self.assertEqual(bucket_list_response.status_code, 200)
        self.assertEqual(discover_response.status_code, 200)
        self.assertEqual(user_response.json()["status"], "success")
        self.assertEqual(bucket_list_response.json()["status"], "success")
        self.assertEqual(discover_response.json()["status"], "success")

    def test_create_bucket_adds_creator_membership_and_is_visible(self):
        fake = FakeSupabase({
            "users": [{"id": "user-1", "display_name": "Pranav", "location": "San Diego", "badges": []}],
            "buckets": [],
            "bucket_members": [],
            "bucket_invitations": [],
        })

        patches = self._module_patches(fake)
        for item in patches:
            item.start()
        self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

        response = self.client.post(
            "/api/buckets/",
            json={
                "creator_id": "user-1",
                "title": "Torrey Pines Hike",
                "category": "hiking",
                "event_time": "2026-05-01T08:00:00+00:00",
                "visibility": "private",
            },
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "success")
        self.assertEqual(len(body["data"]["members"]), 1)
        self.assertEqual(body["data"]["members"][0]["role"], "creator")

        buckets_response = self.client.get("/api/buckets/user/user-1")
        self.assertEqual(buckets_response.status_code, 200)
        self.assertEqual(len(buckets_response.json()["data"]), 1)

    def test_get_all_buckets_returns_all_buckets_without_auth(self):
        fake = FakeSupabase({
            "users": [
                {"id": "user-1", "display_name": "Pranav", "location": "San Diego", "badges": []},
                {"id": "user-2", "display_name": "Other", "location": "San Diego", "badges": []},
            ],
            "buckets": [
                {
                    "id": "private-bucket",
                    "creator_id": "user-2",
                    "title": "Private Surf Trip",
                    "category": "surfing",
                    "event_time": "2026-06-02T08:00:00+00:00",
                    "status": "planned",
                    "visibility": "private",
                    "created_at": "2026-04-04T12:00:00+00:00",
                },
                {
                    "id": "public-bucket",
                    "creator_id": "user-2",
                    "title": "Public Beach Cleanup",
                    "category": "Travel & Adventure",
                    "event_time": "2026-06-03T08:00:00+00:00",
                    "status": "planned",
                    "visibility": "public",
                    "created_at": "2026-04-04T12:00:00+00:00",
                },
            ],
            "bucket_members": [],
            "bucket_invitations": [],
        })

        patches = self._module_patches(fake)
        for item in patches:
            item.start()
        self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

        response = self.client.get("/api/buckets/")
        self.assertEqual(response.status_code, 200)
        titles = [bucket["title"] for bucket in response.json()["data"]]
        self.assertIn("Public Beach Cleanup", titles)
        self.assertIn("Private Surf Trip", titles)

    def test_join_public_bucket_creates_membership(self):
        fake = FakeSupabase({
            "users": [
                {"id": "creator-1", "display_name": "Creator", "location": "San Diego", "badges": []},
                {"id": "user-2", "display_name": "Joiner", "location": "San Diego", "badges": []},
            ],
            "buckets": [{
                "id": "bucket-1",
                "creator_id": "creator-1",
                "title": "Beach Bonfire",
                "category": "Social & Nightlife",
                "event_time": "2026-06-01T19:00:00+00:00",
                "status": "planned",
                "visibility": "public",
                "created_at": "2026-04-04T12:00:00+00:00",
            }],
            "bucket_members": [{
                "id": "member-1",
                "bucket_id": "bucket-1",
                "user_id": "creator-1",
                "role": "creator",
                "joined_at": "2026-04-04T12:00:00+00:00",
            }],
            "bucket_invitations": [],
        })

        patches = self._module_patches(fake)
        for item in patches:
            item.start()
        self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

        response = self.client.post("/api/buckets/bucket-1/join", json={"actor_id": "user-2"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(row["user_id"] == "user-2" for row in fake.tables["bucket_members"]))

    def test_accept_invitation_creates_membership_and_updates_visibility(self):
        fake = FakeSupabase({
            "users": [
                {"id": "creator-1", "display_name": "Creator", "location": "San Diego", "badges": []},
                {"id": "invitee-1", "display_name": "Invitee", "location": "San Diego", "badges": []},
            ],
            "buckets": [{
                "id": "bucket-1",
                "creator_id": "creator-1",
                "title": "Surf Lesson",
                "category": "surfing",
                "event_time": "2026-06-05T08:00:00+00:00",
                "status": "planned",
                "visibility": "private",
                "created_at": "2026-04-04T12:00:00+00:00",
            }],
            "bucket_members": [{
                "id": "member-1",
                "bucket_id": "bucket-1",
                "user_id": "creator-1",
                "role": "creator",
                "joined_at": "2026-04-04T12:00:00+00:00",
            }],
            "bucket_invitations": [{
                "id": "invite-1",
                "bucket_id": "bucket-1",
                "inviter_id": "creator-1",
                "invitee_id": "invitee-1",
                "status": "pending",
                "created_at": "2026-04-04T12:00:00+00:00",
            }],
        })

        patches = self._module_patches(fake)
        for item in patches:
            item.start()
        self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

        response = self.client.patch("/api/bucket-invitations/invite-1", json={"actor_id": "invitee-1", "status": "accepted"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(row["user_id"] == "invitee-1" for row in fake.tables["bucket_members"]))
        self.assertEqual(fake.tables["buckets"][0]["visibility"], "shared")

    def test_plan_bucket_from_list_returns_formatted_card_list(self):
        fake = FakeSupabase({
            "users": [{"id": "user-1", "display_name": "Pranav", "location": "San Diego", "badges": []}],
            "bucket_list_items": [{
                "id": "item-1",
                "user_id": "user-1",
                "title": "Find great wings",
                "deadline": None,
            }],
        })

        patches = self._module_patches(fake)
        for item in patches:
            item.start()
        self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

        with patch.object(plan_bucket_from_list, "_generate_search_text", return_value="Find wings in San Diego"), \
             patch.object(plan_bucket_from_list, "run_browser_use_plan", AsyncMock(return_value="raw scraped data")), \
             patch.object(plan_bucket_from_list, "format_bucket_cards", return_value=[{
                 "title": "Dirty Birds",
                 "category": "Social & Nightlife",
                 "description": "Great wings and game-day vibe",
             }]):
            response = self.client.post(
                "/api/plan-bucket-from-list",
                json={"user_id": "user-1", "bucket_list_item_id": "item-1"},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "success")
        self.assertIsInstance(body["data"], list)
        self.assertEqual(body["data"][0]["title"], "Dirty Birds")

    def test_bucket_comment_and_media_routes_work_for_members(self):
        fake = FakeSupabase({
            "users": [{"id": "user-1", "display_name": "Pranav", "location": "San Diego", "badges": []}],
            "buckets": [{
                "id": "bucket-1",
                "creator_id": "user-1",
                "title": "Sunrise Hike",
                "category": "hiking",
                "event_time": "2026-06-10T06:00:00+00:00",
                "status": "active",
                "visibility": "private",
                "created_at": "2026-04-04T12:00:00+00:00",
            }],
            "bucket_members": [{
                "id": "member-1",
                "bucket_id": "bucket-1",
                "user_id": "user-1",
                "role": "creator",
                "joined_at": "2026-04-04T12:00:00+00:00",
            }],
            "bucket_comments": [],
            "bucket_media": [],
        })

        patches = self._module_patches(fake)
        for item in patches:
            item.start()
        self.addCleanup(lambda: [item.stop() for item in reversed(patches)])

        comment_response = self.client.post(
            "/api/bucket-comments/",
            json={"bucket_id": "bucket-1", "actor_id": "user-1", "content": "Meet at the trailhead at 6."},
        )
        media_response = self.client.post(
            "/api/bucket-media/",
            json={
                "bucket_id": "bucket-1",
                "actor_id": "user-1",
                "media_type": "image",
                "public_url": "https://example.com/sunrise.jpg",
                "caption": "Worth the early alarm",
            },
        )

        self.assertEqual(comment_response.status_code, 200)
        self.assertEqual(media_response.status_code, 200)
        self.assertEqual(len(fake.tables["bucket_comments"]), 1)
        self.assertEqual(len(fake.tables["bucket_media"]), 1)


if __name__ == "__main__":
    unittest.main()