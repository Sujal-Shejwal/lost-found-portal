import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "./firebase";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LostItems from "./pages/LostItems";
import FoundItems from "./pages/FoundItems";
import Layout from "./components/Layout";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return null; // or loader

  return (
    <BrowserRouter>
      <Routes>
        {/* ✅ LOGIN PAGE */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" /> : <Login />}
        />

        {/* ✅ PROTECTED ROUTES */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/lost"
          element={
            user ? (
              <Layout>
                <LostItems />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/found"
          element={
            user ? (
              <Layout>
                <FoundItems />
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
