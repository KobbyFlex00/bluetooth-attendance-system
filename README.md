# bluetooth-attendance-system
Manual roll calls waste time, proxy attendance is common. A Bluetooth-based attendance web app that automates roll calls, supports manual marking, and generates reports.
>>>>>>> 4bb7dc3274f69a6056a2f6567686b8deebb5aa86
=======
# Bluetooth-Based Automated Classroom Attendance System

A professional, responsive web application for automated classroom attendance logging using Bluetooth simulation.

## Features

- **Student Management**: Import students via CSV, view list, add manually.
- **Attendance Logging**: Automated via Bluetooth simulation or manual input.
- **Session Management**: Start/end sessions, prevent duplicates per session/day.
- **Reports**: Export attendance to PDF, Excel, or CSV; view summary stats with charts.
- **Responsive UI**: Works on desktop and mobile using Bootstrap.

## Tech Stack

- **Backend**: Python, Flask, SQLite, reportlab (PDF), openpyxl (Excel)
- **Frontend**: HTML, CSS, JavaScript, Bootstrap, Chart.js

## Setup Instructions

1. **Clone or Download** the project.

2. **Install Dependencies**:
   - Navigate to `python_backend/` directory.
   - Install Python packages:
     ```
     pip install -r requirements.txt
     ```

3. **Run the Backend**:
   - In `python_backend/` directory:
     ```
     python app.py
     ```
   - Backend runs on `http://127.0.0.1:5000`.

4. **Open the Frontend**:
   - Open `web/index.html` in a browser, or access via backend at `http://127.0.0.1:5000`.

5. **Demo**:
   - Upload a CSV with student data (columns: Name, Student ID, MAC).
   - Start a session.
   - Simulate Bluetooth scan or manually log attendance.
   - View reports and export.

## API Endpoints

- `GET /api/students`: List students
- `POST /api/students`: Add student (JSON: name, student_id, mac)
- `POST /api/students/upload`: Upload CSV (JSON: csv)
- `POST /api/attendance`: Manual attendance (JSON: student_id or name)
- `GET /api/attendance`: List attendance (query params: session_id, date_from, date_to)
- `GET /api/attendance/export`: Export (format: csv/pdf/xlsx)
- `GET /api/session`: Get active session
- `POST /api/session/start`: Start session (JSON: name)
- `POST /api/session/end`: End session
- `GET /api/sessions`: List all sessions
- `GET /api/reports/summary`: Summary stats (session_id or date)

## Notes

- Bluetooth scanning uses Web Bluetooth API (Chrome required for real devices; simulation for demo).
- Data stored in SQLite (`python_backend/data/attendance.db`).
- CSV file: `python_backend/data/cleaned_class_list.csv`.
=======
# bluetooth-attendance-system
Manual roll calls waste time, proxy attendance is common. A Bluetooth-based attendance web app that automates roll calls, supports manual marking, and generates reports.
>>>>>>> 4bb7dc3274f69a6056a2f6567686b8deebb5aa86
