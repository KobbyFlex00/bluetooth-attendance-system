# TODO List for Converting Frontend to React.js

## Setup React App
- [x] Create new React app in "react-frontend" directory using npx create-react-app
- [x] Install dependencies: react-router-dom, bootstrap, chart.js, axios
- [x] Copy web/css/styles.css to react-frontend/src/

## Convert Components
- [x] Create App.js: BrowserRouter with Routes for Dashboard, Students, Attendance, Reports
- [x] Create Navbar component: Nav tabs with Link
- [x] Create Dashboard component: Summary cards (total students, today's attendance, active session)
- [x] Create Students component: Table, CSV upload, search, add student modal
- [x] Create Attendance component: Session controls, attendance table, Bluetooth scan, manual mark modal
- [x] Create Reports component: Session select, summary chart, export buttons
- [x] Convert app.js logic to React hooks: useState for state, useEffect for API calls, fetch or axios

## Integrate and Test
- [x] Import Bootstrap CSS and JS in index.html
- [x] Handle modals with Bootstrap or React Bootstrap
- [x] Update API_BASE to local backend
- [ ] Run npm start, test routing and UI
- [ ] Ensure UI matches original HTML
- [ ] Test API integration with backend
