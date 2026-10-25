from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional

app = FastAPI(title="Job Tracker API")

# Enable CORS so your React frontend (localhost:5173) can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Connection Helper (restored with your correct credentials)
def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="postgres",
        user="jobTracker",
        password="F1nd@J0b!",
        cursor_factory=RealDictCursor
    )

# Updated to match your exact database tables and frontend tabs
VALID_TABLES = {
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

class MoveJobRequest(BaseModel):
    source_table: str
    target_table: str
    job_id: int

@app.get("/api/jobs/{table_name}")
def get_jobs(table_name: str):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    conn = get_db_connection()
    cur = conn.cursor()
    # Using double quotes around table name for safety with snake_case
    cur.execute(f'SELECT * FROM "{table_name}";')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

@app.post("/api/jobs/{table_name}")
def add_job(table_name: str, job: JobItem):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    data = job.dict(exclude_unset=True)
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
    
    data = job.dict(exclude_unset=True)
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

@app.post("/api/jobs/move")
def move_job(req: MoveJobRequest):
    if req.source_table not in VALID_TABLES or req.target_table not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table names")
        
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(f'SELECT * FROM "{req.source_table}" WHERE id = %s;', (req.job_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
        
    row_data = dict(row)
    row_data.pop("id", None)
    
    cols = ", ".join([f'"{k}"' for k in row_data.keys()])
    vals = list(row_data.values())
    placeholders = ", ".join(["%s"] * len(vals))
    
    cur.execute(f'INSERT INTO "{req.target_table}" ({cols}) VALUES ({placeholders});', vals)
    cur.execute(f'DELETE FROM "{req.source_table}" WHERE id = %s;', (req.job_id,))
    
    conn.commit()
    cur.close()
    conn.close()
    return {"message": f"Job moved from {req.source_table} to {req.target_table}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)