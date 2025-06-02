import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const FreelancerProfile = ({ onHire }) => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [freelancer, setFreelancer] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState("");

  useEffect(() => {
    const fetchFreelancer = async () => {
      console.log("Full useParams output:", params);
      console.log("Current URL:", location.pathname);
      const id = params.id;
      console.log("Received ID from URL:", id);

      if (!id || id === "undefined") {
        setError("Invalid or missing freelancer ID");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching freelancer profile for ID:", id);
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Please log in to view freelancer profiles");
        }
        const response = await axios.get(`http://localhost:5000/api/auth/freelancer/${id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        // Update the date for Vishal's work and temporarily assign ratings
        const updatedFreelancer = {
          ...response.data,
          previousWorks: response.data.previousWorks?.map((work) => {
            // Set the date for Vishal's work
            const updatedWork = work.client?.toLowerCase() === "vishal"
              ? { ...work, date: new Date("2025-05-14").toISOString() }
              : work;

            // Temporary workaround: Look for a matching review by client name
            const matchingReview = response.data.reviews?.find(
              (review) => review.client?.toLowerCase() === updatedWork.client?.toLowerCase()
            );
            if (matchingReview && typeof matchingReview.rating === "number") {
              return { ...updatedWork, rating: matchingReview.rating };
            }
            // Fallback: Assign a default rating of 4 for testing
            return { ...updatedWork, rating: 4 };
          }) || [],
        };

        // Debug logs to inspect data
        console.log("Reviews Data:", updatedFreelancer.reviews);
        console.log("Previous Works Data (after update):", updatedFreelancer.previousWorks);

        setFreelancer(updatedFreelancer);
        console.log("Freelancer data:", updatedFreelancer);
      } catch (err) {
        console.error("Failed to fetch freelancer:", err);
        if (err.response) {
          setError(err.response.data.message || "Failed to load freelancer profile.");
          console.log("Error response:", err.response.data);
        } else if (err.request) {
          setError("Unable to reach the server. Please check your backend.");
        } else {
          setError(err.message || "An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFreelancer();
  }, [params, location.pathname]);

  const handleHire = async () => {
    if (!freelancer) return;
    if (!project.trim()) {
      alert("Please enter a project name");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to hire a freelancer");
        return;
      }

      await axios.post(
        "http://localhost:5000/api/auth/hire",
        {
          freelancerId: freelancer.id,
          project,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (onHire) {
        onHire({ name: freelancer.name, status: "Pending" });
      }
      alert(`Hired ${freelancer.name} for project: ${project}`);
      setProject("");
      navigate("/dashboard");
    } catch (err) {
      console.error("Hire failed:", err);
      alert(err.response?.data?.message || "Failed to hire freelancer");
    }
  };

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

  if (error || !freelancer) {
    return (
      <div style={styles.container}>
        <h3 style={styles.error}>❌ {error || "Freelancer not found"}</h3>
        <p style={styles.errorSubtext}>Check the URL or go back to the search page.</p>
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
        .review-item, .work-item {
          animation: fadeIn 0.5s ease-in-out;
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

      {/* <h2 style={styles.title}>{freelancer.name}</h2> */}
      <div style={styles.profileCard}>
        <h3 style={styles.name}>{freelancer.name}</h3>
        <p style={styles.info}><strong>Bio:</strong> {freelancer.bio || "No bio available"}</p>
        <p style={styles.info}><strong>Skills:</strong> {freelancer.skills?.join(", ") || "No skills listed"}</p>
        <p style={styles.info}><strong>Rating:</strong> ⭐ {freelancer.rating?.toFixed(1) || "0.0"}</p>
      </div>

      <h3 style={styles.subtitle}>Client Reviews</h3>
      {freelancer.reviews && freelancer.reviews.length > 0 ? (
        <div style={styles.reviewList}>
          {freelancer.reviews.map((review, i) => (
            <div
              key={i}
              style={{ ...styles.reviewItem, animationDelay: `${i * 0.1}s` }}
              className="review-item"
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.02) translateY(-3px)";
                e.target.style.boxShadow = "0 6px 15px rgba(0, 207, 255, 0.3)";
                e.target.style.border = "1px solid rgba(0, 207, 255, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 2px 5px rgba(0, 207, 255, 0.2)";
                e.target.style.border = "1px solid rgba(0, 207, 255, 0.2)";
              }}
            >
              <p style={styles.reviewText}>
                <strong>{review.client || "Unknown"}:</strong> "{review.review || "No review text"}"
              </p>
              <p style={styles.reviewRating}><strong>Rating:</strong> ⭐ {review.rating?.toFixed(1) || "0.0"}</p>
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.noContent}>No reviews yet.</p>
      )}

      <h3 style={styles.subtitle}>Previous Works</h3>
      {freelancer.previousWorks && freelancer.previousWorks.length > 0 ? (
        <div style={styles.workList}>
          {freelancer.previousWorks.map((work, i) => (
            <div
              key={i}
              style={{ ...styles.workItem, animationDelay: `${i * 0.1}s` }}
              className="work-item"
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.02) translateY(-3px)";
                e.target.style.boxShadow = "0 6px 15px rgba(0, 207, 255, 0.3)";
                e.target.style.border = "1px solid rgba(0, 207, 255, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "0 2px 5px rgba(0, 207, 255, 0.2)";
                e.target.style.border = "1px solid rgba(0, 207, 255, 0.2)";
              }}
            >
              <p style={styles.workTitle}>{work.title || "Untitled"}</p>
              {work.description && (
                <p style={styles.workDescription}>{work.description}</p>
              )}
              {work.client && (
                <p style={styles.workClient}><strong>Client:</strong> {work.client}</p>
              )}
              <p style={styles.workDate}>
                <strong>Completed:</strong> {new Date(work.date).toLocaleDateString()}
              </p>
              <p style={styles.workRating}>
                <strong>Rating:</strong>{" "}
                {typeof work.rating === "number" && work.rating >= 0 && work.rating <= 5
                  ? `⭐ ${work.rating.toFixed(1)}`
                  : "Not rated"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.noContent}>No previous works listed.</p>
      )}

      <div style={styles.hireSectionContainer}>
        <div style={styles.hireSection}>
          <input
            type="text"
            placeholder="Enter project name"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            style={styles.input}
          />
          <button
            onClick={handleHire}
            style={styles.hireButton}
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
            Hire
          </button>
        </div>
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
      url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNDQwIDU2MCI+PHBhdGggZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBmaWxsLW9wYWNpdHk9IjAuNCIgZD0iTTAsMTkyTDQ4LDE3NiBDOTYsMTYwLDE5MiwxMjgsMjg4LDE0NCBDMzg0LDE2MCw0ODAsMjA4LDU3NiwyMTYgQzY3MiwyMjQsNzY4LDE5Miw4NjQsMTY4IEM9NjAsMTQ0LDEwNTYsMTI4LDExNTIsMTQ0IEMxMjQ4LDE2MCwxMzQ0LDE5MiwxMzkyLDIwOCBMMTQ0MCwyMjQgVjU2MCBIMTAgQzQ8MCwyNTYsOTYwLDE5MiwxNDQwLDE5MiBaIj48L3BhdGggPjwvc3ZnPg=='),
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
    fontSize: "2.2rem",
    color: "#fff",
    marginBottom: "20px",
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
    fontWeight: 600,
    textAlign: "center",
    zIndex: 3,
    position: "relative",
  },
  profileCard: {
    background: "rgba(20, 45, 60, 0.85)",
    borderRadius: 14,
    padding: "20px",
    boxShadow: "0 4px 10px rgba(0, 207, 255, 0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(0, 207, 255, 0.2)",
    marginBottom: 30,
    zIndex: 3,
    position: "relative",
    animation: "fadeIn 0.5s ease-in-out",
    maxWidth: "500px",
    marginLeft: "auto",
    marginRight: "auto",
    textAlign: "center",
  },
  name: {
    fontSize: "1.8rem",
    margin: "0 0 10px",
    color: "#fff",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  subtitle: {
    fontSize: "1.6rem",
    color: "#fff",
    margin: "30px 0 15px",
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
    fontWeight: 600,
    zIndex: 3,
    position: "relative",
  },
  info: {
    fontSize: "1.1rem",
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
  errorSubtext: {
    fontSize: "1rem",
    color: "#d0e1e9",
    textAlign: "center",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
    zIndex: 3,
    position: "relative",
  },
  reviewList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "30px",
    zIndex: 3,
    position: "relative",
    justifyContent: "center",
  },
  reviewItem: {
    width: "300px",
    padding: "15px",
    background: "rgba(20, 45, 60, 0.85)",
    borderRadius: "10px",
    boxShadow: "0 2px 5px rgba(0, 207, 255, 0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(0, 207, 255, 0.2)",
    transition: "transform 0.2s, box-shadow 0.3s, border 0.3s",
  },
  reviewText: {
    fontSize: "1rem",
    margin: "0 0 8px",
    color: "#d0e1e9",
    fontStyle: "italic",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  reviewRating: {
    fontSize: "0.9rem",
    margin: 0,
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  workList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "30px",
    zIndex: 3,
    position: "relative",
    justifyContent: "center",
  },
  workItem: {
    width: "300px",
    padding: "15px",
    background: "rgba(20, 45, 60, 0.85)",
    borderRadius: "10px",
    boxShadow: "0 2px 5px rgba(0, 207, 255, 0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(0, 207, 255, 0.2)",
    transition: "transform 0.2s, box-shadow 0.3s, border 0.3s",
  },
  workTitle: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    margin: "0 0 8px",
    color: "#fff",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  workDescription: {
    fontSize: "1rem",
    margin: "0 0 8px",
    color: "d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  workClient: {
    fontSize: "0.9rem",
    margin: "0 0 8px",
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  workDate: {
    fontSize: "0.85rem",
    margin: "0 0 4px",
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  workRating: {
    fontSize: "0.85rem",
    margin: 0,
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  noContent: {
    fontSize: "1rem",
    color: "#d0e1e9",
    fontStyle: "italic",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
    zIndex: 3,
    position: "relative",
    textAlign: "center",
  },
  hireSectionContainer: {
    maxWidth: "600px",
    margin: "30px auto 0",
    zIndex: 3,
    position: "relative",
  },
  hireSection: {
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
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 207, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#fff",
    fontSize: "1rem",
    flex: 1,
    outline: "none",
    transition: "border 0.3s, box-shadow 0.3s",
    fontFamily: "'Inter', sans-serif",
  },
  hireButton: {
    padding: "12px 24px",
    backgroundColor: "#00cfff",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    transition: "transform 0.2s, box-shadow 0.3s, background-color 0.3s",
    boxShadow: "0 2px 5px rgba(0, 207, 255, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
};

export default FreelancerProfile;