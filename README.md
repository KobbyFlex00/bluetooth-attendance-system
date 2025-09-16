# Bluetooth-Based Automated Classroom Attendance System

A professional, responsive web application for automated Bluetooth-based attendance logging in classrooms.

## Features

- **Student Management**: Import students via CSV, view/add students manually.
- **Automated Attendance**: Bluetooth device detection for attendance logging.
- **Manual Attendance**: Option to mark attendance manually.
- **Session Management**: Start/end attendance sessions.
- **Reports**: Export attendance data to PDF and Excel, view summary charts.
- **Responsive UI**: Works on desktop and mobile devices.

## Tech Stack

- **Backend**: Python, Flask, SQLite
- **Frontend**: React.js, Bootstrap, Chart.js
- **Bluetooth**: Web Bluetooth API (Chrome-based browsers)

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 14+
- Chrome browser (for Bluetooth functionality)

### Backend Setup

1. Navigate to the `python_backend` directory:
   ```
   cd python_backend
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the Flask server:
   ```
   python app.py
   ```
   The backend will run on http://localhost:5000.

### Frontend Setup

1. Navigate to the `react-frontend` directory:
   ```
   cd react-frontend
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Start the React development server:
   ```
   npm start
   ```
   The frontend will run on http://localhost:3000.

### Usage

1. Open http://localhost:3000 in your browser.
2. Upload a CSV file with student data (columns: Name, Student ID, MAC).
3. Start a session and use Bluetooth scanning or manual marking for attendance.
4. View reports and export data.

### CSV Format

The student CSV should have the following columns:
- Name
- Student ID
- MAC (optional)

Example:
```
Name,Student ID,MAC
John Doe,12345,AA:BB:CC:DD:EE:FF
Jane Smith,12346,
```

### Bluetooth Scanning

- Supported in Chrome-based browsers.
- Requires user permission for Bluetooth access.
- Scans for nearby devices and matches against student MAC addresses or names.

### API Endpoints

- `GET /api/students` - List students
- `POST /api/students` - Add student
- `POST /api/students/upload` - Upload CSV
- `GET /api/attendance` - List attendance records
- `POST /api/attendance` - Manual attendance
- `GET /api/attendance/export` - Export data (CSV/PDF/Excel)
- `GET/POST /api/session/*` - Session management
- `GET /api/reports/summary` - Attendance summary
- `GET /api/sessions` - List sessions

## Demo

The application is ready to run locally. Ensure both backend and frontend servers are running simultaneously.

## Notes

- Database is stored in `python_backend/data/attendance.db`.
- Student data is loaded from `python_backend/data/cleaned_class_list.csv`.
- For production deployment, consider using a WSGI server for Flask and building the React app for static serving.
