import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE = 'http://localhost:5000';

const Reports = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [summary, setSummary] = useState({ present: 0, absent: 0, total_students: 0 });
  const chartRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedSession) {
      fetchSummary();
    }
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sessions`);
      setSessions(res.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/reports/summary?session_id=${selectedSession}`);
      setSummary(res.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const exportPdf = () => {
    const url = `${API_BASE}/api/attendance/export?format=pdf&session_id=${selectedSession}`;
    window.open(url, '_blank');
  };

  const exportExcel = () => {
    const url = `${API_BASE}/api/attendance/export?format=xlsx&session_id=${selectedSession}`;
    window.open(url, '_blank');
  };

  const chartData = {
    labels: ['Present', 'Absent'],
    datasets: [
      {
        data: [summary.present, summary.absent],
        backgroundColor: ['#28a745', '#dc3545'],
        hoverBackgroundColor: ['#218838', '#c82333'],
      },
    ],
  };

  return (
    <div>
      <h1>Reports</h1>
      <div className="mb-3">
        <label className="form-label">Select Session</label>
        <select
          className="form-select"
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
        >
          <option value="">Choose a session</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.name} ({new Date(session.start_ts).toLocaleString()} - {session.end_ts ? new Date(session.end_ts).toLocaleString() : 'Ongoing'})
            </option>
          ))}
        </select>
      </div>
      {selectedSession && (
        <div>
          <div className="mb-3">
            <button className="btn btn-primary me-2" onClick={exportPdf}>Export PDF</button>
            <button className="btn btn-success" onClick={exportExcel}>Export Excel</button>
          </div>
          <div className="row">
            <div className="col-md-6">
              <h3>Summary</h3>
              <p>Total Students: {summary.total_students}</p>
              <p>Present: {summary.present}</p>
              <p>Absent: {summary.absent}</p>
            </div>
            <div className="col-md-6">
              <Pie data={chartData} ref={chartRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
