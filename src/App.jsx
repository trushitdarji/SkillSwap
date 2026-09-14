import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import Dashboard from "./Pages/Dashboard";
import Profile from "./Pages/Profile";
import Browse from "./Pages/Browse";
import SwapRequests from "./Pages/SwapRequests";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/swap-requests" element={<SwapRequests />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
