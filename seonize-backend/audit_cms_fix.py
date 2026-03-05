from app.core.database import SessionLocal
from app.models.db_models import CMSConfig, User, Project, KalpaMatrix
import json

def audit():
    db = SessionLocal()
    try:
        # Check current user (assume the user is 'admin' or similar, but let's look at all users)
        users = db.query(User).all()
        print(f"--- Users ({len(users)}) ---")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")

        # Check CMS Configs
        configs = db.query(CMSConfig).all()
        print(f"\n--- CMS Configs ({len(configs)}) ---")
        for c in configs:
            print(f"ID: {c.id}, Name: {c.name}, Platform: {c.platform}, UserID: {c.user_id}")

        # Check Projects and their CMS associations
        projects = db.query(Project).all()
        print(f"\n--- Projects ({len(projects)}) ---")
        for p in projects:
            print(f"ID: {p.id}, Name: {p.name}, ConfigID: {p.cms_config_id}, UserID: {p.user_id}")
            
        # Check Kalpa Matrices
        matrices = db.query(KalpaMatrix).all()
        print(f"\n--- Kalpa Matrices ({len(matrices)}) ---")
        for m in matrices:
            print(f"ID: {m.id}, Name: {m.project_name}, ConfigID: {m.cms_config_id}, UserID: {m.user_id}")

    finally:
        db.close()

if __name__ == "__main__":
    audit()
