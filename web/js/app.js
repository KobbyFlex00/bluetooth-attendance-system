const API_BASE = "http://localhost:5000";

let activeSession = null;
let students = [];
let sessions = [];
let attendanceChart = null;

// ---------- Page Navigation ----------
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(pageId).style.display = 'block';
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`[data-page="${pageId.replace('-page', '')}"]`).classList.add('active');
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = e.target.getAttribute('data-page');
    showPage(`${page}-page`);
    loadPageData(page);
  });
});

// ---------- Helpers ----------
function setStatus(msg, kind = "muted") {
  const statusEl = document.getElementById("status");
  if (statusEl) {
    statusEl.textContent = msg;
    statusEl.className = `text-${kind}`;
  }
}

function fmt(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch {
    return dt;
  }
}

// ---------- Dashboard ----------
async function loadDashboard() {
  try {
    const [studentsRes, sessionRes] = await Promise.all([
      fetch(`${API_BASE}/api/students`),
      fetch(`${API_BASE}/api/session`)
    ]);
    const studentsData = await studentsRes.json();
    const sessionData = await sessionRes.json();

    document.getElementById('totalStudents').textContent = studentsData.length;
    activeSession = sessionData.active_session;
    document.getElementById('activeSession').textContent = activeSession ? activeSession.name : 'None';

    // Today's attendance
    const today = new Date().toISOString().slice(0, 10);
    const summaryRes = await fetch(`${API_BASE}/api/reports/summary?date=${today}`);
    const summary = await summaryRes.json();
    document.getElementById('todayAttendance').textContent = `Present: ${summary.present}, Absent: ${summary.absent}`;
  } catch (e) {
    console.error(e);
  }
}

// ---------- Students ----------
async function loadStudents() {
  try {
    const res = await fetch(`${API_BASE}/api/students`);
    students = await res.json();
    renderStudents(students);
  } catch (e) {
    console.error(e);
  }
}

function renderStudents(list) {
  const tbody = document.getElementById('studentsBody');
  tbody.innerHTML = '';
  list.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s['Student ID']}</td>
      <td>${s.Name}</td>
      <td>${s.MAC || ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById('studentSearch').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = students.filter(s =>
    s.Name.toLowerCase().includes(query) ||
    s['Student ID'].toLowerCase().includes(query)
  );
  renderStudents(filtered);
});

document.getElementById('uploadCsvBtn').addEventListener('click', () => {
  document.getElementById('csvFile').click();
});

document.getElementById('csvFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const res = await fetch(`${API_BASE}/api/students/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: text })
    });
    const data = await res.json();
    if (res.ok) {
      setStatus(data.message, 'success');
      loadStudents();
    } else {
      setStatus(data.error, 'danger');
    }
  } catch (e) {
    setStatus('Upload failed', 'danger');
  }
});

document.getElementById('saveStudentBtn').addEventListener('click', async () => {
  const id = document.getElementById('studentId').value;
  const name = document.getElementById('studentName').value;
  const mac = document.getElementById('studentMac').value;
  try {
    const res = await fetch(`${API_BASE}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: id, name, mac })
    });
    const data = await res.json();
    if (res.ok) {
      setStatus(data.message, 'success');
      loadStudents();
      bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
      document.getElementById('addStudentForm').reset();
    } else {
      setStatus(data.error, 'danger');
    }
  } catch (e) {
    setStatus('Failed to add student', 'danger');
  }
});

// ---------- Attendance ----------
async function loadAttendance() {
  await fetchActiveSession();
  await fetchAttendance();
}

function renderAttendance(rows) {
  const tbody = document.getElementById('attendanceBody');
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmt(r.ts)}</td>
      <td>${r.student_id || ''}</td>
      <td>${r.name || ''}</td>
      <td>${r.mac || ''}</td>
      <td>${r.session_id ?? ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function fetchActiveSession() {
  try {
    const res = await fetch(`${API_BASE}/api/session`);
    const data = await res.json();
    activeSession = data.active_session || null;
    updateSessionBadge();
  } catch (e) {
    activeSession = null;
    updateSessionBadge();
  }
}

async function fetchAttendance() {
  const scope = document.getElementById('scopeSelect').value;
  try {
    let url = `${API_BASE}/api/attendance?limit=500`;
    if (scope === 'session' && activeSession) {
      url += `&session_id=${activeSession.id}`;
    } else if (scope === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      url += `&date_from=${today}&date_to=${today}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    renderAttendance(data);
    setStatus(`Loaded ${data.length} attendance rows.`, 'success');
  } catch (e) {
    setStatus('Failed to load attendance.', 'danger');
  }
}

function updateSessionBadge() {
  const badge = document.getElementById('activeSessionBadge');
  if (activeSession) {
    badge.textContent = `Active: ${activeSession.name} — started ${fmt(activeSession.start_ts)}`;
    badge.className = 'badge bg-success';
  } else {
    badge.textContent = 'No active session';
    badge.className = 'badge bg-secondary';
  }
}

async function startSession() {
  const name = document.getElementById('sessionName').value.trim();
  try {
    const res = await fetch(`${API_BASE}/api/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    activeSession = data.active_session;
    updateSessionBadge();
    setStatus(data.message, 'success');
    fetchAttendance();
  } catch (e) {
    setStatus('Failed to start session.', 'danger');
  }
}

async function endSession() {
  try {
    const res = await fetch(`${API_BASE}/api/session/end`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      activeSession = null;
      updateSessionBadge();
      setStatus(data.message, 'warning');
      fetchAttendance();
    } else {
      setStatus(data.message, 'warning');
    }
  } catch (e) {
    setStatus('Failed to end session.', 'danger');
  }
}

async function startBluetoothScan() {
  if (!navigator.bluetooth) {
    setStatus('Web Bluetooth not supported.', 'danger');
    return;
  }
  try {
    setStatus('Requesting Bluetooth device...');
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true
    });
    const mac = device.id || '';
    const name = device.name || '';
    const payload = mac ? { mac_address: mac } : { name };
    const res = await fetch(`${API_BASE}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      if (result.logged) {
        setStatus(`Logged: ${result.student.Name}`, 'success');
      } else {
        setStatus(`Duplicate: ${result.student.Name}`, 'warning');
      }
      fetchAttendance();
    } else {
      setStatus('Invalid student.', 'danger');
    }
  } catch (e) {
    setStatus('Scan failed.', 'danger');
  }
}

document.getElementById('startSessionBtn').addEventListener('click', startSession);
document.getElementById('endSessionBtn').addEventListener('click', endSession);
document.getElementById('startScanBtn').addEventListener('click', startBluetoothScan);
document.getElementById('scopeSelect').addEventListener('change', fetchAttendance);

// ---------- Manual Attendance ----------
document.getElementById('markAttendanceBtn').addEventListener('click', async () => {
  const input = document.getElementById('manualStudentId').value.trim();
  if (!input) return;
  try {
    const res = await fetch(`${API_BASE}/api/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: input, name: input })
    });
    const data = await res.json();
    if (res.ok) {
      setStatus(data.message, 'success');
      fetchAttendance();
      bootstrap.Modal.getInstance(document.getElementById('manualMarkModal')).hide();
      document.getElementById('manualMarkForm').reset();
    } else {
      setStatus(data.error, 'danger');
    }
  } catch (e) {
    setStatus('Failed to mark attendance.', 'danger');
  }
});

// ---------- Reports ----------
async function loadReports() {
  try {
    const res = await fetch(`${API_BASE}/api/sessions`);
    sessions = await res.json();
    const select = document.getElementById('sessionSelect');
    select.innerHTML = '<option value="">Select Session</option>';
    sessions.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${fmt(s.start_ts)})`;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
  }
}

document.getElementById('sessionSelect').addEventListener('change', async (e) => {
  const sessionId = e.target.value;
  if (!sessionId) {
    document.getElementById('summaryText').textContent = 'Select a session.';
    if (attendanceChart) attendanceChart.destroy();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/reports/summary?session_id=${sessionId}`);
    const summary = await res.json();
    document.getElementById('summaryText').textContent = `Total: ${summary.total_students}, Present: ${summary.present}, Absent: ${summary.absent}`;

    // Chart
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    if (attendanceChart) attendanceChart.destroy();
    attendanceChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [{
          data: [summary.present, summary.absent],
          backgroundColor: ['#28a745', '#dc3545']
        }]
      }
    });
  } catch (e) {
    console.error(e);
  }
});

document.getElementById('exportPdfBtn').addEventListener('click', () => {
  const sessionId = document.getElementById('sessionSelect').value;
  const url = `${API_BASE}/api/attendance/export?format=pdf${sessionId ? `&session_id=${sessionId}` : ''}`;
  window.open(url, '_blank');
});

document.getElementById('exportExcelBtn').addEventListener('click', () => {
  const sessionId = document.getElementById('sessionSelect').value;
  const url = `${API_BASE}/api/attendance/export?format=xlsx${sessionId ? `&session_id=${sessionId}` : ''}`;
  window.open(url, '_blank');
});

// ---------- Load Page Data ----------
function loadPageData(page) {
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'students': loadStudents(); break;
    case 'attendance': loadAttendance(); break;
    case 'reports': loadReports(); break;
  }
}

// Initial load
showPage('dashboard-page');
loadPageData('dashboard');
