import React, { useState, useEffect } from "react";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

const MyClients = () => {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewForm, setReviewForm] = useState({ workId: "", review: "", rating: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorks = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view work data");
        setLoading(false);
        return;
      }

      const response = await api.get("/api/auth/workhistory", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const freelancerWorks = response.data.asFreelancer.map((work) => ({
        ...work,
        role: "freelancer",
      }));

      const clientWorks = response.data.asClient.map((work) => ({
        ...work,
        role: "client",
      }));

      const combinedWorks = [...freelancerWorks, ...clientWorks].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      console.log("Fetched works:", combinedWorks.map((w) => ({ id: w._id, project: w.project })));
      setWorks(combinedWorks);
      setError("");
    } catch (err) {
      console.error("Failed to fetch work data:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to load work data");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e, workId) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to submit a review");
        setIsSubmitting(false);
        return;
      }

      if (!reviewForm.review.trim()) {
        setError("Review cannot be empty");
        setIsSubmitting(false);
        return;
      }

      if (reviewForm.review.length > 500) {
        setError("Review cannot exceed 500 characters");
        setIsSubmitting(false);
        return;
      }

      const rating = parseInt(reviewForm.rating);
      if (!rating || rating < 1 || rating > 5) {
        setError("Rating must be between 1 and 5");
        setIsSubmitting(false);
        return;
      }

      console.log("Submitting review:", { workId, review: reviewForm.review, rating });

      const response = await api.patch(
        `/api/auth/work/${workId}/review`,
        {
          review: reviewForm.review.trim(),
          rating,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message || "Review submitted successfully!");
      setReviewForm({ workId: "", review: "", rating: "" });
      setError("");
      await fetchWorks();
    } catch (err) {
      console.error("Failed to submit review:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStarClick = (starIndex, workId) => {
    const rating = starIndex + 1; // Stars are 0-indexed, so add 1 for rating
    setReviewForm({ ...reviewForm, workId, rating: rating.toString() });
  };

  useEffect(() => {
    fetchWorks();
    const interval = setInterval(fetchWorks, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
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
        .works-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
        }
        .star-rating {
          display: flex;
          gap: 5px;
          margin-bottom: 10px;
        }
        .star {
          font-size: 24px;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.3);
          transition: color 0.2s ease-in-out, transform 0.2s ease-in-out;
        }
        .star:hover,
        .star.hovered,
        .star.selected {
          color: #ffd700;
          transform: scale(1.2);
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

      <h2 style={styles.title}>My Work Data (All Works)</h2>
      {error && (
        <div style={styles.errorContainer}>
          <h3 style={styles.error}>❌ {error}</h3>
          <button
            style={styles.retryButton}
            onClick={() => {
              setError("");
              fetchWorks();
            }}
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
            Retry
          </button>
        </div>
      )}
      {works.length > 0 ? (
        <div className="works-container">
          {works.map((item, index) => (
            <div
              key={`${item.role}-${item._id}`}
              style={{ ...styles.card, animationDelay: `${index * 0.1}s`, width: '30%' }}
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
              <p
                style={{
                  ...styles.info,
                  color:
                    item.status === "Completed"
                      ? "#34c759"
                      : item.status === "Denied"
                      ? "#ff4d4f"
                      : "#ffa726",
                }}
              >
                <strong>Status:</strong> {item.status}
              </p>
              <p style={styles.info}>
                <strong>Role:</strong> {item.role === "freelancer" ? "Freelancer" : "Client"}
              </p>
              {item.role === "client" && item.status === "Completed" && (
                <>
                  {item.review && item.review.length > 0 ? (
                    <div style={styles.review}>
                      <p style={styles.reviewText}><strong>Review:</strong> {item.review}</p>
                      <p style={styles.reviewRating}><strong>Rating:</strong> {"★".repeat(item.rating)}</p>
                      <p style={styles.reviewStatus}>Rating and review given</p>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => handleReviewSubmit(e, item._id)}
                      style={styles.reviewFormContainer}
                    >
                      <div style={styles.reviewForm}>
                        <div style={styles.inputContainer}>
                          <input
                            type="text"
                            value={reviewForm.workId === item._id ? reviewForm.review : ""}
                            onChange={(e) =>
                              setReviewForm({ ...reviewForm, workId: item._id, review: e.target.value })
                            }
                            placeholder="Enter review"
                            style={styles.input}
                            maxLength="500"
                            required
                          />
                          <span style={styles.charCount}>
                            {reviewForm.workId === item._id ? reviewForm.review.length : 0}/500
                          </span>
                        </div>
                        <div className="star-rating">
                          {[...Array(5)].map((_, starIndex) => (
                            <span
                              key={starIndex}
                              className={`star ${
                                reviewForm.workId === item._id &&
                                starIndex < parseInt(reviewForm.rating || 0)
                                  ? "selected"
                                  : ""
                              } ${
                                reviewForm.workId === item._id &&
                                starIndex < parseInt(reviewForm.rating || 0)
                                  ? "hovered"
                                  : ""
                              }`}
                              onClick={() => handleStarClick(starIndex, item._id)}
                              onMouseEnter={(e) => {
                                const stars = e.target.parentElement.children;
                                for (let i = 0; i <= starIndex; i++) {
                                  stars[i].classList.add("hovered");
                                }
                              }}
                              onMouseLeave={(e) => {
                                const stars = e.target.parentElement.children;
                                for (let i = 0; i <= starIndex; i++) {
                                  if (!stars[i].classList.contains("selected")) {
                                    stars[i].classList.remove("hovered");
                                  }
                                }
                              }}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <button
                          type="submit"
                          style={isSubmitting ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
                          disabled={isSubmitting}
                          onMouseEnter={(e) => {
                            if (!isSubmitting) {
                              e.target.style.transform = "scale(1.05)";
                              e.target.style.boxShadow = "0 6px 15px rgba(0, 207, 255, 0.4)";
                              e.target.style.backgroundColor = "#4dd0e1";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubmitting) {
                              e.target.style.transform = "scale(1)";
                              e.target.style.boxShadow = "0 2px 5px rgba(0, 207, 255, 0.2)";
                              e.target.style.backgroundColor = "#00cfff";
                            }
                          }}
                        >
                          {isSubmitting ? "Submitting..." : "Submit Review"}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.noContent}>No work data available.</p>
      )}
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
  errorContainer: {
    marginBottom: "20px",
    textAlign: "center",
    zIndex: 3,
    position: "relative",
  },
  error: {
    color: "#ff4d4f",
    marginBottom: "10px",
    textShadow: "0 0 5px rgba(255, 107, 107, 0.3)",
    zIndex: 3,
    position: "relative",
  },
  retryButton: {
    padding: "10px 20px",
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
    boxSizing: "border-box",
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
  review: {
    marginTop: "15px",
    padding: "10px",
    background: "rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
  },
  reviewText: {
    fontSize: "1rem",
    margin: "0 0 8px",
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  reviewRating: {
    fontSize: "1rem",
    margin: "0 0 8px",
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  reviewStatus: {
    color: "#34c759",
    fontStyle: "italic",
    marginTop: "8px",
    fontSize: "0.9rem",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  reviewFormContainer: {
    marginTop: "15px",
    maxWidth: "100%", // Adjusted to fit within card width
    marginLeft: "auto",
    marginRight: "auto",
  },
  reviewForm: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    background: "rgba(20, 45, 60, 0.85)",
    padding: "15px",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0, 207, 255, 0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(0, 207, 255, 0.2)",
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(0, 207, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#fff",
    fontSize: "1rem",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    transition: "border 0.3s, box-shadow 0.3s",
    fontFamily: "'Inter', sans-serif",
  },
  charCount: {
    position: "absolute",
    right: "12px",
    bottom: "12px",
    fontSize: "12px",
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  button: {
    padding: "12px",
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
  buttonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    cursor: "not-allowed",
    boxShadow: "none",
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

export default MyClients;