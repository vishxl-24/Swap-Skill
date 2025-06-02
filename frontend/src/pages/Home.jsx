import React from "react";
import { useNavigate, Link } from "react-router-dom";

const styles = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(135deg, #0a1d2b 0%, #1e3a5f 50%, #2c5364 100%)",
    color: "#fff",
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
      url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDU2MCI+PHBhdGggZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBmaWxsLW9wYWNpdHk9IjAuNCIgZD0iTTAsMTkyTDQ4LDE3NiBDOTYsMTYwLDE5MiwxMjgsMjg4LDE0NCBDMzg0LDE2MCw0ODAsMjA4LDU3NiwyMTYgQzY3MiwyMjQsNzY4LDE5Miw4NjQsMTY4IEM5NjAsMTQ0LDEwNTYsMTI4LDExNTIsMTQ0IEMxMjQ4LDE2MCwxMzQ0LDE5MiwxMzkyLDIwOCBMMTQ0MCwyMjQgVjU2MCBIMTAgQzQ4MCwyNTYsOTYwLDE5MiwxNDQwLDE5MiBaIj48L3BhdGggPjwvc3ZnPg=='),
      url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDU2MCI+PHBhdGggZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjE1KSIgZmlsbC1vcGFjaXR5PSIwLjMiIGQ9Ik0wLDMyMEw0OCwzMDQgQzk2LDI4OCwxOTIsMjU2LDI4OCwyNzIgQzM4NCwyODgsNDgwLDMzNiw1NzYsMzQ0IEM6NzIsMzUyLDc2OCwzMjAsODY0LDI5NiBDOTYwLDI3MiwxMDX6LDI1NiwxMTUyLDI3MiBDMTI0OCwyODgsMTM0NCwzMjAsMTM5MiwzMzYgTDE0NDAsMzUyIFY1NjAgSDE0NDAgQzQ4MCwzODQsOTYwLDMyMCwxNDQwLDMyMCZaIj48L3BhdGggPjwvc3ZnPg==')
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
    height: "100%", // Fixed typo by removing "Avis:"
    zIndex: 2,
    pointerEvents: "none",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 50px",
    backgroundColor: "rgba(10, 29, 43, 0.8)",
    backdropFilter: "blur(10px)",
    position: "sticky",
    top: 0,
    zIndex: 4,
    width: "100%",
    boxSizing: "border-box",
    boxShadow: "0 4px 15px rgba(0, 207, 255, 0.1)",
  },
  logo: {
    fontSize: "2.2rem",
    fontWeight: "700",
    color: "#00cfff",
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
    letterSpacing: "1px",
  },
  centerNav: {
    display: "flex",
    gap: "30px",
    fontSize: "1.1rem",
    fontWeight: "500",
  },
  navLink: {
    color: "#ffffff",
    textDecoration: "none",
    cursor: "pointer",
    padding: "10px 15px",
    borderRadius: "8px",
    transition: "background 0.3s, transform 0.2s",
    position: "relative",
    overflow: "hidden",
  },
  navLinkHover: {
    backgroundColor: "rgba(0, 207, 255, 0.2)",
    transform: "translateY(-2px)",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "100px 20px",
    position: "relative",
    zIndex: 3,
    minHeight: "80vh",
    width: "100%",
    boxSizing: "border-box",
  },
  heading: {
    fontSize: "4rem",
    marginBottom: "30px",
    maxWidth: "1000px",
    fontWeight: "800",
    textShadow: "0 0 20px rgba(0, 207, 255, 0.6)",
    lineHeight: "1.2",
    animation: "fadeIn 1s ease-in-out",
  },
  subText: {
    fontSize: "1.4rem",
    marginBottom: "50px",
    maxWidth: "800px",
    lineHeight: "1.8",
    opacity: 0.9,
    textShadow: "0 0 10px rgba(0, 207, 255, 0.3)",
    animation: "fadeIn 1.5s ease-in-out",
  },
  getStartedBtn: {
    backgroundColor: "#00cfff",
    color: "#fff",
    fontWeight: "600",
    border: "none",
    padding: "16px 32px",
    fontSize: "1.3rem",
    borderRadius: "50px",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0, 207, 255, 0.5)",
    transition: "transform 0.3s, box-shadow 0.3s",
    animation: "fadeIn 2s ease-in-out",
    position: "relative",
    overflow: "hidden",
  },
  getStartedBtnHover: {
    transform: "scale(1.05) translateY(-5px)",
    boxShadow: "0 12px 30px rgba(0, 207, 255, 0.7)",
  },
};

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
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
      <nav style={styles.nav}>
        <div style={styles.logo}>SkillSwap</div>
        <div style={styles.centerNav}>
          <Link
            to="/"
            style={styles.navLink}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = styles.navLinkHover.backgroundColor;
              e.target.style.transform = styles.navLinkHover.transform;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.transform = "translateY(0)";
            }}
          >
            Home
          </Link>
          <Link
            to="/about"
            style={styles.navLink}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = styles.navLinkHover.backgroundColor;
              e.target.style.transform = styles.navLinkHover.transform;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.transform = "translateY(0)";
            }}
          >
            About
          </Link>
          <Link
            to="/contact"
            style={styles.navLink}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = styles.navLinkHover.backgroundColor;
              e.target.style.transform = styles.navLinkHover.transform;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.transform = "translateY(0)";
            }}
          >
            Contact
          </Link>
          <Link
            to="/login"
            style={styles.navLink}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = styles.navLinkHover.backgroundColor;
              e.target.style.transform = styles.navLinkHover.transform;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.transform = "translateY(0)";
            }}
          >
            Sign In
          </Link>
        </div>
      </nav>

      <div style={styles.hero}>
        <h1 style={styles.heading}>Connect. Swap Skills. Grow Together.</h1>
        <p style={styles.subText}>
          SkillSwap is your ultimate platform for discovering and exchanging
          skills with freelancers across the globe. Collaborate, chat, and build
          your portfolio—all in one place.
        </p>
        <button
          style={styles.getStartedBtn}
          onClick={() => navigate("/register")}
          onMouseEnter={(e) => {
            e.target.style.transform = styles.getStartedBtnHover.transform;
            e.target.style.boxShadow = styles.getStartedBtnHover.boxShadow;
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = "0 8px 20px rgba(0, 207, 255, 0.5)";
          }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default Home;