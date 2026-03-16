import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Register from "./register";
import StudentStaff from "./StudentStaffDashboard";
import AdminDashboard from "./AdminDashboard";
import WorkerDashboard from "./WorkerDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/student"  element={<StudentStaff role="STUDENT" />} />
        <Route path="/teacher"  element={<StudentStaff role="STAFF" />} />
        <Route path="/staff"    element={<StudentStaff role="STAFF" />} />
        <Route path="/admin"    element={<AdminDashboard />} />
        <Route path="/worker"   element={<WorkerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
