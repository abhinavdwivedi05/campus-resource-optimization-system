from datetime import datetime

from fastapi import FastAPI, HTTPException, Header, Depends
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

    # Faculty clashes
    faculty_slots = {}
    for e in entries:
        key = (e.get("faculty"), e.get("timeslot"))
        if key not in faculty_slots:
            faculty_slots[key] = []
        faculty_slots[key].append(e)

    for (faculty, timeslot), items in faculty_slots.items():
        if faculty and timeslot and len(items) > 1:
            conflicts.append(
                {
                    "type": "Faculty Clash",
                    "message": f"{faculty} has multiple classes at {timeslot}",
                }
            )

    # Room clashes
    room_slots = {}
    for e in entries:
        key = (e.get("room"), e.get("timeslot"))
        if key not in room_slots:
            room_slots[key] = []
        room_slots[key].append(e)

    for (room, timeslot), items in room_slots.items():
        if room and timeslot and len(items) > 1:
            conflicts.append(
                {
                    "type": "Room Clash",
                    "message": f"Room {room} is double booked at {timeslot}",
                }
            )

    # Capacity overflow
    for e in entries:
        students = int(e.get("students", 0) or 0)
        capacity = int(e.get("capacity", 0) or 0)
        if capacity and students > capacity:
            course = e.get("course") or "Unknown course"
            conflicts.append(
                {
                    "type": "Capacity Overflow",
                    "message": f"{course} exceeds room capacity",
                }
            )

    return conflicts


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