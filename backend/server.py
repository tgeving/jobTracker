import os
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
        user=os.getenv("DB_USER"),          # Pulls DB_USER from your .env
        password=os.getenv("DB_PASSWORD"),  # Pulls DB_PASSWORD from your .env
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

# --- STATIC ROUTE ---
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

# --- DYNAMIC ROUTES ---
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
            
        # Slice for pagination across aggregated list
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

@app.get("/api/jobs/new_jobs_found")
def get_new_jobs_found():
  conn = get_db_connection()
  cursor = conn.cursor()

  try:
    # Select only the columns that exist in your new_jobs_found table
    cursor.execute(
        "SELECT id, company, position, date_applied, wfh, job_link, notes FROM"
        " new_jobs_found"
    )
    rows = cursor.fetchall()

    jobs = []
    for row in rows:
      jobs.append({
          "id": row[0],
          "bucket": "New Jobs Found",  # Inject the bucket label for the frontend state
          "company": row[1],
          "position": row[2],
          "date_applied": row[3],
          "wfh": row[4],
          "job_link": row[5],
          "notes": row[6],
      })
    return jobs
  except Exception as e:
    conn.rollback()
    raise HTTPException(
        status_code=400,
        detail=f"Error fetching from new_jobs_found table: {str(e)}",
    )
  finally:
    cursor.close()
    conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)