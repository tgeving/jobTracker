from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date
import subprocess
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    #allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            database=os.getenv("DB_NAME", "jobfinder"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "postgres"),
            port=os.getenv("DB_PORT", "5432"),
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

class JobModel(BaseModel):
    company: str
    position: str
    date_applied: str | None = None
    wfh: str | None = None
    notes: str | None = None
    job_link: str | None = None

class MoveJobModel(BaseModel):
    source_table: str
    target_table: str
    company: str
    position: str
    row_id: str

class ScraperModel(BaseModel):
    platform: str
    target: str
    headless: bool = True

VALID_TABLES = {
    "new_jobs_found",
    "applied",
    "i_rejected_them",
    "waiting_to_hear_back",
    "pending",
    "they_ghosted_me",
    "they_rejected_me",
    "disappointing"
}

@app.get("/api/jobs/all")
def get_all_jobs():
    conn = get_db_connection()
    cursor = conn.cursor()
    all_items = []
    
    try:
        for table in VALID_TABLES:
            cursor.execute(f"SELECT *, '{table}' as table_name FROM {table} ORDER BY id DESC;")
            rows = cursor.fetchall()
            all_items.extend(rows)
            
        all_items.sort(key=lambda x: x["id"], reverse=True)
        return {"total": len(all_items), "items": all_items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/jobs/{table_name}")
def get_jobs_by_table(table_name: str):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT *, '{table_name}' as table_name FROM {table_name} ORDER BY id DESC;")
        rows = cursor.fetchall()
        return {"total": len(rows), "items": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/jobs/move")
def move_job(data: MoveJobModel):
    if data.source_table not in VALID_TABLES or data.target_table not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid source or target table")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT company, position, date_applied, wfh, notes, job_link FROM {data.source_table} WHERE id = %s;", (data.row_id,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Job record not found in source table")

        final_date_applied = row["date_applied"]
        if data.target_table == "applied" and (not final_date_applied or final_date_applied.strip() == ""):
            final_date_applied = date.today().isoformat()

        cursor.execute(
            f"""
            INSERT INTO {data.target_table} (company, position, date_applied, wfh, notes, job_link)
            VALUES (%s, %s, %s, %s, %s, %s);
            """,
            (row["company"], row["position"], final_date_applied, row["wfh"], row["notes"], row["job_link"])
        )

        cursor.execute(f"DELETE FROM {data.source_table} WHERE id = %s;", (data.row_id,))
        
        conn.commit()
        return {"status": "success", "message": f"Moved job from {data.source_table} to {data.target_table}"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/jobs/{table_name}")
def create_job(table_name: str, job: JobModel):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            f"""
            INSERT INTO {table_name} (company, position, date_applied, wfh, notes, job_link)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id;
            """,
            (job.company, job.position, job.date_applied, job.wfh, job.notes, job.job_link)
        )
        new_id = cursor.fetchone()["id"]
        conn.commit()
        return {"status": "success", "id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/api/jobs/{table_name}/{job_id}")
def update_job(table_name: str, job_id: int, job: JobModel):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            f"""
            UPDATE {table_name}
            SET company = %s, position = %s, date_applied = %s, wfh = %s, notes = %s, job_link = %s
            WHERE id = %s;
            """,
            (job.company, job.position, job.date_applied, job.wfh, job.notes, job.job_link, job_id)
        )
        conn.commit()
        return {"status": "success", "message": "Job updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/jobs/{table_name}/{job_id}")
def delete_job(table_name: str, job_id: int):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"DELETE FROM {table_name} WHERE id = %s;", (job_id,))
        conn.commit()
        return {"status": "success", "message": "Job deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# --- SCRAPER TRIGGER ROUTE (Using tsx) ---
@app.post("/api/scraper/run")
def run_scraper(data: ScraperModel):
    try:
        script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper/jobscraper.ts"))
        
        print(f"🚀 Triggering scraper for target: '{data.target}' (headless: {data.headless})")
        
        # Uses tsx to correctly execute the TypeScript scraper with your nodenext/verbatimModuleSyntax config
        cmd = f'npx tsx "{script_path}" --target="{data.target}" --headless={str(data.headless).lower()}'
        
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
            shell=True,
            cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        )

        return {
            "status": "success", 
            "message": f"Successfully executed scraper for '{data.target}'!"
        }
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr or e.stdout or "Unknown subprocess error"
        print(f"Scraper subprocess error: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Scraper script failed: {error_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)