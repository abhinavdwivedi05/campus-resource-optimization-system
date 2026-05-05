from datetime import datetime
import csv
import io
import uuid
from pathlib import Path

import pandas as pd
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId

from database import users_collection, complaints_collection, timetable_collection

app = FastAPI()

# ----------------------
# Static uploads (complaint images)
# ----------------------
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Allow React frontend (include custom X-User-Role header)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# TEST DATA
# ----------------------

users = [
    {"email": "admin@test.com", "password": "1234"}
]

complaints = [
    {
        "title": "Broken Chair",
        "description": "Chair in A101 is broken",
        "status": "Pending"
    }
]

timetable = [
    {
        "course": "CS101",
        "faculty": "Dr Sharma",
        "room": "A101",
        "timeslot": "9AM"
    },
    {
        "course": "CS102",
        "faculty": "Dr Gupta",
        "room": "B201",
        "timeslot": "10AM"
    }
]


# ----------------------
# Role helper (FastAPI Depends - reliable for RBAC)
# ----------------------

def require_roles(*allowed_roles):
    """
    Dependency that enforces role-based access using X-User-Role header.
    Frontend must send: headers["X-User-Role"] = localStorage.getItem("role")

    Usage:
    @app.get("/complaints", dependencies=[Depends(require_roles("admin", "guard", "student"))])
    def get_complaints():
        ...
    """

    def role_checker(
        x_user_role: str = Header(None, alias="X-User-Role"),
    ):
        role = (x_user_role or "").strip().lower()
        print(f"[RBAC] User role: {repr(role)}, allowed: {allowed_roles}")
        if not role or role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role: one of {allowed_roles}",
            )
        return role

    return role_checker


# ----------------------
# APIs
# ----------------------

@app.get("/")
def home():
    return {"message": "Campus API running"}

@app.post("/login")
def login(data: dict):
    user = users_collection.find_one(
        {
            "email": data.get("email"),
            "password": data.get("password"),
        }
    )

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role = user.get("role", "student")
    name = user.get("name", "")

    return {"message": "Login successful", "role": role, "name": name}


@app.post("/register")
def register(data: dict):
    """
    Register a new user.

    Expected fields:
    - name
    - email
    - password
    - role: student | faculty | guard
    - department
    """
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    role = (data.get("role") or "student").strip().lower()
    department = (data.get("department") or "").strip()

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="name, email and password are required")

    allowed_registration_roles = {"student", "faculty", "guard"}
    if role not in allowed_registration_roles:
        raise HTTPException(status_code=400, detail="Invalid role for registration")

    existing = users_collection.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    users_collection.insert_one(
        {
            "name": name,
            "email": email,
            "password": password,
            "role": role,
            "department": department,
            "created_at": datetime.utcnow(),
        }
    )

    return {"message": "User registered successfully"}

@app.get("/complaints", dependencies=[Depends(require_roles("admin", "guard", "student"))])
def get_complaints():
    """
    Get all complaints from MongoDB.
    """
    complaints = []

    for c in complaints_collection.find():
        c["_id"] = str(c["_id"])
        complaints.append(c)

    return complaints


@app.post("/complaint", dependencies=[Depends(require_roles("admin", "student"))])
async def create_complaint(
    title: str = Form(""),
    description: str = Form(""),
    location: str = Form(""),
    priority: str = Form("Medium"),
    image: Optional[UploadFile] = File(None),
):
    """
    Create a new complaint.

    Accepts multipart/form-data (used by the React form):
    - title: string
    - description: string
    - location: string
    - priority: Low | Medium | High
    - image: optional file
    """
    print(
        "[complaint:create] incoming:",
        {
            "title": (title or "")[:80],
            "location": (location or "")[:80],
            "priority": priority,
            "hasImage": bool(image),
            "imageFilename": getattr(image, "filename", None),
            "imageContentType": getattr(image, "content_type", None),
        },
    )

    doc = {
        "title": (title or "").strip(),
        "description": (description or "").strip(),
        "location": (location or "").strip(),
        "priority": (priority or "Medium").strip() or "Medium",
        "status": "Pending",
        "created_at": datetime.utcnow(),
    }

    allowed_priorities = {"Low", "Medium", "High"}
    if doc["priority"] not in allowed_priorities:
        raise HTTPException(status_code=400, detail="Invalid priority. Use Low, Medium, or High.")

    if not doc["title"] or not doc["description"] or not doc["location"]:
        raise HTTPException(
            status_code=400,
            detail="title, description and location are required",
        )

    # Persist image to disk (optional) and store a URL the frontend can render.
    if image is not None and getattr(image, "filename", None):
        original_name = (image.filename or "").strip()
        suffix = Path(original_name).suffix.lower()
        # Basic safety: keep a reasonable extension; default when missing.
        if not suffix or len(suffix) > 10:
            suffix = ".jpg"

        stored_name = f"{uuid.uuid4().hex}{suffix}"
        stored_path = UPLOAD_DIR / stored_name

        try:
            content = await image.read()
            stored_path.write_bytes(content)
        except Exception as e:
            print("[complaint:create] image save failed:", repr(e))
            raise HTTPException(status_code=500, detail="Could not save uploaded image")

        doc["image"] = {
            "original_filename": original_name,
            "stored_filename": stored_name,
            "content_type": getattr(image, "content_type", None),
        }
        doc["image_url"] = f"/uploads/{stored_name}"

    try:
        result = complaints_collection.insert_one(doc)
    except Exception as e:
        print("[complaint:create] insert failed:", repr(e))
        raise HTTPException(status_code=500, detail="Database insert failed")

    complaint_id = str(result.inserted_id)
    doc["_id"] = complaint_id

    return {"message": "Complaint created", "complaint": doc}


@app.put("/complaint/{complaint_id}", dependencies=[Depends(require_roles("admin", "guard"))])
def update_complaint_status(complaint_id: str, data: dict):
    """
    Update status of a complaint.

    Allowed values:
    - Pending
    - In Progress
    - Resolved
    """
    new_status = data.get("status")
    allowed_statuses = {"Pending", "In Progress", "Resolved"}

    if new_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status value")

    try:
        obj_id = ObjectId(complaint_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid complaint ID")

    result = complaints_collection.update_one(
        {"_id": obj_id},
        {"$set": {"status": new_status}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return {"message": "Status updated"}

@app.get("/timetable", dependencies=[Depends(require_roles("admin", "student", "faculty"))])
def get_timetable():
    """
    Get all timetable entries.
    """
    entries = list(timetable_collection.find())

    # Normalize and make frontend-friendly
    for e in entries:
        e["_id"] = str(e["_id"])
        # Backwards-compat: legacy entries might not have day set
        if not (e.get("day") or "").strip():
            e["day"] = "Monday"

    def norm_str(v) -> str:
        return (v or "").strip()

    # Compute conflict_type per entry.
    # Priority: room_clash > faculty_clash > capacity_overflow > normal
    faculty_slots = {}
    room_slots = {}
    for e in entries:
        day = norm_str(e.get("day")) or "Monday"
        timeslot = norm_str(e.get("timeslot"))
        faculty = norm_str(e.get("faculty"))
        room = norm_str(e.get("room"))
        if faculty and day and timeslot:
            faculty_slots.setdefault((faculty, day, timeslot), []).append(e)
        if room and day and timeslot:
            room_slots.setdefault((room, day, timeslot), []).append(e)

    room_clash_ids = set()
    for items in room_slots.values():
        if len(items) > 1:
            for e in items:
                if e.get("_id") is not None:
                    room_clash_ids.add(str(e.get("_id")))

    faculty_clash_ids = set()
    for items in faculty_slots.values():
        if len(items) > 1:
            for e in items:
                if e.get("_id") is not None:
                    faculty_clash_ids.add(str(e.get("_id")))

    for e in entries:
        eid = str(e.get("_id"))
        students = int(e.get("students", 0) or 0)
        capacity = int(e.get("capacity", 0) or 0)

        if eid in room_clash_ids:
            e["conflict_type"] = "room_clash"
        elif eid in faculty_clash_ids:
            e["conflict_type"] = "faculty_clash"
        elif capacity and students > capacity:
            e["conflict_type"] = "capacity_overflow"
        else:
            e["conflict_type"] = "normal"

    return entries


@app.post("/timetable", dependencies=[Depends(require_roles("admin", "faculty"))])
def add_timetable_entry(data: dict):
    """
    Add a new timetable entry.

    Expected fields:
    - course: string
    - faculty: string
    - room: string
    - day: string
    - timeslot: string
    - students: number
    - capacity: number
    """
    doc = {
        "course": data.get("course", "").strip(),
        "faculty": data.get("faculty", "").strip(),
        "room": data.get("room", "").strip(),
        "day": (data.get("day") or "Monday").strip(),
        "timeslot": data.get("timeslot", "").strip(),
        "students": int(data.get("students", 0) or 0),
        "capacity": int(data.get("capacity", 0) or 0),
    }

    required_fields = ["course", "faculty", "room", "day", "timeslot"]
    if any(not doc[field] for field in required_fields):
        raise HTTPException(status_code=400, detail="course, faculty, room, day and timeslot are required")

    result = timetable_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return doc


@app.post("/timetable/upload", dependencies=[Depends(require_roles("admin", "faculty"))])
async def upload_timetable(file: UploadFile = File(...)):
    """
    Upload timetable data in CSV format and bulk insert into MongoDB.

    Expected CSV columns:
    - course, faculty, room, day, timeslot, students, capacity

    Optional columns (kept if present):
    - department, semester
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSV files are allowed.")

    try:
        raw_bytes = await file.read()
        try:
            text_data = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            # Fallback for different encodings
            text_data = raw_bytes.decode("latin-1")

        # Basic CSV structure validation using csv.Sniffer
        sample = text_data[:1024]
        try:
            csv.Sniffer().sniff(sample)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid CSV format.")

        # Parse with pandas for convenient row handling
        buffer = io.StringIO(text_data)
        df = pd.read_csv(buffer)
    except HTTPException:
        # Re-raise explicit format errors
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read CSV file.")

    required_columns = ["course", "faculty", "room", "day", "timeslot", "students", "capacity"]
    optional_columns = ["department", "semester"]

    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid CSV format. Missing required columns: {', '.join(missing)}",
        )

    keep_columns = required_columns + [c for c in optional_columns if c in df.columns]
    df = df[keep_columns]
    try:
        df["students"] = pd.to_numeric(df["students"], errors="raise")
        df["capacity"] = pd.to_numeric(df["capacity"], errors="raise")
        if "semester" in df.columns:
            df["semester"] = pd.to_numeric(df["semester"], errors="raise")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV format. Numeric fields must contain numbers.")

    # Convert to list of dictionaries
    records = df.to_dict(orient="records")

    # Normalize whitespace and types
    for row in records:
        for key in ["course", "faculty", "room", "day", "timeslot", "department"]:
            value = row.get(key)
            if isinstance(value, str):
                row[key] = value.strip()
        # Ensure integers for numeric fields
        row["students"] = int(row.get("students", 0) or 0)
        row["capacity"] = int(row.get("capacity", 0) or 0)
        if "semester" in row:
            row["semester"] = int(row.get("semester", 0) or 0)
        if not (row.get("day") or "").strip():
            raise HTTPException(status_code=400, detail="Invalid CSV format. 'day' cannot be empty.")

    if not records:
        return {"message": "No timetable rows found in CSV.", "rowsInserted": 0}

    insert_result = timetable_collection.insert_many(records)

    return {
        "message": "Timetable uploaded successfully",
        "rowsInserted": len(insert_result.inserted_ids),
    }


@app.get("/timetable/conflicts", dependencies=[Depends(require_roles("admin", "faculty"))])
def get_timetable_conflicts():
    """
    Detect timetable conflicts:
    - Faculty Clash: same faculty, same day, same timeslot.
    - Room Clash: same room, same day, same timeslot.
    - Multi-class conflict: more than one class in the same day+timeslot.
    - Capacity Overflow: students > capacity.
    """
    entries = list(timetable_collection.find())

    # Normalize and keep reference data
    for e in entries:
        e["_id"] = str(e["_id"])
        if not (e.get("day") or "").strip():
            e["day"] = "Monday"

    def norm_str(v) -> str:
        return (v or "").strip()

    def entry_view(e: dict) -> dict:
        """Frontend-friendly entry shape for conflicts payloads."""
        return {
            "_id": e.get("_id"),
            "course": norm_str(e.get("course")),
            "faculty": norm_str(e.get("faculty")),
            "room": norm_str(e.get("room")),
            "day": norm_str(e.get("day")) or "Monday",
            "timeslot": norm_str(e.get("timeslot")),
            "students": int(e.get("students", 0) or 0),
            "capacity": int(e.get("capacity", 0) or 0),
            "department": norm_str(e.get("department")),
            "semester": e.get("semester"),
        }

    def group_by(keys_fn):
        groups = {}
        for e in entries:
            k = keys_fn(e)
            groups.setdefault(k, []).append(e)
        return groups

    conflicts = []
    seen_group_ids = set()

    def add_group_conflict(conflict_type: str, items: list, meta: dict):
        # Deduplicate identical conflict groups (e.g. if emitted twice by mistake)
        ids = sorted([str(x.get("_id")) for x in items if x.get("_id") is not None])
        group_id = (conflict_type, tuple(ids))
        if group_id in seen_group_ids:
            return
        seen_group_ids.add(group_id)
        conflicts.append(
            {
                "type": conflict_type,
                **meta,
                "entries": [entry_view(x) for x in items],
            }
        )

    # 1) Multi-class conflicts: more than one class in the same (day, timeslot)
    slot_groups = group_by(lambda e: (norm_str(e.get("day")) or "Monday", norm_str(e.get("timeslot"))))
    for (day, timeslot), items in slot_groups.items():
        if day and timeslot and len(items) > 1:
            add_group_conflict(
                "multi_class_conflict",
                items,
                {"day": day, "timeslot": timeslot},
            )

    # 2) Faculty clashes: same faculty teaching multiple classes in same slot
    faculty_groups = group_by(
        lambda e: (norm_str(e.get("faculty")), norm_str(e.get("day")) or "Monday", norm_str(e.get("timeslot")))
    )
    for (faculty, day, timeslot), items in faculty_groups.items():
        if faculty and day and timeslot and len(items) > 1:
            add_group_conflict(
                "faculty_clash",
                items,
                {"faculty": faculty, "day": day, "timeslot": timeslot},
            )

    # 3) Room clashes: same room booked for multiple classes in same slot
    room_groups = group_by(
        lambda e: (norm_str(e.get("room")), norm_str(e.get("day")) or "Monday", norm_str(e.get("timeslot")))
    )
    for (room, day, timeslot), items in room_groups.items():
        if room and day and timeslot and len(items) > 1:
            add_group_conflict(
                "room_clash",
                items,
                {"room": room, "day": day, "timeslot": timeslot},
            )

    # 4) Capacity overflow: students > capacity for a given entry
    for e in entries:
        students = int(e.get("students", 0) or 0)
        capacity = int(e.get("capacity", 0) or 0)
        if capacity and students > capacity:
            add_group_conflict(
                "capacity_overflow",
                [e],
                {"day": norm_str(e.get("day")) or "Monday", "timeslot": norm_str(e.get("timeslot"))},
            )

    return conflicts


@app.get("/timetable/optimize", dependencies=[Depends(require_roles("admin", "faculty"))])
def optimize_timetable():
    """
    Generate optimization suggestions for the timetable:
    - Faculty clashes (same faculty, same day, same timeslot)
    - Room clashes (same room, same day, same timeslot)
    - Capacity overflow (students > capacity)
    - Poor room utilization (very low utilization in oversized rooms)
    """
    entries = list(timetable_collection.find())
    if not entries:
        return []

    # Normalize fields and keep convenient copies
    for e in entries:
        e["_id"] = str(e["_id"])
        e["course"] = (e.get("course") or "").strip()
        e["faculty"] = (e.get("faculty") or "").strip()
        e["room"] = (e.get("room") or "").strip()
        e["day"] = (e.get("day") or "Monday").strip()
        e["timeslot"] = (e.get("timeslot") or "").strip()
        e["department"] = (e.get("department") or "").strip()
        e["students"] = int(e.get("students", 0) or 0)
        e["capacity"] = int(e.get("capacity", 0) or 0)

    def get_building_code(room: str) -> str:
        room = (room or "").strip()
        if not room:
            return ""
        code = room[0].upper()
        return code if code.isalpha() else ""

    # Pre-compute helper structures
    rooms = set()
    timeslots = set()
    room_capacity = {}
    occupied = {}  # (room, day, timeslot) -> True
    occupied_by = {}  # (room, day, timeslot) -> set(entryId)

    for e in entries:
        room = e["room"]
        day = e["day"]
        timeslot = e["timeslot"]
        if room:
            rooms.add(room)
            room_capacity[room] = max(room_capacity.get(room, 0), e["capacity"])
        if timeslot:
            timeslots.add(timeslot)
        if room and day and timeslot:
            occupied[(room, day, timeslot)] = True
            occupied_by.setdefault((room, day, timeslot), set()).add(e["_id"])

    timeslot_list = sorted(timeslots)
    # Prefer common weekdays order, but include any custom days found.
    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_set = {e["day"] for e in entries if e.get("day")}
    day_list = [d for d in weekday_order if d in day_set] + sorted([d for d in day_set if d not in weekday_order])

    # Faculty / room grouping for clashes
    faculty_slots = {}
    room_slots = {}
    faculty_busy = {}

    for e in entries:
        key_f = (e["faculty"], e["day"], e["timeslot"])
        key_r = (e["room"], e["day"], e["timeslot"])
        faculty_slots.setdefault(key_f, []).append(e)
        room_slots.setdefault(key_r, []).append(e)
        if e["faculty"] and e["day"] and e["timeslot"]:
            faculty_busy.setdefault((e["faculty"], e["day"]), set()).add(e["timeslot"])

    def find_available_room_for_class(entry, target_day: str, target_timeslot: str):
        """Find a free room in the given timeslot with enough capacity, preferring same building and tighter fit."""
        if not target_day or not target_timeslot:
            return None

        students = entry["students"]
        current_room = entry["room"]
        current_building = get_building_code(current_room)

        candidates = []
        for room in rooms:
            cap = room_capacity.get(room, 0)
            if cap <= 0 or cap < students:
                continue
            if (room, target_day, target_timeslot) in occupied:
                continue
            building_code = get_building_code(room)
            same_building = 1 if building_code and building_code == current_building else 0
            # Prefer same-building rooms and then the smallest room that fits
            candidates.append((same_building, cap, room))

        if not candidates:
            return None

        # Sort: same building first (1 > 0), then smaller capacity first
        candidates.sort(key=lambda x: (-x[0], x[1]))
        return candidates[0][2]

    suggestions = []
    processed_ids = set()

    def is_faculty_free(entry, target_day: str, target_timeslot: str) -> bool:
        fac = entry.get("faculty") or ""
        if not fac or not target_day or not target_timeslot:
            return True
        return target_timeslot not in faculty_busy.get((fac, target_day), set())

    def reserve_slot(entry_id: str, room: str, day: str, timeslot: str):
        """Reserve a slot so subsequent suggestions don't collide."""
        if not room or not day or not timeslot:
            return
        occupied[(room, day, timeslot)] = True
        occupied_by.setdefault((room, day, timeslot), set()).add(entry_id)

    # 0. Multi-class conflicts (more than one class in same day+timeslot) with actionable fixes
    slot_groups = {}
    for e in entries:
        key = (e["day"], e["timeslot"])
        slot_groups.setdefault(key, []).append(e)

    for (day, timeslot), items in slot_groups.items():
        if not day or not timeslot or len(items) <= 1:
            continue

        # Keep one entry in place; move the rest.
        items_sorted = sorted(items, key=lambda x: (x.get("course") or "", x.get("_id") or ""))
        keep = items_sorted[0]
        for e in items_sorted[1:]:
            if not e.get("_id"):
                continue

            # OPTION A: same day+timeslot, move to a free room that fits.
            new_room = find_available_room_for_class(e, day, timeslot)
            if new_room:
                suggestions.append(
                    {
                        "entryId": e["_id"],
                        "course": e["course"],
                        "faculty": e["faculty"],
                        "issue": "Multiple classes in same slot",
                        "currentRoom": e["room"],
                        "currentDay": day,
                        "currentTimeslot": timeslot,
                        "suggestedRoom": new_room,
                        "reason": f"Slot {day} {timeslot} has {len(items)} classes; moving to free room {new_room}.",
                        "severity": "major",
                    }
                )
                reserve_slot(e["_id"], new_room, day, timeslot)
                processed_ids.add(e["_id"])
                continue

            # OPTION B: find another (day, timeslot) and room.
            suggestion_made = False

            # Prefer same day, different timeslot first.
            candidate_days = [day] + [d for d in day_list if d != day]
            for cand_day in candidate_days:
                for cand_ts in timeslot_list:
                    if cand_day == day and cand_ts == timeslot:
                        continue
                    if not is_faculty_free(e, cand_day, cand_ts):
                        continue

                    # Try to keep same room if it's free and fits.
                    if (
                        e["room"]
                        and room_capacity.get(e["room"], 0) >= e["students"]
                        and (e["room"], cand_day, cand_ts) not in occupied
                    ):
                        suggestions.append(
                            {
                                "entryId": e["_id"],
                                "course": e["course"],
                                "faculty": e["faculty"],
                                "issue": "Multiple classes in same slot",
                                "currentRoom": e["room"],
                                "currentDay": day,
                                "currentTimeslot": timeslot,
                                "suggestedDay": cand_day,
                                "suggestedTimeslot": cand_ts,
                                "reason": f"Slot {day} {timeslot} has {len(items)} classes; moving to {cand_day} {cand_ts} using same room {e['room']}.",
                                "severity": "major",
                            }
                        )
                        reserve_slot(e["_id"], e["room"], cand_day, cand_ts)
                        processed_ids.add(e["_id"])
                        suggestion_made = True
                        break

                    # Otherwise find any free room that fits.
                    cand_room = find_available_room_for_class(e, cand_day, cand_ts)
                    if cand_room:
                        suggestions.append(
                            {
                                "entryId": e["_id"],
                                "course": e["course"],
                                "faculty": e["faculty"],
                                "issue": "Multiple classes in same slot",
                                "currentRoom": e["room"],
                                "currentDay": day,
                                "currentTimeslot": timeslot,
                                "suggestedDay": cand_day,
                                "suggestedTimeslot": cand_ts,
                                "suggestedRoom": cand_room,
                                "reason": f"Slot {day} {timeslot} has {len(items)} classes; moving to {cand_day} {cand_ts} in room {cand_room}.",
                                "severity": "major",
                            }
                        )
                        reserve_slot(e["_id"], cand_room, cand_day, cand_ts)
                        processed_ids.add(e["_id"])
                        suggestion_made = True
                        break

                if suggestion_made:
                    break

            # If no alternative found, we still surface the issue (non-actionable fallback).
            if not suggestion_made:
                suggestions.append(
                    {
                        "entryId": e["_id"],
                        "course": e["course"],
                        "faculty": e["faculty"],
                        "issue": "Multiple classes in same slot",
                        "currentRoom": e["room"],
                        "currentDay": day,
                        "currentTimeslot": timeslot,
                        "reason": f"Slot {day} {timeslot} has {len(items)} classes; no free room or alternate slot found automatically.",
                        "severity": "major",
                    }
                )

    # 1. Capacity overflow suggestions (room capacity exceeded)
    for e in entries:
        if e["_id"] in processed_ids:
            continue
        students = e["students"]
        capacity = e["capacity"]
        if capacity and students > capacity:
            # Try to find a bigger room in the same timeslot
            target_timeslot = e["timeslot"]
            target_day = e["day"]
            new_room = find_available_room_for_class(e, target_day, target_timeslot)
            if new_room and new_room != e["room"]:
                suggestions.append(
                    {
                        "entryId": e["_id"],
                        "course": e["course"],
                        "faculty": e["faculty"],
                        "issue": "Room capacity exceeded",
                        "currentRoom": e["room"],
                        "currentDay": e["day"],
                        "currentTimeslot": e["timeslot"],
                        "suggestedRoom": new_room,
                        "reason": f"Room {new_room} has capacity {room_capacity.get(new_room, 0)} for {students} students.",
                        "severity": "major",
                    }
                )
                processed_ids.add(e["_id"])

    # 2. Faculty clash suggestions (move one of the clashing classes)
    for (faculty, day, timeslot), items in faculty_slots.items():
        if not faculty or not day or not timeslot or len(items) <= 1:
            continue
        # Keep the first as-is, suggest adjustments for the rest
        for e in items[1:]:
            if e["_id"] in processed_ids:
                continue

            # Try a free timeslot (keep room if possible)
            suggestion_made = False
            busy_slots = faculty_busy.get((faculty, day), set())

            for ts in timeslot_list:
                if ts == timeslot:
                    continue
                if ts in busy_slots:
                    continue

                # Prefer to reuse the same room if it's free
                if (
                    e["room"]
                    and (e["room"], day, ts) not in occupied
                    and e["capacity"] >= e["students"]
                ):
                    suggestions.append(
                        {
                            "entryId": e["_id"],
                            "course": e["course"],
                            "faculty": e["faculty"],
                            "issue": "Faculty clash",
                            "currentRoom": e["room"],
                            "currentDay": e["day"],
                            "currentTimeslot": e["timeslot"],
                            "suggestedTimeslot": ts,
                            "reason": f"Faculty {faculty} is free at {ts}, and room {e['room']} is available.",
                            "severity": "major",
                        }
                    )
                    processed_ids.add(e["_id"])
                    suggestion_made = True
                    break

                # Otherwise, look for a new room at this free timeslot
                new_room = find_available_room_for_class(e, day, ts)
                if new_room:
                    suggestions.append(
                        {
                            "entryId": e["_id"],
                            "course": e["course"],
                            "faculty": e["faculty"],
                            "issue": "Faculty clash",
                            "currentRoom": e["room"],
                            "currentDay": e["day"],
                            "currentTimeslot": e["timeslot"],
                            "suggestedRoom": new_room,
                            "suggestedTimeslot": ts,
                            "reason": f"Faculty {faculty} is free at {ts}; room {new_room} is available with enough capacity.",
                            "severity": "major",
                        }
                    )
                    processed_ids.add(e["_id"])
                    suggestion_made = True
                    break

            # If no alternative timeslot/room is found, we skip this clash
            if not suggestion_made:
                continue

    # 3. Room clash suggestions (same room booked for multiple classes in same timeslot)
    for (room, day, timeslot), items in room_slots.items():
        if not room or not day or not timeslot or len(items) <= 1:
            continue
        # Keep the first entry; suggest alternative room for the others
        for e in items[1:]:
            if e["_id"] in processed_ids:
                continue
            new_room = find_available_room_for_class(e, day, timeslot)
            if new_room and new_room != room:
                suggestions.append(
                    {
                        "entryId": e["_id"],
                        "course": e["course"],
                        "faculty": e["faculty"],
                        "issue": "Room clash",
                        "currentRoom": room,
                        "currentDay": e["day"],
                        "currentTimeslot": timeslot,
                        "suggestedRoom": new_room,
                        "reason": f"Room {new_room} is free at {timeslot} and has enough capacity.",
                        "severity": "major",
                    }
                )
                processed_ids.add(e["_id"])

    # 4. Poor room utilization suggestions (very underutilized rooms)
    for e in entries:
        if e["_id"] in processed_ids:
            continue
        room = e["room"]
        day = e["day"]
        timeslot = e["timeslot"]
        students = e["students"]
        capacity = e["capacity"]

        if not room or not day or not timeslot or not capacity or students <= 0:
            continue

        utilization = float(students) / float(capacity)
        # Mark as "poor utilization" when the room is more than 2.5x larger than needed
        if utilization >= 0.4:
            continue

        # Find a smaller free room in the same timeslot that still fits the class
        current_building = get_building_code(room)
        better_candidates = []
        for r in rooms:
            cap_r = room_capacity.get(r, 0)
            if cap_r <= 0 or cap_r < students:
                continue
            if (r, day, timeslot) in occupied:
                continue
            if cap_r >= capacity:
                continue  # not smaller
            building_code = get_building_code(r)
            same_building = 1 if building_code and building_code == current_building else 0
            better_candidates.append((same_building, cap_r, r))

        if not better_candidates:
            continue

        better_candidates.sort(key=lambda x: (-x[0], x[1]))
        new_room = better_candidates[0][2]

        suggestions.append(
            {
                "entryId": e["_id"],
                "course": e["course"],
                "faculty": e["faculty"],
                "issue": "Poor room utilization",
                "currentRoom": room,
                "currentDay": day,
                "currentTimeslot": timeslot,
                "suggestedRoom": new_room,
                "reason": f"Room {new_room} is smaller but still fits {students} students, improving utilization.",
                "severity": "warning",
            }
        )
        processed_ids.add(e["_id"])

    return suggestions


@app.post("/optimize/apply", dependencies=[Depends(require_roles("admin", "faculty"))])
def apply_optimization(data: dict):
    """
    Apply an optimization automatically on the backend.

    Current supported use-case:
    - Resolve multi-class conflicts by moving ONE entry to a free timeslot.

    Payload:
    - entryId: string (required)

    Behavior:
    - Finds the entry's current (day, timeslot)
    - If multiple entries exist in that slot, moves the requested entry to a free slot
      (same day preferred, otherwise next available day)
    - Updates MongoDB and returns the updated entry + new slot
    """
    entry_id = (data.get("entryId") or data.get("id") or "").strip()
    if not entry_id:
        raise HTTPException(status_code=400, detail="entryId is required")

    try:
        obj_id = ObjectId(entry_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid entryId")

    entry = timetable_collection.find_one({"_id": obj_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    day = (entry.get("day") or "Monday").strip()
    timeslot = (entry.get("timeslot") or "").strip()
    if not timeslot:
        raise HTTPException(status_code=400, detail="Entry has no timeslot")

    # Get all entries in the same slot (day+timeslot)
    slot_entries = list(timetable_collection.find({"day": day, "timeslot": timeslot}))
    if len(slot_entries) <= 1:
        # Nothing to resolve
        entry["_id"] = str(entry["_id"])
        return {"message": "No multi-class conflict found for this entry.", "updated": False, "entry": entry}

    # Keep the first entry unchanged; move all remaining ones (caller picks which to move)
    # Only proceed if the selected entry is NOT the kept one.
    slot_entries_sorted = sorted(slot_entries, key=lambda x: (str(x.get("course") or ""), str(x.get("_id"))))
    kept_id = str(slot_entries_sorted[0].get("_id"))
    if kept_id == entry_id:
        raise HTTPException(
            status_code=400,
            detail="This entry is the kept class for the slot. Apply to another conflicting entry.",
        )

    TIMESLOTS = ["9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM"]
    WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    all_days = list({(e.get("day") or "Monday").strip() for e in timetable_collection.find({}, {"day": 1})})
    ordered_days = [d for d in WEEKDAYS if d in all_days] + sorted([d for d in all_days if d not in WEEKDAYS])
    if day not in ordered_days:
        ordered_days = [day] + ordered_days

    # Build occupied slots by (day, timeslot) across all entries
    occupied = set()
    for e in timetable_collection.find({}, {"day": 1, "timeslot": 1}):
        d = (e.get("day") or "Monday").strip()
        ts = (e.get("timeslot") or "").strip()
        if d and ts:
            occupied.add((d, ts))

    def find_free_slot(preferred_day: str):
        # Same day first
        for ts in TIMESLOTS:
            if ts == timeslot:
                continue
            if (preferred_day, ts) not in occupied:
                return preferred_day, ts
        # Then next available day
        for d in ordered_days:
            if d == preferred_day:
                continue
            for ts in TIMESLOTS:
                if (d, ts) not in occupied:
                    return d, ts
        return None, None

    new_day, new_timeslot = find_free_slot(day)
    if not new_day or not new_timeslot:
        raise HTTPException(status_code=409, detail="No free slot available to resolve conflict")

    # Update DB
    result = timetable_collection.update_one(
        {"_id": obj_id},
        {"$set": {"day": new_day, "timeslot": new_timeslot}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    updated = timetable_collection.find_one({"_id": obj_id})
    updated["_id"] = str(updated["_id"])
    if not (updated.get("day") or "").strip():
        updated["day"] = "Monday"

    return {
        "message": "Optimization applied",
        "updated": True,
        "old": {"day": day, "timeslot": timeslot, "room": (entry.get("room") or "").strip()},
        "new": {"day": new_day, "timeslot": new_timeslot, "room": (entry.get("room") or "").strip()},
        "entry": updated,
    }


@app.put("/timetable/update", dependencies=[Depends(require_roles("admin", "faculty"))])
def update_timetable_entry(data: dict):
    """
    Update an existing timetable entry.

    Expected payload:
    - id: string (MongoDB _id of the entry)  [required]
    - any subset of: course, faculty, room, timeslot, students, capacity, department, semester
    """
    entry_id = (data.get("id") or "").strip()
    if not entry_id:
        raise HTTPException(status_code=400, detail="id is required")

    try:
        obj_id = ObjectId(entry_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid timetable entry ID")

    allowed_fields = {
        "course",
        "faculty",
        "room",
        "day",
        "timeslot",
        "students",
        "capacity",
        "department",
        "semester",
    }

    update_doc = {}
    for key in allowed_fields:
        if key not in data:
            continue
        value = data[key]
        if key in {"students", "capacity", "semester"}:
            try:
                value = int(value)
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail=f"{key} must be a number",
                )
        elif isinstance(value, str):
            value = value.strip()
        update_doc[key] = value

    if not update_doc:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = timetable_collection.update_one({"_id": obj_id}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Timetable entry not found")

    return {"message": "Timetable entry updated"}


@app.get(
    "/campus/heatmap",
    dependencies=[Depends(require_roles("admin", "faculty", "guard"))],
)
def get_campus_heatmap():
    """
    Aggregate timetable entries into a campus heatmap.

    For each room, compute:
    - total students scheduled across all timeslots
    - room capacity (max capacity seen for that room)
    - utilization = students / capacity
    - status: Overcrowded | Busy | Available
    """
    entries = list(timetable_collection.find())

    rooms = {}
    for e in entries:
        room = (e.get("room") or "").strip()
        if not room:
            continue

        students = int(e.get("students", 0) or 0)
        capacity = int(e.get("capacity", 0) or 0)

        if room not in rooms:
            # Derive a simple building label from the room code, e.g. A101 -> "Block A"
            building_code = room[0].upper()
            building = f"Block {building_code}" if building_code.isalpha() else "Unknown Block"
            rooms[room] = {
                "room": room,
                "building": building,
                "students": 0,
                "capacity": 0,
            }

        rooms[room]["students"] += students
        rooms[room]["capacity"] = max(rooms[room]["capacity"], capacity)

    heatmap = []
    for room_info in rooms.values():
        students = room_info["students"]
        capacity = room_info["capacity"]
        utilization = float(students) / float(capacity) if capacity else 0.0

        if utilization > 1.0:
            status = "Overcrowded"
        elif utilization >= 0.7:
            status = "Busy"
        else:
            status = "Available"

        heatmap.append(
            {
                "room": room_info["room"],
                "building": room_info["building"],
                "students": students,
                "capacity": capacity,
                "utilization": round(utilization, 2),
                "status": status,
            }
        )

    # Sort by building then room for a stable layout
    heatmap.sort(key=lambda x: (x["building"], x["room"]))

    return heatmap


@app.get("/analytics", dependencies=[Depends(require_roles("admin"))])
def get_analytics():
    """
    Admin-only: complaint and timetable stats for dashboard/analytics.
    """
    total_complaints = complaints_collection.count_documents({})
    pending = complaints_collection.count_documents({"status": "Pending"})
    in_progress = complaints_collection.count_documents({"status": "In Progress"})
    resolved = complaints_collection.count_documents({"status": "Resolved"})
    total_timetable = timetable_collection.count_documents({})

    entries = list(timetable_collection.find())
    conflicts_count = 0
    faculty_slots = {}
    for e in entries:
        key = (e.get("faculty"), e.get("timeslot"))
        if key not in faculty_slots:
            faculty_slots[key] = []
        faculty_slots[key].append(e)
    for (faculty, timeslot), items in faculty_slots.items():
        if faculty and timeslot and len(items) > 1:
            conflicts_count += 1
    room_slots = {}
    for e in entries:
        key = (e.get("room"), e.get("timeslot"))
        if key not in room_slots:
            room_slots[key] = []
        room_slots[key].append(e)
    for (room, timeslot), items in room_slots.items():
        if room and timeslot and len(items) > 1:
            conflicts_count += 1
    for e in entries:
        students = int(e.get("students", 0) or 0)
        capacity = int(e.get("capacity", 0) or 0)
        if capacity and students > capacity:
            conflicts_count += 1

    return {
        "totalComplaints": total_complaints,
        "pending": pending,
        "inProgress": in_progress,
        "resolved": resolved,
        "totalTimetableEntries": total_timetable,
        "conflictsCount": conflicts_count,
    }