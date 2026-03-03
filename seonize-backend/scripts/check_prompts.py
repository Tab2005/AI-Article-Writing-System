import sys
import os

# 將專案根目錄加入路徑 (seonize-backend)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.db_models import PromptTemplate

def check_db():
    db = SessionLocal()
    try:
        templates = db.query(PromptTemplate).all()
        print(f"Total templates: {len(templates)}")
        for t in templates:
            print(f"ID: {t.id}, Category: {t.category}, Name: {t.name}, UserID: {t.user_id}, Active: {t.is_active}")
            print(f"Content Preview: {t.content[:50]}...")
            print("-" * 20)
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
