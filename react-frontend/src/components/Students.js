import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', student_id: '', mac: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    setFilteredStudents(
      students.filter(student =>
        student.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student['Student ID'].toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [students, searchTerm]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/students`);
      setStudents(res.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleAddStudent = async () => {
    try {
      await axios.post(`${API_BASE}/api/students`, newStudent);
      setNewStudent({ name: '', student_id: '', mac: '' });
      setShowModal(false);
      fetchStudents();
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          await axios.post(`${API_BASE}/api/students/upload`, { csv: e.target.result });
          fetchStudents();
        } catch (error) {
          console.error('Error uploading CSV:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div>
      <h1>Students</h1>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by name or student ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <button className="btn btn-primary me-2" onClick={() => setShowModal(true)}>Add Student</button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button className="btn btn-secondary" onClick={() => fileInputRef.current.click()}>Upload CSV</button>
      </div>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Name</th>
            <th>Student ID</th>
            <th>MAC</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((student, index) => (
            <tr key={index}>
              <td>{student.Name}</td>
              <td>{student['Student ID']}</td>
              <td>{student.MAC}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Student Modal */}
      <div className={`modal ${showModal ? 'show' : ''}`} style={{ display: showModal ? 'block' : 'none' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Student</h5>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Student ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={newStudent.student_id}
                  onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">MAC (optional)</label>
                <input
                  type="text"
                  className="form-control"
                  value={newStudent.mac}
                  onChange={(e) => setNewStudent({ ...newStudent, mac: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleAddStudent}>Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Students;
