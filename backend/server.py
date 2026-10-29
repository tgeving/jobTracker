import os
import platform
import subprocess
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional

app = FastAPI(title="Job Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432"),
        cursor_factory=RealDictCursor
    )

VALID_TABLES = {
    "new_jobs_found",
    "applied", 
    "i_rejected_them", 
    "waiting_to_hear_back", 
    "pending", 
    "shit_heads_ghosted_me", 
    "assholes_rejected_me", 
    "fuckers"
}

class JobItem(BaseModel):
    company: Optional[str] = None
    date_applied: Optional[str] = None
    position: Optional[str] = None
    wfh: Optional[str] = None
    scheduled: Optional[str] = None
    type: Optional[str] = None
    response_back: Optional[str] = None
    notes: Optional[str] = None
    job_link: Optional[str] = None
    no_of_interviews: Optional[str] = None

class ScraperRequest(BaseModel):
    platform: str
    target: str
    headless: bool = True

active_scraper_process = None


# --- SCRAPER EXECUTION ENDPOINT ---
@app.post("/api/scraper/run")
def run_job_scraper(payload: ScraperRequest):
    global active_scraper_process
    try:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        scraper_path = os.path.join(root_dir, "scraper", "jobscraper.js")
        
        cmd = [
            "node",
            scraper_path,
            f"--platform={payload.platform}",
            f"--target={payload.target}",
            f"--headless={str(payload.headless).lower()}"
        ]
        
        active_scraper_process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True,
            cwd=root_dir
        )
        
        stdout_output = []
        while True:
            output = active_scraper_process.stdout.readline()
            if output == '' and active_scraper_process.poll() is not None:
                break
            if output:
                stdout_output.append(output)

        rc = active_scraper_process.poll()
        full_stdout = "".join(stdout_output)
        
        if rc != 0 and rc is not None:
            raise HTTPException(
                status_code=500, 
                detail="Scraper execution was terminated or failed."
            )
        
        return {
            "status": "success",
            "message": f"Successfully executed scraper for {payload.platform} targeting '{payload.target}'",
            "output": full_stdout
        }
        
    except Exception as ex:
        if isinstance(ex, HTTPException):
            raise ex
        raise HTTPException(
            status_code=500, 
            detail=f"Scraper stopped or encountered an error: {str(ex)}"
        )
    finally:
        active_scraper_process = None


# --- SCRAPER STOP ENDPOINT (Safely kills ONLY the Playwright scraper instance) ---
@app.post("/api/scraper/stop")
def stop_scraper():
    """Terminates only the active jobscraper process without touching Vite or FastAPI."""
    global active_scraper_process
    try:
        if active_scraper_process and active_scraper_process.poll() is None:
            active_scraper_process.terminate()
            active_scraper_process.kill()
            active_scraper_process = None

        if platform.system() == "Windows":
            # Target specifically the jobscraper.js execution thread or orphaned playwright browsers
            subprocess.run(["wmic", "process", "where", "commandline like '%jobscraper.js%'", "call", "terminate"], capture_output=True)
        else:
            subprocess.run(["pkill", "-f", "jobscraper.js"], capture_output=True)

        return {"status": "success", "message": "Scraper stopped successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# --- STATIC ROUTE: MOVE JOB ---
@app.post("/api/jobs/move")
async def move_job(request: Request):
    body = await request.json()
    source_table = body.get("source_table")
    target_table = body.get("target_table")
    company = body.get("company")
    position = body.get("position")
    row_id = str(body.get("row_id", ""))

    if source_table not in VALID_TABLES or target_table not in VALID_TABLES:
        raise HTTPException(status_code=400, detail=f"Invalid table names: {source_table} -> {target_table}")
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        row = None
        if company and position:
            cur.execute(f'SELECT * FROM "{source_table}" WHERE company = %s AND position = %s LIMIT 1;', (company, position))
            row = cur.fetchone()
        
        if not row and row_id:
            if row_id.startswith("("):
                cur.execute(f'SELECT * FROM "{source_table}" WHERE ctid = %s::tid;', (row_id,))
            else:
                try:
                    cur.execute(f'SELECT * FROM "{source_table}" WHERE id = %s;', (int(row_id),))
                except ValueError:
                    pass
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
            
        row_data = dict(row)
        row_data.pop("id", None)
        row_data.pop("ctid", None)
        
        cols = ", ".join([f'"{k}"' for k in row_data.keys()])
        vals = list(row_data.values())
        placeholders = ", ".join(["%s"] * len(vals))
        
        cur.execute(f'INSERT INTO "{target_table}" ({cols}) VALUES ({placeholders});', vals)
        
        if company and position:
            cur.execute(f'DELETE FROM "{source_table}" WHERE ctid IN (SELECT ctid FROM "{source_table}" WHERE company = %s AND position = %s LIMIT 1);', (company, position))
        elif row_id.startswith("("):
            cur.execute(f'DELETE FROM "{source_table}" WHERE ctid = %s::tid;', (row_id,))
        else:
            cur.execute(f'DELETE FROM "{source_table}" WHERE id = %s;', (int(row_id),))
            
        conn.commit()
        return {"message": f"Job successfully moved to {target_table}"}
    except Exception as e:
        conn.rollback()
        print(f"CRITICAL Error moving job: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# --- DYNAMIC ROUTES: GET ALL ---
@app.get("/api/jobs/all")
def get_all_jobs(
    limit: int = Query(25, ge=1, le=400),
    offset: int = Query(0, ge=0)
):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        all_rows = []
        total_count = 0
        for table in VALID_TABLES:
            cur.execute(f'SELECT COUNT(*) FROM "{table}";')
            cnt = cur.fetchone()["count"]
            total_count += cnt
            
            cur.execute(f'SELECT \'{table}\' as table_name, ctid as id, * FROM "{table}";')
            all_rows.extend(cur.fetchall())
            
        paginated_rows = all_rows[offset:offset + limit]
        return {
            "total": total_count,
            "items": paginated_rows
        }
    except Exception as e:
        print(f"Error in get_all_jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# --- DYNAMIC ROUTES: GET BY TABLE ---
@app.get("/api/jobs/{table_name}")
def get_jobs(
    table_name: str,
    limit: int = Query(25, ge=1, le=400),
    offset: int = Query(0, ge=0)
):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail=f"Invalid table name: {table_name}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(f'SELECT COUNT(*) FROM "{table_name}";')
        count_result = cur.fetchone()
        total_count = count_result["count"] if count_result else 0

        cur.execute(f'SELECT \'{table_name}\' as table_name, ctid as id, * FROM "{table_name}" LIMIT %s OFFSET %s;', (limit, offset))
        rows = cur.fetchall()
        
        return {
            "total": total_count,
            "items": rows
        }
    except Exception as e:
        print(f"Error in get_jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# --- DYNAMIC ROUTES: ADD JOB ---
@app.post("/api/jobs/{table_name}")
def add_job(table_name: str, job: JobItem):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail=f"Invalid table name: {table_name}")
    
    data = job.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No data provided to insert")

    columns = ", ".join([f'"{k}"' for k in data.keys()])
    values = list(data.values())
    placeholders = ", ".join(["%s"] * len(values))
    
    conn = get_db_connection()
    cur = conn.cursor()
    query = f'INSERT INTO "{table_name}" ({columns}) VALUES ({placeholders});'
    cur.execute(query, values)
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job added successfully"}


# --- DYNAMIC ROUTES: UPDATE JOB ---
@app.put("/api/jobs/{table_name}/{row_id}")
def update_job(table_name: str, row_id: str, job: JobItem):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail=f"Invalid table name: {table_name}")
    
    data = job.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    set_clause = ", ".join([f'"{k}" = %s' for k in data.keys()])
    values = list(data.values())
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    if row_id.startswith("("):
        query = f'UPDATE "{table_name}" SET {set_clause} WHERE ctid = %s::tid;'
        values.append(row_id)
    else:
        query = f'UPDATE "{table_name}" SET {set_clause} WHERE id = %s;'
        values.append(int(row_id))
        
    cur.execute(query, values)
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job updated successfully"}


# --- DYNAMIC ROUTES: DELETE JOB ---
@app.delete("/api/jobs/{table_name}/{row_id}")
def delete_job(table_name: str, row_id: str):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail=f"Invalid table name: {table_name}")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    if row_id.startswith("("):
        cur.execute(f'DELETE FROM "{table_name}" WHERE ctid = %s::tid;', (row_id,))
    else:
        cur.execute(f'DELETE FROM "{table_name}" WHERE id = %s;', (int(row_id),))
        
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)