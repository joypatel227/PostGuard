import os
import sys
import subprocess
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Database Credentials (Match settings.py)
DB_NAME = "postguard_db"
DB_USER = "postguard_user"
DB_PASS = "1234"
DB_HOST = "localhost"

def run_command(cmd):
    """Utility to run shell commands and exit on failure."""
    print(f"> {cmd}")
    try:
        subprocess.run(cmd, shell=True, check=True)
    except subprocess.CalledProcessError:
        print(f"FAILED: {cmd}")
        sys.exit(1)

def create_postgres_db():
    """Connects to Postgres and creates the project database if it doesn't exist."""
    print("--- [1/3] CHECKING POSTGRESQL DATABASE ---")
    
    # We connect to 'postgres' system DB first to perform administrative tasks
    try:
        # Note: We assume the postgres superuser password is '1234' as per your settings.py
        # Your partner might need to change this if their local postgres password is different.
        conn = psycopg2.connect(
            dbname='postgres', 
            user='postgres', 
            host=DB_HOST, 
            password=DB_PASS
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # 1. Create User if it doesn't exist
        print(f"Checking for user '{DB_USER}'...")
        cur.execute(f"SELECT 1 FROM pg_roles WHERE rolname='{DB_USER}'")
        user_exists = cur.fetchone()
        if not user_exists:
            print(f"Creating user '{DB_USER}'...")
            cur.execute(f"CREATE USER {DB_USER} WITH PASSWORD '{DB_PASS}'")
            cur.execute(f"ALTER USER {DB_USER} WITH SUPERUSER") # Grant superuser for dev ease
        
        # 2. Check if database exists
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
        exists = cur.fetchone()
        
        if not exists:
            print(f"Creating database '{DB_NAME}'...")
            cur.execute(f"CREATE DATABASE {DB_NAME} OWNER {DB_USER}")
        else:
            print(f"Database '{DB_NAME}' already exists.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"CRITICAL ERROR: Could not connect to PostgreSQL.")
        print(f"Details: {e}")
        print("\nFixes:")
        print("1. Ensure PostgreSQL is installed and running.")
        print(f"2. Ensure the 'postgres' user password is '{DB_PASS}'.")
        sys.exit(1)

def setup_django():
    """Runs migrations and seeds the database."""
    print("\n--- [2/3] RUNNING MIGRATIONS ---")
    run_command("python manage.py makemigrations")
    run_command("python manage.py migrate")
    
    print("\n--- [3/3] SEEDING INITIAL DATA ---")
    # Check if we are in backend dir or root
    seed_path = "scripts/seed_users.py"
    if os.path.exists(seed_path):
        run_command(f"python {seed_path}")
    else:
        print(f"Warning: {seed_path} not found. Skipping data seeding.")

if __name__ == "__main__":
    # Ensure dependencies are installed first
    print("Checking for required packages...")
    run_command("pip install psycopg2-binary")
    
    create_postgres_db()
    setup_django()
    
    print("\n" + "="*40)
    print(" ✅ POSTGUARD DATABASE IS READY!")
    print("="*40)
    print("Your partner can now run:")
    print("python manage.py runserver")
