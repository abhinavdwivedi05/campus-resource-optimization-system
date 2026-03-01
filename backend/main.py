from datetime import datetime
import csv
import io

import pandas as pd
from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId

from database import users_collection, complaints_collection, timetable_collection

app = FastAPI()

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
def create_complaint(data: dict):
    """
    Create a new complaint.

    Expected fields:
    - title
    - description
    - location
    - priority
    """
    doc = {
        "title": data.get("title", "").strip(),
        "description": data.get("description", "").strip(),
        "location": data.get("location", "").strip(),
        "priority": data.get("priority", "Medium"),
        "status": "Pending",
        "created_at": datetime.utcnow(),
    }

    if not doc["title"] or not doc["description"]:
        raise HTTPException(status_code=400, detail="Title and description are required")

    result = complaints_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return doc


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
    timetable = []

    for t in timetable_collection.find():
        t["_id"] = str(t["_id"])
        timetable.append(t)

    return timetable


@app.post("/timetable", dependencies=[Depends(require_roles("admin", "faculty"))])
def add_timetable_entry(data: dict):
    """
    Add a new timetable entry.

    Expected fields:
    - course: string
    - faculty: string
    - room: string
    - timeslot: string
    - students: number
    - capacity: number
    """
    doc = {
        "course": data.get("course", "").strip(),
        "faculty": data.get("faculty", "").strip(),
        "room": data.get("room", "").strip(),
        "timeslot": data.get("timeslot", "").strip(),
        "students": int(data.get("students", 0) or 0),
        "capacity": int(data.get("capacity", 0) or 0),
    }

    required_fields = ["course", "faculty", "room", "timeslot"]
    if any(not doc[field] for field in required_fields):
        raise HTTPException(status_code=400, detail="course, faculty, room and timeslot are required")

    result = timetable_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return doc


@app.post("/timetable/upload", dependencies=[Depends(require_roles("admin", "faculty"))])
async def upload_timetable(file: UploadFile = File(...)):
    """
    Upload timetable data in CSV format and bulk insert into MongoDB.

    Expected CSV columns:
    - course, faculty, room, timeslot, students, capacity, department, semester
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

    required_columns = [
        "course",
        "faculty",
        "room",
        "timeslot",
        "students",
        "capacity",
        "department",
        "semester",
    ]

    if any(col not in df.columns for col in required_columns):
        raise HTTPException(status_code=400, detail="Invalid CSV format. Missing required columns.")

    # Keep only expected columns and coerce numeric fields
    df = df[required_columns]
    try:
        df["students"] = pd.to_numeric(df["students"], errors="raise")
        df["capacity"] = pd.to_numeric(df["capacity"], errors="raise")
        df["semester"] = pd.to_numeric(df["semester"], errors="raise")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV format. Numeric fields must contain numbers.")

    # Convert to list of dictionaries
    records = df.to_dict(orient="records")

    # Normalize whitespace and types
    for row in records:
        for key in ["course", "faculty", "room", "timeslot", "department"]:
            value = row.get(key)
            if isinstance(value, str):
                row[key] = value.strip()
        # Ensure integers for numeric fields
        row["students"] = int(row.get("students", 0) or 0)
        row["capacity"] = int(row.get("capacity", 0) or 0)
        row["semester"] = int(row.get("semester", 0) or 0)

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
    - Faculty Clash: same faculty, same timeslot.
    - Room Clash: same room, same timeslot.
    - Capacity Overflow: students > capacity.
    """
    entries = list(timetable_collection.find())

    # Normalize and keep reference data
    for e in entries:
        e["_id"] = str(e["_id"])

    conflicts = []

    # Faculty clashes: same faculty teaching multiple classes in the same timeslot
    faculty_slots = {}
    for e in entries:
        key = (e.get("faculty"), e.get("timeslot"))
        if key not in faculty_slots:
            faculty_slots[key] = []
        faculty_slots[key].append(e)

    for (faculty, timeslot), items in faculty_slots.items():
        if faculty and timeslot and len(items) > 1:
            for e in items:
                conflicts.append(
                    {
                        "type": "Faculty Clash",
                        "course": e.get("course"),
                        "faculty": faculty,
                        "room": e.get("room"),
                        "timeslot": timeslot,
                        "students": int(e.get("students", 0) or 0),
                        "capacity": int(e.get("capacity", 0) or 0),
                    }
                )

    # Room clashes: same room booked for multiple classes in the same timeslot
    room_slots = {}
    for e in entries:
        key = (e.get("room"), e.get("timeslot"))
        if key not in room_slots:
            room_slots[key] = []
        room_slots[key].append(e)

    for (room, timeslot), items in room_slots.items():
        if room and timeslot and len(items) > 1:
            for e in items:
                conflicts.append(
                    {
                        "type": "Room Clash",
                        "course": e.get("course"),
                        "faculty": e.get("faculty"),
                        "room": room,
                        "timeslot": timeslot,
                        "students": int(e.get("students", 0) or 0),
                        "capacity": int(e.get("capacity", 0) or 0),
                    }
                )

    # Capacity overflow: students > capacity for a given class
    for e in entries:
        students = int(e.get("students", 0) or 0)
        capacity = int(e.get("capacity", 0) or 0)
        if capacity and students > capacity:
            conflicts.append(
                {
                    "type": "Capacity Overflow",
                    "course": e.get("course"),
                    "faculty": e.get("faculty"),
                    "room": e.get("room"),
                    "timeslot": e.get("timeslot"),
                    "students": students,
                    "capacity": capacity,
                }
            )

    return conflicts


@app.get("/timetable/optimize", dependencies=[Depends(require_roles("admin", "faculty"))])
def optimize_timetable():
    """
    Generate optimization suggestions for the timetable:
    - Faculty clashes (same faculty, same timeslot)
    - Room clashes (same room, same timeslot)
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
    occupied = {}  # (room, timeslot) -> True

    for e in entries:
        room = e["room"]
        timeslot = e["timeslot"]
        if room:
            rooms.add(room)
            room_capacity[room] = max(room_capacity.get(room, 0), e["capacity"])
        if timeslot:
            timeslots.add(timeslot)
        if room and timeslot:
            occupied[(room, timeslot)] = True

    timeslot_list = sorted(timeslots)

    # Faculty / room grouping for clashes
    faculty_slots = {}
    room_slots = {}
    faculty_busy = {}

    for e in entries:
        key_f = (e["faculty"], e["timeslot"])
        key_r = (e["room"], e["timeslot"])
        faculty_slots.setdefault(key_f, []).append(e)
        room_slots.setdefault(key_r, []).append(e)
        if e["faculty"] and e["timeslot"]:
            faculty_busy.setdefault(e["faculty"], set()).add(e["timeslot"])

    def find_available_room_for_class(entry, target_timeslot: str):
        """Find a free room in the given timeslot with enough capacity, preferring same building and tighter fit."""
        if not target_timeslot:
            return None

        students = entry["students"]
        current_room = entry["room"]
        current_building = get_building_code(current_room)

        candidates = []
        for room in rooms:
            cap = room_capacity.get(room, 0)
            if cap <= 0 or cap < students:
                continue
            if (room, target_timeslot) in occupied:
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

    # 1. Capacity overflow suggestions (room capacity exceeded)
    for e in entries:
        if e["_id"] in processed_ids:
            continue
        students = e["students"]
        capacity = e["capacity"]
        if capacity and students > capacity:
            # Try to find a bigger room in the same timeslot
            target_timeslot = e["timeslot"]
            new_room = find_available_room_for_class(e, target_timeslot)
            if new_room and new_room != e["room"]:
                suggestions.append(
                    {
                        "entryId": e["_id"],
                        "course": e["course"],
                        "faculty": e["faculty"],
                        "issue": "Room capacity exceeded",
                        "currentRoom": e["room"],
                        "currentTimeslot": e["timeslot"],
                        "suggestedRoom": new_room,
                        "reason": f"Room {new_room} has capacity {room_capacity.get(new_room, 0)} for {students} students.",
                        "severity": "major",
                    }
                )
                processed_ids.add(e["_id"])

    # 2. Faculty clash suggestions (move one of the clashing classes)
    for (faculty, timeslot), items in faculty_slots.items():
        if not faculty or not timeslot or len(items) <= 1:
            continue
        # Keep the first as-is, suggest adjustments for the rest
        for e in items[1:]:
            if e["_id"] in processed_ids:
                continue

            # Try a free timeslot (keep room if possible)
            suggestion_made = False
            busy_slots = faculty_busy.get(faculty, set())

            for ts in timeslot_list:
                if ts == timeslot:
                    continue
                if ts in busy_slots:
                    continue

                # Prefer to reuse the same room if it's free
                if e["room"] and (e["room"], ts) not in occupied and e["capacity"] >= e["students"]:
                    suggestions.append(
                        {
                            "entryId": e["_id"],
                            "course": e["course"],
                            "faculty": e["faculty"],
                            "issue": "Faculty clash",
                            "currentRoom": e["room"],
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
                new_room = find_available_room_for_class(e, ts)
                if new_room:
                    suggestions.append(
                        {
                            "entryId": e["_id"],
                            "course": e["course"],
                            "faculty": e["faculty"],
                            "issue": "Faculty clash",
                            "currentRoom": e["room"],
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
    for (room, timeslot), items in room_slots.items():
        if not room or not timeslot or len(items) <= 1:
            continue
        # Keep the first entry; suggest alternative room for the others
        for e in items[1:]:
            if e["_id"] in processed_ids:
                continue
            new_room = find_available_room_for_class(e, timeslot)
            if new_room and new_room != room:
                suggestions.append(
                    {
                        "entryId": e["_id"],
                        "course": e["course"],
                        "faculty": e["faculty"],
                        "issue": "Room clash",
                        "currentRoom": room,
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
        timeslot = e["timeslot"]
        students = e["students"]
        capacity = e["capacity"]

        if not room or not timeslot or not capacity or students <= 0:
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
            if (r, timeslot) in occupied:
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
                "currentTimeslot": timeslot,
                "suggestedRoom": new_room,
                "reason": f"Room {new_room} is smaller but still fits {students} students, improving utilization.",
                "severity": "warning",
            }
        )
        processed_ids.add(e["_id"])

    return suggestions


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