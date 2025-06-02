import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const SearchFreelancers = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a search term.");
      setResults([]);
      return;
    }

    setError("");
    setLoading(true);

    try {
      console.log("Sending search request with query:", query);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to search freelancers.");
        setLoading(false);
        return;
      }

      const response = await axios.get("http://localhost:5000/api/auth/search", {
        params: { query: query.trim() },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      console.log("Search results:", response.data);
      setResults(response.data);
    } catch (err) {
      console.error("Search failed:", err);
      if (err.response) {
        setError(err.response.data.message || "Failed to fetch freelancers.");
      } else if (err.request) {
        setError("Unable to reach the server. Please check your backend.");
      } else {
        setError("An unexpected error occurred.");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (id) => {
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error("Invalid freelancer ID:", id);
      return;
    }
    console.log("Navigating to freelancer profile with ID:", id);
    navigate(`/freelancer/${id}`);
  };

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
        .freelancer-card {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes wave {
          0% { background-position: center bottom, center top; }
          50% { background-position: center top, center bottom; }
          100% { background-position: center bottom, center top; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        input:focus {
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

      <h2 style={styles.title}>Find Freelancers by Skill</h2>
      <div style={styles.searchBarContainer}>
        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Enter skill or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={styles.input}
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            style={styles.button}
            disabled={loading}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 6px 15px rgba(0, 207, 255, 0.4)";
              e.target.style.backgroundColor = "#4dd0e1";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 2px 5px rgba(0, 207, 255, 0.2)";
              e.target.style.backgroundColor = "#00cfff";
            }}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.resultContainer}>
        {results.map((freelancer, index) => (
          <div
            key={freelancer.id}
            style={{ ...styles.card, animationDelay: `${index * 0.1}s` }}
            className="freelancer-card"
            onClick={() => handleCardClick(freelancer.id)}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.03) translateY(-5px)";
              e.target.style.boxShadow = "0 8px 20px rgba(0, 207, 255, 0.4)";
              e.target.style.border = "1px solid rgba(0, 207, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 4px 10px rgba(0, 207, 255, 0.2)";
              e.target.style.border = "1px solid rgba(0, 207, 255, 0.2)";
            }}
          >
            <h3 style={styles.name}>{freelancer.name}</h3>
            <p style={styles.skill}>{freelancer.skill}</p>
            <p style={styles.rating}>
              ⭐ {freelancer.rating.toFixed(1)} ({freelancer.reviews} reviews)
            </p>
          </div>
        ))}
        {results.length === 0 && query && !error && !loading && (
          <p style={styles.noResults}>No freelancers found for "{query}"</p>
        )}
      </div>
    </div>
  );
};

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
  searchBarContainer: {
    maxWidth: "600px",
    margin: "0 auto",
    marginBottom: "30px",
    zIndex: 3,
    position: "relative",
  },
  searchBar: {
    display: "flex",
    gap: "15px",
    background: "rgba(20, 45, 60, 0.85)",
    padding: "15px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0, 207, 255, 0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(0, 207, 255, 0.2)",
  },
  input: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 207, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    transition: "border 0.3s, box-shadow 0.3s",
    fontFamily: "'Inter', sans-serif",
  },
  button: {
    padding: "12px 24px",
    backgroundColor: "#00cfff",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    transition: "transform 0.2s, box-shadow 0.3s, background-color 0.3s",
    opacity: (props) => (props.disabled ? "0.6" : "1"),
    position: "relative",
    overflow: "hidden",
  },
  resultContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxWidth: "800px",
    margin: "0 auto",
    zIndex: 3,
    position: "relative",
  },
  card: {
    background: "rgba(20, 45, 60, 0.85)",
    borderRadius: "14px",
    padding: "20px",
    boxShadow: "0 4px 10px rgba(0, 207, 255, 0.2)",
    transition: "transform 0.3s, box-shadow 0.3s, border 0.3s",
    backdropFilter: "blur(10px)",
    cursor: "pointer",
    border: "1px solid rgba(0, 207, 255, 0.2)",
  },
  name: {
    fontSize: "1.4rem",
    margin: 0,
    color: "#fff",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  skill: {
    fontSize: "1.1rem",
    color: "#d0e1e9",
    margin: "8px 0",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  rating: {
    fontSize: "1rem",
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  error: {
    color: "#ff4d4f",
    textAlign: "center",
    marginBottom: "20px",
    textShadow: "0 0 5px rgba(255, 107, 107, 0.3)",
    zIndex: 3,
    position: "relative",
  },
  noResults: {
    fontStyle: "italic",
    color: "#d0e1e9",
    textAlign: "center",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
    zIndex: 3,
    position: "relative",
  },
};

export default SearchFreelancers;