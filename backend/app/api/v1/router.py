from fastapi import APIRouter
from app.api.v1 import auth, academic, students, ai_professor, assessments, english, admin
from app.api.v1 import lectures, gamification, forum, search

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(academic.router)
api_router.include_router(students.router)
api_router.include_router(ai_professor.router)
api_router.include_router(assessments.router)
api_router.include_router(english.router)
api_router.include_router(admin.router)
api_router.include_router(lectures.router)
api_router.include_router(gamification.router)
api_router.include_router(forum.router)
api_router.include_router(search.router)
