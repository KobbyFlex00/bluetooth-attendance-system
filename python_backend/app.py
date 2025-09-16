import csv
import os
import sqlite3
from io import StringIO, BytesIO
from datetime import datetime, date
from typing import Optional, Dict, Any
from flask import Flask, jsonify, request, Response, send_from_directory
from flask_cors import CORS
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from openpyxl import Workbook

# ---------------- App setup ----------------
app = Flask(__name__)
CORS(app)

# ---------------- Robust paths (absolute) ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))          # .../PRJ_GROUP5/python_backend
DATA_DIR = os.path.join(BASE_DIR, "data")                      # .../PRJ_GROUP5/python_backend/data
CSV_PATH = os.path.join(DATA_DIR, "cleaned_class_list.csv")    # absolute path
DB_PATH  = os.path.join(DATA_DIR, "attendance.db")             # absolute path

print(f"[INFO] BASE_DIR = {BASE_DIR}")
print(f"[INFO] DATA_DIR = {DATA_DIR}")
print(f"[INFO] CSV_PATH = {CSV_PATH}")
print(f"[INFO] DB_PATH  = {DB_PATH}")

# Detect web directory (sibling to python_backend)
WEB_DIR = os.path.join(os.path.dirname(BASE_DIR), "web")
print(f"[INFO] WEB_DIR = {WEB_DIR}")

# Configure Flask to serve the frontend static files from the sibling web/ directory
# Disable Flask's automatic static route to avoid shadowing API paths
app.static_folder = None

# ---------------- In-memory class list ----------------
class_list: list[Dict[str, Any]] = []  # {"Name": ..., "Student ID": ..., "MAC": ...}

# ---------------- DB helpers ----------------
def get_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def column_exists(con, table, column):
    rows = con.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r[1] == column for r in rows)

def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    with get_db() as con:
        # sessions: track lectures
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                name     TEXT,
                start_ts TEXT NOT NULL,
                end_ts   TEXT
            )
            """
        )

        # attendance: session_id is nullable (for "no active session" -> day mode)
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS attendance (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id  TEXT NOT NULL,
                name        TEXT NOT NULL,
                mac         TEXT,
                ts          TEXT NOT NULL,
                session_id  INTEGER,
                FOREIGN KEY(session_id) REFERENCES sessions(id)
            )
            """
        )

        # Ensure session_id column exists (migrate older DBs)
        if not column_exists(con, "attendance", "session_id"):
            con.execute("ALTER TABLE attendance ADD COLUMN session_id INTEGER")

    print(f"[INFO] DB ready at {DB_PATH}")

# ---------------- CSV loader ----------------
def load_class_list():
    """Load Name, Student ID, MAC Address (optional) from CSV into memory.
    Support multiple CSV header layouts (e.g. Name & Student ID) or
    (student_id, first_name, last_name).
    """
    class_list.clear()
    try:
        if not os.path.exists(CSV_PATH):
            print(f"[WARN] CSV not found at {CSV_PATH}. Validation will fail until the file exists.")
            try:
                print("[INFO] Files currently in DATA_DIR:")
                for f in os.listdir(DATA_DIR):
                    print("  -", f)
            except Exception as e:
                print(f"[INFO] Could not list DATA_DIR: {e}")
            return

        with open(CSV_PATH, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            fieldnames = [fn.strip() for fn in (reader.fieldnames or [])]
            lower_fields = [fn.lower() for fn in fieldnames]

            # Helper to grab a value from the row using case-insensitive keys
            def get_val(row, *keys):
                for k in keys:
                    for fn in row.keys():
                        if fn and fn.strip().lower() == k.lower():
                            return (row.get(fn) or "").strip()
                return ""

            # Determine layout
            has_name = any(fn.lower() == "name" for fn in fieldnames)
            has_student_id = any(fn.lower() in ("student id", "student_id", "studentid") for fn in fieldnames)
            has_first_last = ("first_name" in lower_fields or "first name" in lower_fields) and ("last_name" in lower_fields or "last name" in lower_fields)
            has_mac = any("mac" in fn.lower() for fn in fieldnames)

            for row in reader:
                # Normalize values
                if has_name and has_student_id:
                    name = get_val(row, "Name")
                    sid = get_val(row, "Student ID", "student_id")
                elif has_first_last and has_student_id:
                    first = get_val(row, "first_name", "first name")
                    last = get_val(row, "last_name", "last name")
                    name = (first + " " + last).strip()
                    sid = get_val(row, "student_id", "Student ID")
                else:
                    # Fallback: try common alternatives
                    name = get_val(row, "name", "full_name", "full name")
                    sid = get_val(row, "student_id", "student id", "id")

                mac = get_val(row, "MAC", "MAC Address", "mac_address") if has_mac else ""

                if name and sid:
                    class_list.append({"Name": name, "Student ID": sid, "MAC": mac})

        print(f"[INFO] Loaded {len(class_list)} students from {CSV_PATH}")
    except Exception as e:
        print(f"[ERROR] Failed to load class list: {e}")

# ---------------- Session helpers ----------------
def get_active_session() -> Optional[Dict[str, Any]]:
    with get_db() as con:
        row = con.execute(
            "SELECT id, name, start_ts, end_ts FROM sessions WHERE end_ts IS NULL ORDER BY id DESC LIMIT 1"
        ).fetchone()
    return dict(row) if row else None

def start_session(name: Optional[str]) -> Dict[str, Any]:
    sess_name = (name or f"Lecture {date.today().isoformat()}").strip()
    now = datetime.now().isoformat(timespec="seconds")
    with get_db() as con:
        # end any existing session automatically
        con.execute("UPDATE sessions SET end_ts = ? WHERE end_ts IS NULL", (now,))
        con.execute("INSERT INTO sessions (name, start_ts) VALUES (?, ?)", (sess_name, now))
        new_id = con.execute("SELECT last_insert_rowid()").fetchone()[0]
        row = con.execute("SELECT id, name, start_ts, end_ts FROM sessions WHERE id = ?", (new_id,)).fetchone()
    return dict(row)

def end_active_session() -> Optional[Dict[str, Any]]:
    now = datetime.now().isoformat(timespec="seconds")
    with get_db() as con:
        row = con.execute(
            "SELECT id, name, start_ts, end_ts FROM sessions WHERE end_ts IS NULL ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if not row:
            return None
        con.execute("UPDATE sessions SET end_ts = ? WHERE id = ?", (now, row["id"]))
        row = con.execute("SELECT id, name, start_ts, end_ts FROM sessions WHERE id = ?", (row["id"],)).fetchone()
    return dict(row)

# ---------------- Startup ----------------
init_db()
load_class_list()

# ---------------- Routes ----------------
@app.route("/")
def home():
    # Serve the frontend index.html from the configured WEB_DIR
    try:
        return send_from_directory(WEB_DIR, "index.html")
    except Exception as e:
        print(f"[ERROR] Could not serve index.html: {e}")
        return "Frontend not found", 404

@app.route("/health")
def health():
    with get_db() as con:
        count = con.execute("SELECT COUNT(*) FROM attendance").fetchone()[0]
        sess = con.execute(
            "SELECT id, name, start_ts, end_ts FROM sessions WHERE end_ts IS NULL ORDER BY id DESC LIMIT 1"
        ).fetchone()
    return jsonify({
        "status": "ok",
        "students_loaded": len(class_list),
        "attendance_rows": count,
        "csv_exists": os.path.exists(CSV_PATH),
        "active_session": dict(sess) if sess else None
    })

# ---- Session management ----
@app.route("/api/session", methods=["GET"])
def get_session():
    s = get_active_session()
    return jsonify({"active_session": s}), 200

@app.route("/api/session/start", methods=["POST"])
def api_start_session():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    s = start_session(name)
    return jsonify({"active_session": s, "message": "Session started"}), 200

@app.route("/api/session/end", methods=["POST"])
def api_end_session():
    s = end_active_session()
    if not s:
        return jsonify({"message": "No active session to end"}), 400
    return jsonify({"ended_session": s, "message": "Session ended"}), 200

# ---- Validation & logging with rules ----
@app.route("/api/validate", methods=["POST"])
def validate_scan():
    """
    Validates by student_id OR name OR mac_address.
    Rules:
      - If a session is active: only one log per student per session.
      - If no active session: only one log per student per day.
    On (first) success, logs attendance with a timestamp.
    """
    data = request.get_json(silent=True) or {}
    student_id = (data.get('student_id') or '').strip()
    name       = (data.get('name') or '').strip()
    mac_addr   = (data.get('mac_address') or '').strip()

    print(f"[DEBUG] Validation request: student_id={student_id}, name={name}, mac_addr={mac_addr}")
    print(f"[DEBUG] Loaded class_list count: {len(class_list)}")
    if len(class_list) > 0:
        print(f"[DEBUG] First 3 students: {class_list[:3]}")

    def matches(s):
        return (
            (student_id and s['Student ID'] == student_id) or
            (name and s['Name'].lower() == name.lower()) or
            (mac_addr and s['MAC'] and s['MAC'].lower() == mac_addr.lower())
        )

    matched = next((s for s in class_list if matches(s)), None)
    if not matched:
        print("[DEBUG] No matching student found")
        return jsonify({"status": "invalid"}), 404

    now = datetime.now().isoformat(timespec="seconds")

    with get_db() as con:
        # Use named expression + swapped branches per Sourcery:
        if not (active := get_active_session()):
            # --- No active session: day scope uniqueness ---
            today = date.today().isoformat()  # YYYY-MM-DD
            if (dup := con.execute(
                "SELECT 1 FROM attendance WHERE student_id = ? AND DATE(ts) = ? AND session_id IS NULL LIMIT 1",
                (matched['Student ID'], today)
            ).fetchone()):
                return jsonify({
                    "status": "valid",
                    "student": matched,
                    "logged": False,
                    "reason": "already_logged_today",
                    "scope": "day",
                    "date": today
                }), 200

            con.execute(
                "INSERT INTO attendance (student_id, name, mac, ts, session_id) VALUES (?, ?, ?, ?, NULL)",
                (matched['Student ID'], matched['Name'], mac_addr or matched.get('MAC') or '', now)
            )
            return jsonify({
                "status": "valid",
                "student": matched,
                "logged": True,
                "timestamp": now,
                "scope": "day"
            }), 200
        else:
            # --- Active session: one log per student per session ---
            if (dup := con.execute(
                "SELECT 1 FROM attendance WHERE session_id = ? AND student_id = ? LIMIT 1",
                (active["id"], matched["Student ID"])
            ).fetchone()):
                return jsonify({
                    "status": "valid",
                    "student": matched,
                    "logged": False,
                    "reason": "already_logged_in_session",
                    "scope": "session",
                    "session": active
                }), 200

            con.execute(
                "INSERT INTO attendance (student_id, name, mac, ts, session_id) VALUES (?, ?, ?, ?, ?)",
                (matched['Student ID'], matched['Name'], mac_addr or matched.get('MAC') or '', now, active["id"])
            )
            return jsonify({
                "status": "valid",
                "student": matched,
                "logged": True,
                "timestamp": now,
                "scope": "session",
                "session": active
            }), 200

# ---- Attendance list & export ----
@app.route("/api/attendance", methods=["GET"])
def list_attendance():
    """
    Returns attendance rows.
    Optional query params:
      - session_id=<id>    (filter by session)
      - date_from=YYYY-MM-DD
      - date_to=YYYY-MM-DD
      - limit=N (default 200)
    """
    session_id = request.args.get("session_id", "").strip()
    date_from  = request.args.get("date_from", "").strip()
    date_to    = request.args.get("date_to", "").strip()
    try:
        limit = int(request.args.get("limit", "200"))
    except ValueError:
        limit = 200

    base_sql = "SELECT id, student_id, name, mac, ts, session_id FROM attendance"
    where = []
    params = []

    if session_id:
        where.append("session_id = ?")
        params.append(session_id)
    if date_from:
        where.append("DATE(ts) >= DATE(?)")
        params.append(date_from)
    if date_to:
        where.append("DATE(ts) <= DATE(?)")
        params.append(date_to)

    if where:
        base_sql += " WHERE " + " AND ".join(where)

    base_sql += " ORDER BY ts DESC, id DESC LIMIT ?"
    params.append(limit)

    with get_db() as con:
        rows = [dict(r) for r in con.execute(base_sql, params).fetchall()]

    return jsonify(rows), 200

@app.route("/api/attendance/export", methods=["GET"])
def export_attendance():
    """
    Exports attendance as CSV, PDF, or Excel.
    Optional query params: session_id, date_from, date_to, format (csv, pdf, xlsx)
    """
    session_id = request.args.get("session_id", "").strip()
    date_from  = request.args.get("date_from", "").strip()
    date_to    = request.args.get("date_to", "").strip()
    export_format = request.args.get("format", "csv").lower()

    base_sql = "SELECT student_id, name, mac, ts, session_id FROM attendance"
    where = []
    params = []

    if session_id:
        where.append("session_id = ?")
        params.append(session_id)
    if date_from:
        where.append("DATE(ts) >= DATE(?)")
        params.append(date_from)
    if date_to:
        where.append("DATE(ts) <= DATE(?)")
        params.append(date_to)

    if where:
        base_sql += " WHERE " + " AND ".join(where)

    base_sql += " ORDER BY ts DESC, rowid DESC"

    with get_db() as con:
        rows = [dict(r) for r in con.execute(base_sql, params).fetchall()]

    if export_format == "pdf":
        # Generate PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title = Paragraph("Attendance Report", styles['Title'])
        elements.append(title)

        # Table data
        data = [["Student ID", "Name", "MAC", "Timestamp", "Session ID"]]
        for r in rows:
            data.append([r["student_id"], r["name"], r["mac"], r["ts"], str(r.get("session_id") or "")])

        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), '#f0f0f0'),
            ('TEXTCOLOR', (0, 0), (-1, 0), '#000000'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), '#ffffff'),
            ('GRID', (0, 0), (-1, -1), 1, '#000000'),
        ]))
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)
        pdf_data = buffer.getvalue()
        buffer.close()

        filename = f"attendance_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return Response(
            pdf_data,
            mimetype="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif export_format == "xlsx":
        # Generate Excel
        wb = Workbook()
        ws = wb.active
        ws.title = "Attendance"

        # Headers
        ws.append(["Student ID", "Name", "MAC", "Timestamp", "Session ID"])

        # Data
        for r in rows:
            ws.append([r["student_id"], r["name"], r["mac"], r["ts"], r.get("session_id") or ""])

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        xlsx_data = buffer.getvalue()
        buffer.close()

        filename = f"attendance_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        return Response(
            xlsx_data,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    else:  # default to csv
        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow(["Student ID", "Name", "MAC", "Timestamp", "Session ID"])
        for r in rows:
            writer.writerow([r["student_id"], r["name"], r["mac"], r["ts"], r.get("session_id") or ""])

        csv_data = buf.getvalue()
        buf.close()

        filename = f"attendance_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

# ---- Students management ----
@app.route("/api/students", methods=["GET"])
def get_students():
    """Return list of students from class list."""
    return jsonify(class_list), 200

@app.route("/api/students", methods=["POST"])
def add_student():
    """Add a new student to class list and CSV."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    student_id = (data.get("student_id") or "").strip()
    mac = (data.get("mac") or "").strip()

    if not name or not student_id:
        return jsonify({"error": "Name and Student ID are required"}), 400

    # Check if student_id already exists
    if any(s["Student ID"] == student_id for s in class_list):
        return jsonify({"error": "Student ID already exists"}), 400

    new_student = {"Name": name, "Student ID": student_id, "MAC": mac}
    class_list.append(new_student)

    # Append to CSV
    try:
        with open(CSV_PATH, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["Name", "Student ID", "MAC"])
            writer.writerow(new_student)
    except Exception as e:
        print(f"[ERROR] Failed to append to CSV: {e}")
        return jsonify({"error": "Failed to save to CSV"}), 500

    return jsonify({"message": "Student added", "student": new_student}), 201

@app.route("/api/students/upload", methods=["POST"])
def upload_students():
    """Upload CSV data to update class list."""
    data = request.get_json(silent=True) or {}
    csv_data = data.get("csv", "").strip()
    if not csv_data:
        return jsonify({"error": "CSV data required"}), 400

    try:
        reader = csv.DictReader(StringIO(csv_data))
        new_students = []
        for row in reader:
            name = (row.get("Name") or row.get("name") or "").strip()
            sid = (row.get("Student ID") or row.get("student_id") or "").strip()
            mac = (row.get("MAC") or row.get("mac") or "").strip()
            if name and sid:
                new_students.append({"Name": name, "Student ID": sid, "MAC": mac})

        # Overwrite CSV
        with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["Name", "Student ID", "MAC"])
            writer.writeheader()
            for s in new_students:
                writer.writerow(s)

        # Reload class list
        load_class_list()

        return jsonify({"message": f"Uploaded {len(new_students)} students"}), 200
    except Exception as e:
        print(f"[ERROR] Failed to upload CSV: {e}")
        return jsonify({"error": "Invalid CSV format"}), 400

# ---- Manual attendance logging ----
@app.route("/api/attendance", methods=["POST"])
def manual_attendance():
    """Manually log attendance for a student."""
    data = request.get_json(silent=True) or {}
    student_id = (data.get("student_id") or "").strip()
    name = (data.get("name") or "").strip()

    if not student_id and not name:
        return jsonify({"error": "Student ID or Name required"}), 400

    # Find student
    matched = None
    for s in class_list:
        if student_id and s["Student ID"] == student_id:
            matched = s
            break
        elif name and s["Name"].lower() == name.lower():
            matched = s
            break

    if not matched:
        return jsonify({"error": "Student not found"}), 404

    now = datetime.now().isoformat(timespec="seconds")

    with get_db() as con:
        active = get_active_session()
        if active:
            # Check duplicate in session
            if con.execute("SELECT 1 FROM attendance WHERE session_id = ? AND student_id = ? LIMIT 1", (active["id"], matched["Student ID"])).fetchone():
                return jsonify({"error": "Already logged for this session"}), 400
            con.execute("INSERT INTO attendance (student_id, name, mac, ts, session_id) VALUES (?, ?, ?, ?, ?)",
                        (matched["Student ID"], matched["Name"], matched.get("MAC") or "", now, active["id"]))
        else:
            # Day scope
            today = date.today().isoformat()
            if con.execute("SELECT 1 FROM attendance WHERE student_id = ? AND DATE(ts) = ? AND session_id IS NULL LIMIT 1",
                           (matched["Student ID"], today)).fetchone():
                return jsonify({"error": "Already logged today"}), 400
            con.execute("INSERT INTO attendance (student_id, name, mac, ts, session_id) VALUES (?, ?, ?, ?, NULL)",
                        (matched["Student ID"], matched["Name"], matched.get("MAC") or "", now))

    return jsonify({"message": "Attendance logged", "student": matched, "timestamp": now}), 200

# ---- Sessions list ----
@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    """Return list of all sessions."""
    with get_db() as con:
        rows = con.execute("SELECT id, name, start_ts, end_ts FROM sessions ORDER BY id DESC").fetchall()
    return jsonify([dict(r) for r in rows]), 200

# ---- Reports summary ----
@app.route("/api/reports/summary", methods=["GET"])
def get_summary():
    """Get attendance summary for session or day."""
    session_id = request.args.get("session_id", "").strip()
    date_str = request.args.get("date", "").strip()  # YYYY-MM-DD

    total_students = len(class_list)

    with get_db() as con:
        if session_id:
            present = con.execute("SELECT COUNT(DISTINCT student_id) FROM attendance WHERE session_id = ?", (session_id,)).fetchone()[0]
        elif date_str:
            present = con.execute("SELECT COUNT(DISTINCT student_id) FROM attendance WHERE DATE(ts) = ? AND session_id IS NULL", (date_str,)).fetchone()[0]
        else:
            return jsonify({"error": "Provide session_id or date"}), 400

    absent = total_students - present
    return jsonify({
        "total_students": total_students,
        "present": present,
        "absent": absent,
        "scope": "session" if session_id else "day"
    }), 200

# ---------------- Helpful 404 for API paths ----------------
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({
            "error": "Not Found",
            "hint": "Try POST /api/validate, GET /api/attendance, GET/POST /api/session*, GET/POST /api/students*, POST /api/students/upload, POST /api/attendance, GET /api/reports/summary, GET /api/sessions"
        }), 404
    return "Not Found", 404

# Serve static files for non-API paths. This handler is placed after API route definitions
# so API endpoints are matched first. It only serves files that exist in WEB_DIR and
# falls back to index.html for client-side routes (SPA behavior).
@app.route('/<path:filename>')
def serve_frontend_file(filename):
    if filename.startswith('api/') or filename == 'api':
        return not_found(None)
    file_path = os.path.join(WEB_DIR, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(WEB_DIR, filename)
    # SPA fallback
    index_path = os.path.join(WEB_DIR, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(WEB_DIR, 'index.html')
    return not_found(None)

# ---------------- Entrypoint ----------------
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    # Explicitly disable debug mode for production
    app.run(debug=False, use_reloader=False, host='0.0.0.0', port=port)
