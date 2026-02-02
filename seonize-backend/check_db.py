from app.core.database import SessionLocal
from app.models.db_models import Settings

with SessionLocal() as db:
    settings = db.query(Settings).all()
    for s in settings:
        print(f"{s.key}: {s.value[:4]}...{s.value[-4:] if len(s.value) > 8 else ''} (Encrypted: {s.encrypted})")
