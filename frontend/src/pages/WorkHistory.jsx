import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaComments } from "react-icons/fa";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

const WorkHistory = () => {
  const [pendingWorks, setPendingWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const navigate = useNavigate();

  const fetchWorkHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view work history");
        setLoading(false);
        return;
      }

      const response = await api.get("/api/auth/workhistory", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const freelancerPending = response.data.asFreelancer
        .filter((work) => work.status === "Pending")
        .map((work) => ({
          ...work,
          role: "freelancer",
        }));

      const clientPending = response.data.asClient
        .filter((work) => work.status === "Pending")
        .map((work) => ({
          ...work,
          role: "client",
          _id: null,
          clientId: null,
        }));

      const combinedPending = [...freelancerPending, ...clientPending].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setPendingWorks(combinedPending);
    } catch (err) {
      console.error("Failed to fetch work history:", err);
      setError(err.response?.data?.message || "Failed to load work history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkHistory();
    const interval = setInterval(fetchWorkHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (workId, status, retryCount = 0) => {
    try {
      if (!workId || !/^[0-9a-fA-F]{24}$/.test(workId)) {
        throw new Error("Invalid work ID");
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      await api.patch(
        `/api/auth/work/${workId}/status`,
        { status },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPendingWorks((prev) => prev.filter((work) => work._id !== workId));
      fetchWorkHistory();
      setUpdateError("");
      alert(`Work marked as ${status}`);
    } catch (err) {
      console.error("Status update failed:", err);
      const errorMessage = err.response?.data?.message || `Failed to update status: ${err.message}`;
      setUpdateError(errorMessage);

      if (errorMessage.includes("buffering timed out") && retryCount < 2) {
        setTimeout(() => handleStatusUpdate(workId, status, retryCount + 1), 2000);
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleChat = (hirerId) => {
    if (hirerId) {
      navigate(`/chat?hirerId=${hirerId}`);
    }
  };

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h3 style={styles.error}>❌ {error}</h3>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.waveOverlay} className="wave-overlay"></div>
      <div style={styles.particleOverlay} className="particle-overlay"></div>
      <style>{`
        .wave-overlay {
          background: linear-gradient(to bottom, rgba(20, 45, 60, 0.4), rgba(74, 114, 150, 0.2));
          background-size: cover;
          background-position: center;
        }
        .particle-overlay {
          background: radial-gradient(circle at 10% 90%, rgba(0, 207, 255, 0.2) 2px, transparent 2px),
                      radial-gradient(circle at 90% 20%, rgba(0, 207, 255, 0.2) 2px, transparent 2px),
                      radial-gradient(circle at 50% 50%, rgba(0, 207, 255, 0.15) 3px, transparent 3px);
        }
        .work-card {
          animation: fadeIn 0.8s ease-in-out;
        }
        @keyframes wave {
          0% { background-position: center bottom, center top; }
          50% { background-position: center top, center bottom; }
          100% { background-position: center bottom, center top; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          borderRadius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: width 0.3s, height 0.3s, opacity 0.3s;
        }
        button:hover::after {
          width: 200px;
          height: 200px;
          opacity: 1;
        }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
        }
      `}</style>

      <h2 style={styles.title}>Work History</h2>
      {updateError && <p style={styles.error}>{updateError}</p>}

      <h3 style={styles.sectionTitle}>Find Work (Pending)</h3>
      {pendingWorks.length > 0 ? (
        pendingWorks.map((item, index) => (
          <div
            key={`${item.role}-${item._id || index}`}
            style={{ ...styles.card, animationDelay: `${index * 0.1}s` }}
            className="work-card"
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.02) translateY(-5px)";
              e.target.style.boxShadow = "0 6px 15px rgba(0, 207, 255, 0.3)";
              e.target.style.border = "1px solid rgba(0, 207, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 2px 5px rgba(0, 207, 255, 0.2)";
              e.target.style.border = "1px solid rgba(0, 207, 255, 0.2)";
            }}
          >
            <h4 style={styles.project}>{item.project}</h4>
            <p style={styles.info}>
              <strong>{item.role === "freelancer" ? "Client" : "Freelancer"}:</strong> {item.client}
            </p>
            <p style={styles.info}><strong>Date:</strong> {new Date(item.date).toLocaleDateString()}</p>
            <p style={{ ...styles.info, color: "#ffa726" }}>
              <strong>Status:</strong> {item.status}
            </p>
            <p style={styles.info}>
              <strong>Role:</strong> {item.role === "freelancer" ? "Freelancer" : "Client"}
            </p>
            {item.role === "freelancer" && (
              <div style={styles.buttonGroup}>
                <button
                  onClick={() => handleChat(item.clientId)}
                  style={styles.actionButton}
                  disabled={!item.clientId}
                  onMouseEnter={(e) => {
                    if (!item.clientId) return;
                    e.target.style.transform = "scale(1.05)";
                    e.target.style.boxShadow = "0 6px 15px rgba(0, 207, 255, 0.4)";
                    e.target.style.backgroundColor = "#4dd0e1";
                  }}
                  onMouseLeave={(e) => {
                    if (!item.clientId) return;
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = "0 2px 5px rgba(0, 207, 255, 0.2)";
                    e.target.style.backgroundColor = "#00cfff";
                  }}
                >
                  <FaComments style={{ marginRight: 8 }} /> Chat
                </button>
                <button
                  onClick={() => handleStatusUpdate(item._id, "Denied")}
                  style={styles.denyButton}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "scale(1.05)";
                    e.target.style.boxShadow = "0 6px 15px rgba(255, 77, 79, 0.4)";
                    e.target.style.backgroundColor = "#ff7875";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = "0 2px 5px rgba(255, 77, 79, 0.2)";
                    e.target.style.backgroundColor = "#ff4d4f";
                  }}
                >
                  Deny
                </button>
                <button
                  onClick={() => handleStatusUpdate(item._id, "Completed")}
                  style={styles.completeButton}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "scale(1.05)";
                    e.target.style.boxShadow = "0 6px 15px rgba(40, 167, 69, 0.4)";
                    e.target.style.backgroundColor = "#34c759";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = "0 2px 5px rgba(40, 167, 69, 0.2)";
                    e.target.style.backgroundColor = "#28a745";
                  }}
                >
                  Mark Complete
                </button>
              </div>
            )}
          </div>
        ))
      ) : (
        <p style={styles.noContent}>No pending work found.</p>
      )}

      <h3 style={styles.sectionTitle}>My Clients</h3>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Inter', sans-serif",
    background: "linear-gradient(135deg, #1e3a5f 0%, #4a7296 50%, #6a9bc3 100%)",
    minHeight: "100vh",
    padding: "40px",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  waveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundImage: `
      url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDU2MCI+PHBhdGggZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBmaWxsLW9wYWNpdHk9IjAuNCIgZD0iTTAsMTkyTDQ4LDE3NiBDOTYsMTYwLDE5MiwxMjgsMjg4LDE0NCBDMzg0LDE2MCw0ODAsMjA4LDU3NiwyMTYgQzY3MiwyMjQsNzY4LDE5Miw4NjQsMTY4IEM5NjAsMTQ0LDEwNTYsMTI4LDExNTIsMTQ0IEMxMjQ4LDE2MCwxMzQ0LDE5MiwxMzkyLDIwOCBMMTQ0MCwyMjQgVjU2MCBIMTAgQzQ8MCwyNTYsOTYwLDE5MiwxNDQwLDE5MiBaIj48L3BhdGggPjwvc3ZnPg=='),
      url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDU2MCI+PHBhdGggZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjE1KSIgZmlsbC1vcGFjaXR5PSIwLjMiIGQ9Ik0wLDMyMEw0OCwzMDQgQzk2LDI4OCwxOTIsMjU2LDI4OCwyNzIgQzM4NCwyODgsNDgwLDMzNiw1NzYsMzQ0IEM6NzIsMzUyLDc2OCwzMjAsODY0LDI5NiBDOTYwLDI3MiwxMDX6LDI1NiwxMTUyLDI3MiBDMTI0OCwyODgsMTM0NCwzMjAsMTM5MiwzMzYgTDE0NDAsMzUyIFY1NjAgSDE0NDAgQzQ8MCwzODQsOTYwLDMyMCwxNDQwLDMyMCZaIj48L3BhdGggPjwvc3ZnPg==')
    `,
    backgroundSize: "cover, cover",
    backgroundPosition: "center bottom, center top",
    backgroundRepeat: "no-repeat, no-repeat",
    zIndex: 1,
  },
  particleOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 2,
    pointerEvents: "none",
  },
  title: {
    fontSize: "2rem",
    color: "#fff",
    marginBottom: "30px",
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
    fontWeight: 600,
    textAlign: "center",
    zIndex: 3,
    position: "relative",
  },
  sectionTitle: {
    fontSize: "1.6rem",
    color: "#fff",
    margin: "30px 0 15px",
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
    fontWeight: 600,
    zIndex: 3,
    position: "relative",
  },
  card: {
    border: "1px solid rgba(0, 207, 255, 0.2)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "15px",
    background: "rgba(20, 45, 60, 0.85)",
    boxShadow: "0 2px 5px rgba(0, 207, 255, 0.2)",
    backdropFilter: "blur(10px)",
    transition: "transform 0.2s, box-shadow 0.3s, border 0.3s",
    zIndex: 3,
    position: "relative",
    maxWidth: "800px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  project: {
    margin: "0 0 10px 0",
    color: "#fff",
    fontSize: "1.4rem",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  info: {
    fontSize: "1rem",
    margin: "8px 0",
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  error: {
    color: "#ff4d4f",
    textAlign: "center",
    textShadow: "0 0 5px rgba(255, 107, 107, 0.3)",
    zIndex: 3,
    position: "relative",
  },
  buttonGroup: {
    display: "flex",
    gap: "15px",
    marginTop: 15,
    justifyContent: "center",
  },
  actionButton: {
    padding: "10px 20px",
    backgroundColor: "#00cfff",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "1rem",
    fontWeight: "600",
    transition: "transform 0.2s, box-shadow 0.3s, background-color 0.3s",
    boxShadow: "0 2px 5px rgba(0, 207, 255, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  denyButton: {
    padding: "10px 20px",
    backgroundColor: "#ff4d4f",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    transition: "transform 0.2s, box-shadow 0.3s, background-color 0.3s",
    boxShadow: "0 2px 5px rgba(255, 77, 79, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  completeButton: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    transition: "transform 0.2s, box-shadow 0.3s, background-color 0.3s",
    boxShadow: "0 2px 5px rgba(40, 167, 69, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  noContent: {
    fontSize: "1rem",
    color: "#d0e1e9",
    textAlign: "center",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
    zIndex: 3,
    position: "relative",
  },
};

export default WorkHistory;