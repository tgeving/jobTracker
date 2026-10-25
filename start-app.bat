@echo off
title Job Tracker Launcher

echo Starting Backend Server...
start cmd /k "cd /d C:\Users\bug_c\Desktop\jobTracker && uvicorn backend.server:app --reload --port 8000"

echo Starting Frontend UI...
start cmd /k "cd /d C:\Users\bug_c\Desktop\jobTracker\UI && npm run dev"

echo Both services are launching in separate windows!
pause