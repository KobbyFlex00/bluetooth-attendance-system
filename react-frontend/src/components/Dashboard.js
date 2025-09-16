import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const Dashboard = () => {
  const [totalStudents, setTotalStudents] = useState(0);
  const [todaysAttendance, setTodaysAttendance] = useState({ present: 0, absent: 0, total_students: 0 });
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, summaryRes, sessionRes] = await Promise.all([
        axios.get(`${API_BASE}/api/students`),
        axios.get(`${API_BASE}/api/reports/summary?date=${new Date().toISOString().split('T')[0]}`),
        axios.get(`${API_BASE}/api/session`)
      ]);
      setTotalStudents(studentsRes.data.length);
      setTodaysAttendance(summaryRes.data);
      setActiveSession(sessionRes.data.active_session);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="row">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total Students</h5>
              <p className="card-text display-4">{totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Today's Present</h5>
              <p className="card-text display-4 text-success">{todaysAttendance.present}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Today's Absent</h5>
              <p className="card-text display-4 text-danger">{todaysAttendance.absent}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h3>Active Session</h3>
        {activeSession ? (
          <div className="alert alert-info">
            <strong>{activeSession.name}</strong> started at {new Date(activeSession.start_ts).toLocaleString()}
          </div>
        ) : (
          <div className="alert alert-warning">No active session</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
