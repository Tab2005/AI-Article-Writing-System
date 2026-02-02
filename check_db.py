
import sqlite3
import os

db_path = os.path.join('seonize-backend', 'seonize.db')
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Checking 'settings' table for SERP related keys:")
try:
    cursor.execute("SELECT key, value, encrypted FROM settings WHERE key LIKE '%serp%' OR key LIKE '%dataforseo%' OR key LIKE '%google_search%';")
    rows = cursor.fetchall()
    for row in rows:
        key, value, encrypted = row
        # Mask actual value for display
        masked_value = "****" if encrypted else value
        print(f"Key: {key}, Value: {masked_value}, Encrypted: {encrypted}")
except Exception as e:
    print(f"Error: {e}")

conn.close()
