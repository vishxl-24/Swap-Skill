import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import Home from "./pages/Home";
import SearchFreelancers from "./components/SearchFreelancers";
import Profile from "./pages/Profile";
import WorkHistory from "./pages/WorkHistory";
import MyClients from "./pages/MyClients";
import FreelancerProfile from "./components/FreelancerProfile";
import ChatWindow from "./components/Chat/ChatWindow";

const App = () => {
  return (
    
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<SearchFreelancers />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/workhistory" element={<WorkHistory />} />
        <Route path="/my-clients" element={<MyClients />} />
        <Route path="/freelancer/:id" element={<FreelancerProfile />} />
        <Route path="/chat" element={<ChatWindow />} />
      </Routes>
    
  );
};

export default App;