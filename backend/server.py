from fastapi import FastAPI, HTTPException, Query
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

def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="postgres",
        user="jobTracker",
        password="F1nd@J0b!",
        cursor_factory=RealDictCursor
    )

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

@app.get("/api/jobs/{table_name}")
def get_jobs(
    table_name: str,
    limit: int = Query(25, ge=1, le=400),
    offset: int = Query(0, ge=0)
):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute(f'SELECT COUNT(*) FROM "{table_name}";')
        count_result = cur.fetchone()
        total_count = count_result["count"] if count_result else 0

        # Include ctid if no 'id' column exists so we can still track rows for edits/deletes
        cur.execute(f'SELECT ctid as id, * FROM "{table_name}" LIMIT %s OFFSET %s;', (limit, offset))
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

@app.post("/api/jobs/{table_name}")
def add_job(table_name: str, job: JobItem):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    data = job.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No data provided to insert")

    columns = ", ".join([f'"{k}"' for k in data.keys()])
    values = list(data.values())
    placeholders = ", ".join(["%s"] * len(values))
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Simple insert without expecting a serial 'id' column back
    query = f'INSERT INTO "{table_name}" ({columns}) VALUES ({placeholders});'
    cur.execute(query, values)
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job added successfully"}

@app.put("/api/jobs/{table_name}/{row_id}")
def update_job(table_name: str, row_id: str, job: JobItem):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    data = job.dict(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    set_clause = ", ".join([f'"{k}" = %s' for k in data.keys()])
    values = list(data.values())
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Support updating either by standard id or postgres internal ctid
    if row_id.startswith("("):
        query = f'UPDATE "{table_name}" SET {set_clause} WHERE ctid = %s;'
        values.append(row_id)
    else:
        query = f'UPDATE "{table_name}" SET {set_clause} WHERE id = %s;'
        values.append(int(row_id))
        
    cur.execute(query, values)
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job updated successfully"}

@app.delete("/api/jobs/{table_name}/{row_id}")
def delete_job(table_name: str, row_id: str):
    if table_name not in VALID_TABLES:
        raise HTTPException(status_code=400, detail="Invalid table name")
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    if row_id.startswith("("):
        cur.execute(f'DELETE FROM "{table_name}" WHERE ctid = %s;', (row_id,))
    else:
        cur.execute(f'DELETE FROM "{table_name}" WHERE id = %s;', (int(row_id),))
        
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Job deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)