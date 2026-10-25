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

VALID_TABLES = {
    "applied", "i_rejected_them", "waiting_to_hear_back", 
    "pending", "no_response", "went_with_another_canidadate", "rejection"
}

TABLE_TO_STATUS = {
    "applied": "Applied",
    "i_rejected_them": "I Rejected Them",
    "waiting_to_hear_back": "Waiting to Hear Back",
    "pending": "Pending",
    "no_response": "No Response (Ghosted)",
    "went_with_another_canidadate": "Went With Another Candidate",
    "rejection": "Rejection"
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

@app.get("/jobs")
def get_jobs(
    status: Optional[str] = Query(None, description="Filter by status label"),
    limit: int = Query(25, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    conn = get_db_connection()
    cur = conn.cursor()
    all_flat_jobs = []
    
    try:
        tables_to_query = VALID_TABLES
        if status and status != "All":
            matching_tables = [t for t, label in TABLE_TO_STATUS.items() if label.lower() == status.lower()]
            if matching_tables:
                tables_to_query = matching_tables

        for table_name in tables_to_query:
            cur.execute(f"SELECT * FROM {table_name};")
            rows = cur.fetchall()
            status_label = TABLE_TO_STATUS.get(table_name, "Applied")
            
            for row in rows:
                job_dict = dict(row)
                job_dict["status"] = status_label
                job_dict["source_table"] = table_name
                all_flat_jobs.append(job_dict)
                
        total_count = len(all_flat_jobs)
        paginated_jobs = all_flat_jobs[offset : offset + limit]
                
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
        
    return {
        "total": total_count,
        "items": paginated_jobs
    }

@app.post("/jobs/{table_name}")
def add_job(table_name: str, job: JobItem):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    data = job.model_dump(exclude_unset=True)
    columns = ", ".join(data.keys())
    values = list(data.values())
    placeholders = ", ".join(["%s"] * len(values))
    
    conn = get_db_connection()
    cur = conn.cursor()
    query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders}) RETURNING id;"
    cur.execute(query, values)
    new_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job added successfully", "id": new_id}

@app.put("/jobs/{table_name}/{job_id}")
def update_job(table_name: str, job_id: int, job: JobItem):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    data = job.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    set_clause = ", ".join([f"{k} = %s" for k in data.keys()])
    values = list(data.values()) + [job_id]
    
    conn = get_db_connection()
    cur = conn.cursor()
    query = f"UPDATE {table_name} SET {set_clause} WHERE id = %s;"
    cur.execute(query, values)
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job updated successfully"}

@app.delete("/jobs/{table_name}/{job_id}")
def delete_job(table_name: str, job_id: int):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {table_name} WHERE id = %s;", (job_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job deleted successfully"}

@app.post("/jobs/move")
def move_job(req: MoveJobRequest):
    if req.source_table not in VALID_TABLES or req.target_table not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table names")
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(f"SELECT * FROM {req.source_table} WHERE id = %s;", (req.job_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
        
    row_data = dict(row)
    row_data.pop("id", None)
    
    cols = ", ".join(row_data.keys())
    vals = list(row_data.values())
    placeholders = ", ".join(["%s"] * len(vals))
    
    cur.execute(f"INSERT INTO {req.target_table} ({cols}) VALUES ({placeholders});", vals)
    cur.execute(f"DELETE FROM {req.source_table} WHERE id = %s;", (req.job_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    return {"message": f"Job moved from {req.source_table} to {req.target_table}"}