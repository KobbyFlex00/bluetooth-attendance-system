import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const Attendance = () => {
  const [sessionName, setSessionName] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState('session');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStudent, setManualStudent] = useState({ student_id: '', name: '' });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchActiveSession();
    fetchAttendance();
  }, [scope]);

  const fetchActiveSession = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/session`);
      setActiveSession(res.data.active_session);
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      let url = `${API_BASE}/api/attendance?limit=500`;
      if (scope === 'session' && activeSession) {
        url += `&session_id=${activeSession.id}`;
      } else if (scope === 'today') {
        const today = new Date().toISOString().slice(0, 10);
        url += `&date_from=${today}&date_to=${today}`;
      }
      const res = await axios.get(url);
      setAttendance(res.data);
      setStatus(`Loaded ${res.data.length} attendance rows.`);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setStatus('Failed to load attendance.');
    }
  };

  const startSession = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/session/start`, { name: sessionName });
      setActiveSession(res.data.active_session);
      setSessionName('');
      fetchAttendance();
      setStatus('Session started.');
    } catch (error) {
      console.error('Error starting session:', error);
      setStatus('Failed to start session.');
    }
  };

  const endSession = async () => {
    try {
      await axios.post(`${API_BASE}/api/session/end`);
      setActiveSession(null);
      fetchAttendance();
      setStatus('Session ended.');
    } catch (error) {
      console.error('Error ending session:', error);
      setStatus('Failed to end session.');
    }
  };

  const startBluetoothScan = async () => {
    if (!navigator.bluetooth) {
      setStatus('Web Bluetooth is not supported in this browser.');
      return;
    }

    try {
      setStatus('Requesting Bluetooth device...');
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: []
      });

      const macOrId = device.id || '';
      const name = device.name || '';

      setStatus(`Scanned: ${name || '(no name)'} | ${macOrId || '(no id)'}`);

      const payload = macOrId ? { mac_address: macOrId } : { name: name };
      const res = await axios.post(`${API_BASE}/api/validate`, payload);

      if (res.data.logged) {
        const scopeNote = res.data.scope === 'session' ? ' (session)' : ' (day)';
        setStatus(`VALID & LOGGED: ${res.data.student.Name} at ${res.data.timestamp}${scopeNote}`);
      } else {
        const reason = res.data.reason === 'already_logged_in_session'
          ? 'already logged for this session'
          : 'already logged today';
        setStatus(`VALID (duplicate): ${res.data.student.Name} — ${reason}`);
      }
      fetchAttendance();
    } catch (err) {
      console.error(err);
      setStatus('Bluetooth scan failed or was cancelled.');
    }
  };

  const exportCsv = () => {
    let url = `${API_BASE}/api/attendance/export?format=csv`;
    if (scope === 'session' && activeSession) {
      url += `&session_id=${activeSession.id}`;
    } else if (scope === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      url += `&date_from=${today}&date_to=${today}`;
    }
    window.open(url, '_blank');
  };

  const handleManualMark = async () => {
    try {
      await axios.post(`${API_BASE}/api/attendance`, manualStudent);
      setManualStudent({ student_id: '', name: '' });
      setShowManualModal(false);
      fetchAttendance();
      setStatus('Manual attendance logged.');
    } catch (error) {
      console.error('Error logging manual attendance:', error);
      setStatus('Failed to log manual attendance.');
    }
  };

  return (
    <div>
      <h1>Attendance</h1>
      <div className="mb-3">
        <div className="row">
          <div className="col-md-6">
            <input
              type="text"
              className="form-control"
              placeholder="Session name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <button className="btn btn-success me-2" onClick={startSession}>Start Session</button>
            <button className="btn btn-danger" onClick={endSession}>End Session</button>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <span className="badge bg-info">{activeSession ? `Active: ${activeSession.name}` : 'No active session'}</span>
      </div>
      <div className="mb-3">
        <button className="btn btn-primary me-2" onClick={startBluetoothScan}>Start Bluetooth Scan</button>
        <button className="btn btn-secondary me-2" onClick={fetchAttendance}>Refresh Attendance</button>
        <button className="btn btn-info me-2" onClick={exportCsv}>Export CSV</button>
        <button className="btn btn-warning" onClick={() => setShowManualModal(true)}>Manual Mark Attendance</button>
      </div>
      <div className="mb-3">
        <label className="form-label">Show:</label>
        <select className="form-select" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="session">Current session</option>
          <option value="today">Today</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="mb-3">
        <p className="text-muted">{status}</p>
      </div>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Student ID</th>
            <th>Name</th>
            <th>MAC</th>
            <th>Session</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((row, index) => (
            <tr key={index}>
              <td>{new Date(row.ts).toLocaleString()}</td>
              <td>{row.student_id}</td>
              <td>{row.name}</td>
              <td>{row.mac}</td>
              <td>{row.session_id || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Manual Mark Modal */}
      <div className={`modal ${showManualModal ? 'show' : ''}`} style={{ display: showManualModal ? 'block' : 'none' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Manual Attendance</h5>
              <button type="button" className="btn-close" onClick={() => setShowManualModal(false)}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Student ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={manualStudent.student_id}
                  onChange={(e) => setManualStudent({ ...manualStudent, student_id: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={manualStudent.name}
                  onChange={(e) => setManualStudent({ ...manualStudent, name: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowManualModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleManualMark}>Mark</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
