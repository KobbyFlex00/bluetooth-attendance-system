const API_BASE = "https://bluetooth-attendance-backend.onrender.com/api";

// Navigation and page management
const pages = {
  dashboard: document.getElementById("dashboardPage"),
  students: document.getElementById("studentsPage"),
  attendance: document.getElementById("attendancePage"),
  reports: document.getElementById("reportsPage"),
};

const navLinks = document.querySelectorAll("#navTabs .nav-link");

function showPage(page) {
  Object.values(pages).forEach(p => p.classList.add("d-none"));
  pages[page].classList.remove("d-none");
  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });
}

navLinks.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    showPage(link.dataset.page);
  });
});

// Dashboard elements
const totalStudentsEl = document.getElementById("totalStudents");
const todaysAttendanceEl = document.getElementById("todaysAttendance");
const activeSessionEl = document.getElementById("activeSession");

// Students page elements
const studentsTableBody = document.querySelector("#studentsTable tbody");
const studentSearchInput = document.getElementById("studentSearch");
const csvUploadInput = document.getElementById("csvUpload");
const addStudentBtn = document.getElementById("addStudentBtn");
const addStudentModal = new bootstrap.Modal(document.getElementById("addStudentModal"));
const addStudentForm = document.getElementById("addStudentForm");
const studentIdInput = document.getElementById("studentIdInput");
const studentNameInput = document.getElementById("studentNameInput");
const studentMacInput = document.getElementById("studentMacInput");

// Attendance page elements
const sessionNameInput = document.getElementById("sessionName");
const startSessionBtn = document.getElementById("startSessionBtn");
const endSessionBtn = document.getElementById("endSessionBtn");
const startScanBtn = document.getElementById("startScanBtn");
const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const exportFormatSelect = document.getElementById("exportFormat");
const attendanceTableBody = document.querySelector("#attendanceTable tbody");
const manualMarkBtn = document.getElementById("manualMarkBtn");
const manualMarkModal = new bootstrap.Modal(document.getElementById("manualMarkModal"));
const manualMarkForm = document.getElementById("manualMarkForm");
const manualStudentIdInput = document.getElementById("manualStudentIdInput");
const manualStudentNameInput = document.getElementById("manualStudentNameInput");

// Reports page elements
const sessionSelect = document.getElementById("sessionSelect");
const exportReportBtn = document.getElementById("exportReportBtn");
const reportFormatSelect = document.getElementById("reportFormat");
const summaryChartCtx = document.getElementById("summaryChart").getContext("2d");
let summaryChart = null;

let activeSession = null;
let students = [];
let attendance = [];

// Utility functions
function setStatus(msg, kind = "info") {
  // Could add a status display element if needed
  console.log(`[STATUS] ${kind}: ${msg}`);
}

function fmtDate(dt) {
  if (!dt) return "";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

// Fetch and render functions
async function fetchStudents() {
  try {
    const res = await fetch(`${API_BASE}/students`);
    students = await res.json();
    renderStudents();
    totalStudentsEl.textContent = students.length;
  } catch (e) {
    setStatus("Failed to load students", "error");
  }
}

function renderStudents() {
  const filter = studentSearchInput.value.toLowerCase();
  studentsTableBody.innerHTML = "";
  students.filter(s => s["Student ID"].toLowerCase().includes(filter) || s.Name.toLowerCase().includes(filter))
    .forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s["Student ID"]}</td>
        <td>${s.Name}</td>
        <td>${s.MAC || ""}</td>
      `;
      studentsTableBody.appendChild(tr);
    });
}

studentSearchInput.addEventListener("input", renderStudents);

csvUploadInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const res = await fetch(`${API_BASE}/students/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text }),
    });
    if (res.ok) {
      setStatus("CSV uploaded successfully", "ok");
      await fetchStudents();
    } else {
      const err = await res.json();
      setStatus(`Upload failed: ${err.error}`, "error");
    }
  } catch (err) {
    setStatus("Upload failed", "error");
  }
  csvUploadInput.value = "";
});

addStudentBtn.addEventListener("click", () => {
  studentIdInput.value = "";
  studentNameInput.value = "";
  studentMacInput.value = "";
  addStudentModal.show();
});

addStudentForm.addEventListener("submit", async e => {
  e.preventDefault();
  const newStudent = {
    student_id: studentIdInput.value.trim(),
    name: studentNameInput.value.trim(),
    mac: studentMacInput.value.trim(),
  };
  try {
    const res = await fetch(`${API_BASE}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStudent),
    });
    if (res.ok) {
      setStatus("Student added", "ok");
      addStudentModal.hide();
      await fetchStudents();
    } else {
      const err = await res.json();
      setStatus(`Add student failed: ${err.error}`, "error");
    }
  } catch (err) {
    setStatus("Add student failed", "error");
  }
});

// Session management
async function fetchActiveSession() {
  try {
    const res = await fetch(`${API_BASE}/session`);
    const data = await res.json();
    activeSession = data.active_session || null;
    updateActiveSessionUI();
  } catch {
    activeSession = null;
    updateActiveSessionUI();
  }
}

function updateActiveSessionUI() {
  activeSessionEl.textContent = activeSession ? activeSession.name : "None";
  if (activeSession) {
    sessionNameInput.value = activeSession.name;
  }
}

startSessionBtn.addEventListener("click", async () => {
  const name = sessionNameInput.value.trim();
  try {
    const res = await fetch(`${API_BASE}/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      activeSession = data.active_session;
      updateActiveSessionUI();
      setStatus("Session started", "ok");
      await fetchAttendance();
    } else {
      setStatus("Failed to start session", "error");
    }
  } catch {
    setStatus("Failed to start session", "error");
  }
});

endSessionBtn.addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_BASE}/session/end`, { method: "POST" });
    if (res.ok) {
      activeSession = null;
      updateActiveSessionUI();
      setStatus("Session ended", "warn");
      await fetchAttendance();
    } else {
      setStatus("No active session to end", "warn");
    }
  } catch {
    setStatus("Failed to end session", "error");
  }
});

// Attendance fetching and rendering
async function fetchAttendance() {
  try {
    let url = `${API_BASE}/attendance?limit=500`;
    if (activeSession) {
      url += `&session_id=${encodeURIComponent(activeSession.id)}`;
    }
    const res = await fetch(url);
    attendance = await res.json();
    renderAttendance();
    await fetchSummary();
  } catch {
    setStatus("Failed to load attendance", "error");
  }
}

function renderAttendance() {
  attendanceTableBody.innerHTML = "";
  attendance.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fmtDate(r.ts)}</td>
      <td>${r.student_id}</td>
      <td>${r.name}</td>
      <td>${r.mac || ""}</td>
      <td>${r.session_id || ""}</td>
    `;
    attendanceTableBody.appendChild(tr);
  });
}

// Export attendance
exportBtn.addEventListener("click", () => {
  if (!activeSession) {
    alert("Start a session to export attendance.");
    return;
  }
  const format = exportFormatSelect.value;
  const url = `${API_BASE}/attendance/export?session_id=${encodeURIComponent(activeSession.id)}&format=${format}`;
  window.open(url, "_blank");
});

// Bluetooth scan (simulated)
function isWebBluetoothSupported() {
  return navigator.bluetooth !== undefined;
}

function updateBluetoothUI() {
  const bluetoothSupported = isWebBluetoothSupported();
  const errorMsgId = "bluetoothSupportErrorMsg";
  let errorMsgEl = document.getElementById(errorMsgId);

  if (!bluetoothSupported) {
    if (!errorMsgEl) {
      errorMsgEl = document.createElement("div");
      errorMsgEl.id = errorMsgId;
      errorMsgEl.style.color = "red";
      errorMsgEl.style.marginTop = "10px";
      errorMsgEl.textContent = "Web Bluetooth is not supported on your device or browser. Please use a supported device or browser.";
      startScanBtn.parentNode.insertBefore(errorMsgEl, startScanBtn.nextSibling);
    }
    startScanBtn.disabled = true;
  } else {
    if (errorMsgEl) {
      errorMsgEl.remove();
    }
    startScanBtn.disabled = false;
  }
}

startScanBtn.addEventListener("click", async () => {
  if (!isWebBluetoothSupported()) {
    alert("Web Bluetooth is not supported on your device or browser.");
    return;
  }
  alert("Bluetooth scanning simulation not implemented yet.");
});

// Call updateBluetoothUI on initialization and when attendance page is shown
const originalShowPage = showPage;
showPage = function(page) {
  originalShowPage(page);
  if (page === "attendance") {
    updateBluetoothUI();
  }
};

// Initialization
(async function init() {
  showPage("dashboard");
  await fetchStudents();
  await fetchActiveSession();
  await fetchAttendance();
  await fetchSessions();
  updateBluetoothUI();
})();

// Manual mark attendance modal
manualMarkBtn.addEventListener("click", () => {
  manualStudentIdInput.value = "";
  manualStudentNameInput.value = "";
  manualMarkModal.show();
});

manualMarkForm.addEventListener("submit", async e => {
  e.preventDefault();
  const data = {
    student_id: manualStudentIdInput.value.trim(),
    name: manualStudentNameInput.value.trim(),
  };
  try {
    const res = await fetch(`${API_BASE}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setStatus("Attendance marked manually", "ok");
      manualMarkModal.hide();
      await fetchAttendance();
    } else {
      const err = await res.json();
      setStatus(`Failed to mark attendance: ${err.error}`, "error");
    }
  } catch {
    setStatus("Failed to mark attendance", "error");
  }
});

// Reports page
async function fetchSessions() {
  try {
    const res = await fetch(`${API_BASE}/sessions`);
    const sessions = await res.json();
    sessionSelect.innerHTML = "";
    sessions.forEach(s => {
      const option = document.createElement("option");
      option.value = s.id;
      option.textContent = s.name;
      sessionSelect.appendChild(option);
    });
  } catch {
    setStatus("Failed to load sessions", "error");
  }
}

exportReportBtn.addEventListener("click", () => {
  const sessionId = sessionSelect.value;
  const format = reportFormatSelect.value;
  if (!sessionId) {
    alert("Select a session to export report.");
    return;
  }
  const url = `${API_BASE}/attendance/export?session_id=${encodeURIComponent(sessionId)}&format=${format}`;
  window.open(url, "_blank");
});

async function fetchSummary() {
  try {
    let url = `${API_BASE}/reports/summary`;
    if (activeSession) {
      url += `?session_id=${encodeURIComponent(activeSession.id)}`;
    } else {
      const today = new Date().toISOString().slice(0, 10);
      url += `?date=${today}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    updateDashboardSummary(data);
    updateSummaryChart(data);
  } catch {
    setStatus("Failed to load summary", "error");
  }
}

function updateDashboardSummary(data) {
  todaysAttendanceEl.textContent = `Present: ${data.present}, Absent: ${data.absent}`;
}

function updateSummaryChart(data) {
  if (summaryChart) {
    summaryChart.destroy();
  }
  summaryChart = new Chart(summaryChartCtx, {
    type: "doughnut",
    data: {
      labels: ["Present", "Absent"],
      datasets: [{
        data: [data.present, data.absent],
        backgroundColor: ["#198754", "#dc3545"],
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

// Initialization
(async function init() {
  showPage("dashboard");
  await fetchStudents();
  await fetchActiveSession();
  await fetchAttendance();
  await fetchSessions();
})();
