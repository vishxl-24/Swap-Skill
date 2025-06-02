import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      console.log("Sending login request with data:", { email, password });
      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      console.log("Login successful:", response.data);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      if (err.response) {
        setError(err.response.data.message || "Invalid email or password.");
      } else if (err.request) {
        setError("Unable to reach the server. Please check your backend.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.waveOverlay} className="wave-overlay"></div>
      <div style={styles.particleOverlay} className="particle-overlay"></div>
      <style>{`
        .wave-overlay {
          animation: wave 15s infinite ease-in-out;
          background: linear-gradient(to bottom, rgba(10, 29, 43, 0.5), rgba(44, 83, 100, 0.3));
          background-size: cover;
          background-position: center;
        }
        .particle-overlay {
          background: radial-gradient(circle at 10% 90%, rgba(0, 207, 255, 0.15) 2px, transparent 2px),
                      radial-gradient(circle at 90% 20%, rgba(0, 207, 255, 0.15) 2px, transparent 2px),
                      radial-gradient(circle at 50% 50%, rgba(0, 207, 255, 0.1) 3px, transparent 3px);
          animation: particles 30s infinite linear;
        }
        @keyframes wave {
          0% { background-position: 0 0, 0 100%, 0 0; }
          50% { background-position: 100% 0, 100% 100%, 100% 0; }
          100% { background-position: 0 0, 0 100%, 0 0; }
        }
        @keyframes particles {
          0% { background-position: 0 0; }
          100% { background-position: 0 -1000px; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        input:focus {
          border: 1px solid #00cfff !important;
          box-shadow: 0 0 10px rgba(0, 207, 255, 0.5) !important;
        }
        button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.2);
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
      <div style={styles.box}>
        <h2 style={styles.heading}>Sign In to SkillSwap</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
            disabled={loading}
          />
          <button
            type="submit"
            style={{ ...styles.button, opacity: loading ? "0.6" : "1" }}
            disabled={loading}
            onMouseEnter={(e) => {
              e.target.style.transform = styles.buttonHover.transform;
              e.target.style.boxShadow = styles.buttonHover.boxShadow;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 8px 20px rgba(0, 207, 255, 0.5)";
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p style={styles.linkText}>
          Don’t have an account?{" "}
          <Link
            to="/register"
            style={styles.link}
            onMouseEnter={(e) => {
              e.target.style.color = styles.linkHover.color;
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "#00cfff";
            }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(135deg, #0a1d2b 0%, #1e3a5f 50%, #2c5364 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
  },
  waveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundImage: `
      url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDU2MCI+PHBhdGggZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBmaWxsLW9wYWNpdHk9IjAuNCIgZD0iTTAsMTkyTDQ4LDE3NiBDOTYsMTYwLDE5MiwxMjgsMjg4LDE0NCBDMzg0LDE2MCw0ODAsMjA4LDU3NiwyMTYgQzY3MiwyMjQsNzY4LDE5Miw4NjQsMTY4IEM9NjAsMTQ0LDEwNTYsMTI4LDExNTIsMTQ0IEMxMjQ4LDE2MCwxMzQ0LDE5MiwxMzkyLDIwOCBMMTQ0MCwyMjQgVjU2MCBIMTAgQzQ4MCwyNTYsOTYwLDE5MiwxNDQwLDE5MiBaIj48L3BhdGggPjwvc3ZnPg=='),
      url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDU2MCI+PHBhdGggZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjE1KSIgZmlsbC1vcGFjaXR5PSIwLjMiIGQ9Ik0wLDMyMEw0OCwzMDQgQzk2LDI4OCwxOTIsMjU2LDI4OCwyNzIgQzM4NCwyODgsNDgwLDMzNiw1NzYsMzQ0IEM2NzIsMzUyLDc2OCwzMjAsODY0LDI5NiBDOTYwLDI3MiwxMDX6LDI1NiwxMTUyLDI3MiBDMTI0OCwyODgsMTM0NCwzMjAsMTM5MiwzMzYgTDE0NDAsMzUyIFY1NjAgSDE0NDAgQzQ8MCwzODQsOTYwLDMyMCwxNDQwLDMyMCZaIj48L3BhdGggPjwvc3ZnPg==')
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
  box: {
    backgroundColor: "rgba(10, 29, 43, 0.9)",
    padding: "50px",
    borderRadius: "20px",
    boxShadow: "0 15px 40px rgba(0, 207, 255, 0.3)",
    maxWidth: "500px",
    width: "100%",
    textAlign: "center",
    zIndex: 3,
    backdropFilter: "blur(10px)",
    transform: "perspective(1000px) rotateX(2deg)",
    transition: "transform 0.5s",
  },
  boxHover: {
    transform: "perspective(1000px) rotateX(0deg)",
  },
  heading: {
    marginBottom: "30px",
    color: "#fff",
    fontSize: "2.5rem",
    fontWeight: "700",
    textShadow: "0 0 20px rgba(0, 207, 255, 0.6)",
    animation: "fadeIn 1s ease-in-out",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  input: {
    width: "300px", // Constrain the width to 300px
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid rgba(0, 207, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    transition: "border 0.3s, box-shadow 0.3s",
    margin: "0 auto", // Center the input within the form
  },
  button: {
    width: "300px", // Match the button width to the input for consistency
    padding: "14px",
    backgroundColor: "#00cfff",
    color: "#fff",
    fontWeight: "600",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "1.1rem",
    boxShadow: "0 8px 20px rgba(0, 207, 255, 0.5)",
    transition: "transform 0.3s, box-shadow 0.3s",
    position: "relative",
    overflow: "hidden",
    margin: "0 auto", // Center the button
  },
  buttonHover: {
    transform: "scale(1.05) translateY(-5px)",
    boxShadow: "0 12px 30px rgba(0, 207, 255, 0.7)",
  },
  error: {
    color: "#ff6b6b",
    marginBottom: "15px",
    fontSize: "0.95rem",
    textShadow: "0 0 5px rgba(255, 107, 107, 0.3)",
    animation: "fadeIn 0.5s ease-in-out",
  },
  linkText: {
    marginTop: "20px",
    fontSize: "0.95rem",
    color: "#b0bec5",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.3)",
  },
  link: {
    color: "#00cfff",
    textDecoration: "none",
    fontWeight: "600",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.3)",
    transition: "color 0.3s",
  },
  linkHover: {
    color: "#4dd0e1",
  },
};

export default Login;