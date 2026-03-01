from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")

db = client["campus_system"]

users_collection = db["users"]
complaints_collection = db["complaints"]
timetable_collection = db["timetable"]