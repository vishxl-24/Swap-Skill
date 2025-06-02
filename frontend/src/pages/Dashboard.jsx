import React, { useState, useEffect } from "react";
import {
  FaStar,
  FaBriefcase,
  FaPaperPlane,
  FaUsers,
  FaComments,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";

const socket = io("http://localhost:5000", {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    skills: [],
    bio: "",
  });
  const [unreadUsersCount, setUnreadUsersCount] = useState(0);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view your dashboard");
        setLoading(false);
        return null;
      }

      const response = await axios.get("http://localhost:5000/api/auth/user", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data) {
        throw new Error("No user data returned from API");
      }

      const sortedClientWorks = Array.isArray(response.data.clientWorks)
        ? response.data.clientWorks
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3)
        : [];

      const userData = {
        ...response.data,
        clientWorks: sortedClientWorks,
        points: response.data.points ?? 0,
        rating: response.data.rating ?? 0,
        reviews: response.data.reviews ?? 0,
      };

      setUser(userData);
      setEditForm({
        name: response.data.name || "",
        skills: response.data.hires?.[0]?.skills || [],
        bio: response.data.hires?.[0]?.profile?.bio || "",
      });
      setError("");
      return userData;
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setError(err.response?.data?.message || "Failed to load dashboard");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadUsersCount = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/auth/chat/unread-users", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setUnreadUsersCount(response.data.unreadUsersCount);
    } catch (err) {
      console.error("Failed to fetch unread users count:", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to view your dashboard");
      navigate("/login");
      setLoading(false);
      return;
    }

    const initialize = async () => {
      const userData = await fetchUserData();
      if (!userData) {
        if (error.includes("Invalid token") || error.includes("Unauthorized")) {
          setError("Session expired. Please log in again.");
          localStorage.removeItem("token");
          navigate("/login");
        }
        return;
      }

      fetchUnreadUsersCount();

      const id = userData.id || userData._id;
      if (!id) {
        setError("User ID not found. Please try again.");
        return;
      }

      socket.auth = { userId: id };
      socket.connect();
      socket.emit("join", id);
      console.log("Socket connected, joined room:", id);

      socket.on("receiveMessage", (message) => {
        if (message.senderId._id === id) return;
        if (message.receiverId === id && !message.isRead) {
          setUnreadUsersCount((prev) => prev + 1);
          setTimeout(fetchUnreadUsersCount, 1000);
        }
      });

      socket.on("updateUnread", ({ senderId, unreadCount }) => {
        setUnreadUsersCount(unreadCount);
        fetchUnreadUsersCount();
      });
    };

    initialize();

    // Set intervals to fetch data every 1 second
    const userDataInterval = setInterval(fetchUserData, 1000);
    const unreadCountInterval = setInterval(fetchUnreadUsersCount, 1000);

    return () => {
      clearInterval(userDataInterval);
      clearInterval(unreadCountInterval);
      socket.off("receiveMessage");
      socket.off("updateUnread");
      socket.disconnect();
    };
  }, [navigate]);

  const handleAction = (label) => {
    switch (label) {
      case "Hire Freelancer":
        navigate("/search");
        break;
      case "My Clients":
        navigate("/my-clients");
        break;
      case "Chat":
        navigate("/chat");
        break;
      case "Find Work":
        navigate("/workhistory");
        break;
      default:
        break;
    }
  };

  const handleChat = (freelancerId) => {
    navigate(`/chat?freelancerId=${freelancerId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to edit your profile");
        return;
      }

      const response = await axios.put(
        "http://localhost:5000/api/auth/profile",
        {
          name: editForm.name,
          skills: editForm.skills,
          bio: editForm.bio,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUser({
        ...user,
        name: response.data.user.name,
        hires: [
          {
            ...user.hires[0],
            skills: response.data.user.skills,
            profile: response.data.user.profile,
          },
        ],
      });
      setIsEditModalOpen(false);
      alert("Profile updated successfully");
      fetchUserData();
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert(err.response?.data?.message || "Failed to update profile");
    }
  };

  const handleSkillChange = (e) => {
    const skillsInput = e.target.value;
    setEditForm({
      ...editForm,
      skills: skillsInput.split(",").map((s) => s.trim()).filter((s) => s),
    });
  };

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

  if (error || !user) {
    return (
      <div style={styles.container}>
        <h3 style={styles.error}>❌ {error || "Failed to load user data"}</h3>
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
        input:focus, textarea:focus {
          border: 1px solid #00cfff !important;
          box-shadow: 0 0 10px rgba(0, 207, 255, 0.5) !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
        }
        ::-webkit-scrollbar-thumb {
          background: #00cfff;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #4dd0e1;
        }
      `}</style>

      <div style={styles.header}>
        <div>
          <h2 style={styles.greeting}>Welcome back, {user.name} 👋</h2>
          <p style={styles.subtext}>Role: {user.role} | Field: {user.field}</p>
        </div>
        <div style={styles.headerButtons}>
          <button
            style={styles.profileButton}
            onClick={() => navigate("/profile")}
            title="Edit Profile"
            onMouseEnter={(e) => {
              e.target.style.boxShadow = "0 6px 15px rgba(0, 207, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = "none";
            }}
          >
            <FaUserCircle style={styles.profileIcon} />
          </button>
          <button
            onClick={handleLogout}
            style={styles.logoutButton}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = "0 6px 15px rgba(255, 77, 79, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = "none";
            }}
          >
            <FaSignOutAlt style={{ marginRight: 8 }} /> Logout
          </button>
        </div>
      </div>

      <div style={styles.statsCard}>
        <div style={styles.statBox}>
          <span style={styles.statValue}>{user.points}</span>
          <p style={styles.statLabel}>Points</p>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statValue}>
            <FaStar style={{ color: "#FFD700", marginRight: 4 }} />
            {user.rating.toFixed(1)}
          </span>
          <p style={styles.statLabel}>Rating</p>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statValue}>{user.reviews}</span>
          <p style={styles.statLabel}>Reviews</p>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Quick Actions</h3>
      <div style={styles.actionsGrid}>
        <ActionButton icon={<FaPaperPlane />} label="Hire Freelancer" onClick={handleAction} />
        <ActionButton icon={<FaBriefcase />} label="Find Work" onClick={handleAction} />
        <ActionButton icon={<FaUsers />} label="My Clients" onClick={handleAction} />
        <div
          style={styles.actionButton}
          onClick={() => handleAction("Chat")}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = "0 8px 20px rgba(0, 207, 255, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = "0 4px 10px rgba(0, 207, 255, 0.2)";
          }}
        >
          <div style={styles.actionIcon}>
            <FaComments />
            {unreadUsersCount > 0 && (
              <span style={styles.unreadBadge}>{unreadUsersCount}</span>
            )}
          </div>
          <p style={styles.actionText}>Chat</p>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Your Recent Hires (Last 3)</h3>
      {user.clientWorks.length > 0 ? (
        <div style={styles.hireList}>
          {user.clientWorks.map((work, index) => (
            <div
              key={index}
              style={styles.hireCard}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = "0 8px 20px rgba(0, 207, 255, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = "0 4px 10px rgba(0, 207, 255, 0.2)";
              }}
            >
              <p style={{ fontWeight: "bold", color: "#fff" }}>{work.freelancerName || "Unknown Freelancer"}</p>
              <p style={{ fontSize: 12, color: "#d0e1e9" }}>Work Title: {work.project}</p>
              <p
                style={{
                  fontSize: 12,
                  color:
                    work.status === "Completed"
                      ? "#00ff00"
                      : work.status === "Denied"
                      ? "#ff4d4f"
                      : "#ffaa00",
                }}
              >
                Status: {work.status}
              </p>
              <button
                onClick={() => handleChat(work.freelancerId)}
                style={styles.chatButton}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = "0 6px 15px rgba(0, 207, 255, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = "none";
                }}
              >
                <FaComments style={{ marginRight: 8 }} /> Chat
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontStyle: "italic", color: "#d0e1e9", marginBottom: 20 }}>
          No recent hires yet.
        </p>
      )}

      <div
        style={styles.communityCard}
        onMouseEnter={(e) => {
          e.target.style.boxShadow = "0 8px 20px rgba(0, 207, 255, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.target.style.boxShadow = "0 4px 10px rgba(0, 207, 255, 0.2)";
        }}
      >
        <FaUsers style={styles.communityIcon} />
        <div>
          <p style={styles.communityText}>Join the Skill Swap Community</p>
          <a
            href="/community"
            style={styles.communityLink}
            onMouseEnter={(e) => {
              e.target.style.color = "#4dd0e1";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "#00cfff";
            }}
          >
            Explore →
          </a>
        </div>
      </div>

      {isEditModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>Edit Profile</h3>
            <form onSubmit={handleEditProfile}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Skills (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.skills.join(", ")}
                  onChange={handleSkillChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  style={styles.textarea}
                />
              </div>
              <div style={styles.modalActions}>
                <button
                  type="submit"
                  style={styles.saveButton}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = "0 6px 15px rgba(0, 207, 255, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = "none";
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setIsEditModalOpen(false)}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = "0 6px 15px rgba(255, 77, 79, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = "none";
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton = ({ icon, label, onClick }) => (
  <div
    style={styles.actionButton}
    onClick={() => onClick(label)}
    onMouseEnter={(e) => {
      e.target.style.boxShadow = "0 8px 20px rgba(0, 207, 255, 0.4)";
      e.target.querySelector("svg").style.textShadow = "0 0 15px rgba(0, 207, 255, 0.6)";
    }}
    onMouseLeave={(e) => {
      e.target.style.boxShadow = "0 4px 10px rgba(0, 207, 255, 0.2)";
      e.target.querySelector("svg").style.textShadow = "0 0 5px rgba(0, 207, 255, 0.3)";
    }}
  >
    <div style={styles.actionIcon}>{icon}</div>
    <p style={styles.actionText}>{label}</p>
  </div>
);

const styles = {
  container: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
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
  header: {
    marginBottom: 30,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 3,
    position: "relative",
  },
  greeting: {
    fontSize: "2.2rem",
    margin: 0,
    color: "#fff",
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
    fontWeight: 700,
  },
  subtext: {
    fontSize: "1rem",
    marginTop: 4,
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.3)",
  },
  headerButtons: {
    display: "flex",
    gap: "15px",
  },
  profileButton: {
    background: "rgba(255, 255, 255, 0.15)",
    border: "none",
    cursor: "pointer",
    padding: "10px",
    borderRadius: "50%",
    transition: "box-shadow 0.3s",
  },
  profileIcon: {
    fontSize: "2rem",
    color: "#00cfff",
  },
  logoutButton: {
    padding: "10px 20px",
    backgroundColor: "#ff4d4f",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "box-shadow 0.3s",
    fontWeight: "600",
  },
  statsCard: {
    display: "flex",
    justifyContent: "center",
    gap: "14px", // Increased gap
    background: "rgba(20, 45, 60, 0.85)",
    padding: "12px", // Increased padding
    borderRadius: "14px", // Increased border radius
    boxShadow: "0 8px 20px rgba(0, 207, 255, 0.2)",
    marginBottom: 30,
    zIndex: 3,
    position: "relative",
    backdropFilter: "blur(10px)",
    maxWidth: "330px", // Increased maxWidth
    marginLeft: "auto", // Center the container
    marginRight: "auto", // Center the container
  },
  statBox: {
    textAlign: "center",
    width: "90px", // Increased width
    padding: "10px", // Increased padding
  },
  statValue: {
    fontSize: "1.3rem", // Increased font size
    fontWeight: "bold",
    color: "#00cfff",
    textShadow: "0 0 10px rgba(0, 207, 255, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: "0.85rem", // Increased font size
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  sectionTitle: {
    fontSize: "1.6rem",
    marginBottom: 20,
    color: "#fff",
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
    zIndex: 3,
    position: "relative",
    fontWeight: 600,
  },
  actionsGrid: {
    display: "flex",
    justifyContent: "center",
    gap: 20,
    marginBottom: 30,
    zIndex: 3,
    position: "relative",
    flexWrap: "wrap",
  },
  actionButton: {
    background: "linear-gradient(135deg, rgba(20, 45, 60, 0.85), rgba(74, 114, 150, 0.75))",
    borderRadius: 14,
    padding: "25px",
    textAlign: "center",
    boxShadow: "0 4px 10px rgba(0, 207, 255, 0.2)",
    transition: "box-shadow 0.3s",
    cursor: "pointer",
    backdropFilter: "blur(5px)",
    position: "relative",
    overflow: "hidden",
    minWidth: "150px",
  },
  actionIcon: {
    fontSize: 32,
    color: "#00cfff",
    marginBottom: 12,
    position: "relative",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.3)",
    transition: "text-shadow 0.3s",
  },
  actionText: {
    fontSize: 16,
    fontWeight: 500,
    color: "#fff",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  hireList: {
    display: "flex",
    flexDirection: "row",
    gap: 15,
    marginBottom: 30,
    zIndex: 3,
    position: "relative",
    overflowX: "auto",
    paddingBottom: "10px",
  },
  hireCard: {
    background: "rgba(20, 45, 60, 0.85)",
    borderRadius: 14,
    padding: "15px 20px",
    boxShadow: "0 4px 10px rgba(0, 207, 255, 0.2)",
    transition: "box-shadow 0.3s",
    backdropFilter: "blur(5px)",
    minWidth: "200px",
  },
  chatButton: {
    marginTop: 10,
    padding: "10px 20px",
    backgroundColor: "#00cfff",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    transition: "box-shadow 0.3s",
    fontWeight: "600",
    position: "relative",
    overflow: "hidden",
  },
  communityCard: {
    background: "rgba(20, 45, 60, 0.85)",
    borderRadius: 14,
    padding: 20,
    display: "flex",
    alignItems: "center",
    gap: 15,
    boxShadow: "0 4px 10px rgba(0, 207, 255, 0.2)",
    transition: "box-shadow 0.3s",
    backdropFilter: "blur(5px)",
    zIndex: 3,
    position: "relative",
  },
  communityIcon: {
    fontSize: 36,
    color: "#00cfff",
    textShadow: "0 0 10px rgba(0, 207, 255, 0.4)",
  },
  communityText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#fff",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  communityLink: {
    color: "#00cfff",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: 14,
    textShadow: "0 0 5px rgba(0, 207, 255, 0.3)",
    transition: "color 0.3s",
  },
  error: {
    color: "#ff6b6b",
    textAlign: "center",
    textShadow: "0 0 5px rgba(255, 107, 107, 0.3)",
    zIndex: 3,
    position: "relative",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "rgba(20, 45, 60, 0.85)",
    padding: "30px",
    borderRadius: "16px",
    width: "450px",
    maxWidth: "90%",
    boxShadow: "0 15px 40px rgba(0, 207, 255, 0.3)",
    backdropFilter: "blur(10px)",
    zIndex: 1001,
  },
  modalTitle: {
    fontSize: "1.8rem",
    color: "#fff",
    marginBottom: "20px",
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "1rem",
    color: "#d0e1e9",
    marginBottom: "8px",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 207, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    transition: "border 0.3s, box-shadow 0.3s",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 207, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    fontSize: "1rem",
    minHeight: "120px",
    outline: "none",
    transition: "border 0.3s, box-shadow 0.3s",
  },
  modalActions: {
    display: "flex",
    gap: "15px",
    justifyContent: "flex-end",
  },
  saveButton: {
    padding: "12px 24px",
    backgroundColor: "#00cfff",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "box-shadow 0.3s",
    fontWeight: "600",
  },
  cancelButton: {
    padding: "12px 24px",
    backgroundColor: "#ff4d4f",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "box-shadow 0.3s",
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: "#ff4d4f",
    color: "#fff",
    borderRadius: "12px",
    padding: "3px 8px",
    fontSize: "0.8rem",
    fontWeight: "bold",
    position: "absolute",
    top: "-10px",
    right: "-10px",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
  },
};

export default Dashboard;