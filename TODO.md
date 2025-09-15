# TODO List for Bluetooth Attendance System

## Backend Updates
- [x] Add requirements.txt with dependencies (Flask, flask-cors, reportlab, openpyxl)
- [x] Update app.py: Add /api/students GET/POST endpoints
- [x] Update app.py: Add /api/attendance POST for manual logging
- [x] Update app.py: Add /api/reports/summary GET for stats
- [x] Update app.py: Modify /api/attendance/export to support PDF and Excel

## Frontend Updates
- [x] Update index.html: Add Bootstrap CDN, nav tabs, sections for Dashboard/Students/Attendance/Reports, modals
- [x] Update styles.css: Integrate Bootstrap, add responsive styles
- [x] Update app.js: Change API_BASE to local, add functions for students management, manual attendance, reports, chart

## Other
- [x] Clean up duplicate directory python_backend/python_backend/
- [x] Add README.md with setup instructions

## Testing
- [x] Install Python dependencies
- [x] Run backend locally
- [x] Test endpoints with Postman or browser
- [x] Open frontend, test UI responsiveness
- [x] Test Bluetooth simulation, manual logging, exports
