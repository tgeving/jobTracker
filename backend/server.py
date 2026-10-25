from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional, List, Dict, Any

app = FastAPI(title="Job Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="postgres",
        user="jobTracker",
        password="F1nd@J0b!",
        cursor_factory=RealDictCursor
    )

# Updated to match your exact database tables
VALID_TABLES = {
    "applied", 
    "i_rejected_them", 
    "waiting_to_hear_back", 
    "pending", 
    "shit_heads_ghosted_me", 
    "assholes_rejected_me", 
    "fuckers"
}

TABLE_TO_STATUS = {
    "applied": "Applied",
    "i_rejected_them": "I Rejected Them",
    "waiting_to_hear_back": "Waiting to Hear Back",
    "pending": "Pending",
    "shit_heads_ghosted_me": "No Response (Ghosted)",
    "assholes_rejected_me": "Assholes Rejected Me",
    "fuckers": "Fuckers"
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

class MoveJobRequest(BaseModel):
    source_table: str
    target_table: str
    job_id: int

# Updated endpoint to include /api/jobs/{table_name} matching your frontend
@app.get("/api/jobs/{table_name}")
def get_jobs_by_table(table_name: str):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
        
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(f'SELECT * FROM "{table_name}";')
        rows = cur.fetchall()
        status_label = TABLE_TO_STATUS.get(table_name, "Applied")
        
        job_list = []
        for row in rows:
            job_dict = dict(row)
            job_dict["status"] = status_label
            job_dict["source_table"] = table_name
            job_list.append(job_dict)
            
        return job_list
    except Exception as e:
        print(f"Error fetching jobs for {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# Keeping legacy /api/jobs route if "All" tab fetches combined records
@app.get("/api/jobs")
def get_all_jobs():
    conn = get_db_connection()
    cur = conn.cursor()
    all_flat_jobs = []
    try:
        for table_name in VALID_TABLES:
            cur.execute(f'SELECT * FROM "{table_name}";')
            rows = cur.fetchall()
            status_label = TABLE_TO_STATUS.get(table_name, "Applied")
            for row in rows:
                job_dict = dict(row)
                job_dict["status"] = status_label
                job_dict["source_table"] = table_name
                all_flat_jobs.append(job_dict)
        return all_flat_jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.post("/api/jobs/{table_name}")
def add_job(table_name: str, job: JobItem):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    data = job.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No data provided")
        
    columns = ", ".join([f'"{k}"' for k in data.keys()])
    values = list(data.values())
    placeholders = ", ".join(["%s"] * len(values))
    
    conn = get_db_connection()
    cur = conn.cursor()
    query = f'INSERT INTO "{table_name}" ({columns}) VALUES ({placeholders}) RETURNING id;'
    cur.execute(query, values)
    new_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job added successfully", "id": new_id}

@app.put("/api/jobs/{table_name}/{job_id}")
def update_job(table_name: str, job_id: int, job: JobItem):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    data = job.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    set_clause = ", ".join([f'"{k}" = %s' for k in data.keys()])
    values = list(data.values()) + [job_id]
    
    conn = get_db_connection()
    cur = conn.cursor()
    query = f'UPDATE "{table_name}" SET {set_clause} WHERE id = %s;'
    cur.execute(query, values)
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job updated successfully"}

@app.delete("/api/jobs/{table_name}/{job_id}")
def delete_job(table_name: str, job_id: int):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(f'DELETE FROM "{table_name}" WHERE id = %s;', (job_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job deleted successfully"}
