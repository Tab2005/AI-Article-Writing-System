from app.core.database import SessionLocal
from app.models.db_models import CreditLog
import json

db = SessionLocal()
try:
    logs = db.query(CreditLog).order_by(CreditLog.created_at.desc()).limit(10).all()
    print(f"Total entries found: {db.query(CreditLog).count()}")
    for l in logs:
        print(f"ID: {l.id} | User: {l.user_id} | Delta: {l.delta} | Op: {l.operation} | Time: {l.created_at}")
finally:
    db.close()
