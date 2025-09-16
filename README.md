# Bluetooth-Based Automated Classroom Attendance System

## Overview
This project is a professional, responsive web application for automated classroom attendance using simulated Bluetooth detection. It includes a Python Flask backend with SQLite database and a modern responsive frontend using Bootstrap.

## Features
- Student management with CSV import and manual addition
- Attendance logging via simulated Bluetooth scan or manual input
- Session management with real-time attendance tracking
- Export attendance reports as PDF and Excel
- Responsive UI with Dashboard, Students, Attendance, and Reports pages

## Tech Stack
- Backend: Python, Flask, SQLite
- Frontend: HTML, CSS, JavaScript, Bootstrap
- Exports: reportlab (PDF), openpyxl (Excel)

## Deployment

### Backend on Render
1. Create a free account at [Render](https://render.com).
2. Click "New" > "Web Service".
3. Connect your GitHub repository containing this project.
4. Set the following:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Root Directory**: `python_backend`
5. Add environment variable: `FLASK_ENV=production`
6. Deploy the service. Note the generated URL (e.g., `https://your-app.onrender.com`).

### Frontend on Vercel
1. Create a free account at [Vercel](https://vercel.com).
2. Click "New Project" and connect your GitHub repository.
3. Set the root directory to `web`.
4. Vercel will auto-detect as static site. Deploy.
5. After deployment, note the Vercel URL (e.g., `https://your-frontend.vercel.app`).
6. Update `web/js/app.js`: Change `API_BASE` from `http://localhost:5000` to your Render backend URL (e.g., `https://your-app.onrender.com`).
7. Redeploy the frontend on Vercel to apply the API_BASE change.

### Alternative: Serve Frontend via Backend
- If deploying backend only, the frontend is served at the backend URL.
- No separate frontend deployment needed, but less optimal for performance.

## Running Locally
1. Create a Python virtual environment:
   ```
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # macOS/Linux
   ```
2. Install dependencies:
   ```
   pip install -r python_backend/requirements.txt
   ```
3. Run the backend:
   ```
   python python_backend/app.py
   ```
4. Open `web/index.html` in a browser.
5. Update `API_BASE` in `web/js/app.js` to `http://localhost:5000`.

## Testing
- Test all API endpoints using tools like Postman or Curl.
- Test frontend pages for responsiveness and functionality.
- Verify Bluetooth simulation, manual attendance, CSV import, and report exports.

## Notes
- Ensure CORS is enabled on backend for frontend domain.
- SQLite database file is located in `python_backend/data/attendance.db`.
- For any issues, check console logs and backend terminal output.
