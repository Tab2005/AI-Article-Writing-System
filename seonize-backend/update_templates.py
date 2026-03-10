import sys
import os

# Add the current directory to sys.path to find 'app'
sys.path.append(os.getcwd())

from app.core.database import SessionLocal
from app.core.initial_data import initialize_default_prompts

try:
    db = SessionLocal()
    print("Database connected. Starting template update...")
    initialize_default_prompts(db)
    print("Template update completed successfully.")
    db.close()
except Exception as e:
    print(f"Error during update: {e}")
    sys.exit(1)
