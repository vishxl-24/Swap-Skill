import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

const Profile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    field: '',
    bio: '',
    skills: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please log in to edit your profile');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5000/api/auth/user', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = response.data;
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          field: userData.skills?.[0] || '',
          bio: userData.profile?.bio || '',
          skills: userData.skills?.join(', ') || '',
        });
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to save changes');
        return;
      }

      const skillsArray = formData.skills
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill);

      await axios.put(
        'http://localhost:5000/api/auth/profile',
        {
          name: formData.name,
          skills: [formData.field, ...skillsArray.filter(skill => skill !== formData.field)],
          bio: formData.bio,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert('Profile updated successfully');
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert(err.response?.data?.message || 'Failed to update profile');
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
          animation: wave 15s infinite ease-in-out;
          background: linear-gradient(to bottom, rgba(40, 70, 90, 0.3), rgba(94, 134, 170, 0.15));
          background-size: cover;
          background-position: center;
        }
        .particle-overlay {
          background: radial-gradient(circle at 10% 90%, rgba(77, 208, 225, 0.2) 2px, transparent 2px),
                      radial-gradient(circle at 90% 20%, rgba(77, 208, 225, 0.2) 2px, transparent 2px),
                      radial-gradient(circle at 50% 50%, rgba(77, 208, 225, 0.15) 3px, transparent 3px);
          animation: particles 30s infinite linear;
        }
        .form-container {
          animation: fadeIn 1s ease-in-out;
        }
        .save-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(77, 208, 225, 0.2), transparent);
          animation: shimmer 2s infinite;
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
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes glowPulse {
          0% { box-shadow: 0 0 5px rgba(77, 208, 225, 0.3); }
          50% { box-shadow: 0 0 15px rgba(77, 208, 225, 0.8); }
          100% { box-shadow: 0 0 5px rgba(77, 208, 225, 0.3); }
        }
        input:focus, textarea:focus {
          border: 1px solid #4dd0e1 !important;
          box-shadow: 0 0 10px rgba(77, 208, 225, 0.5) !important;
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

      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => navigate('/dashboard')}
          title="Back to Dashboard"
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.05)";
            e.target.style.boxShadow = "0 6px 15px rgba(77, 208, 225, 0.4)";
            e.target.style.backgroundColor = "#4dd0e1";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = "0 2px 5px rgba(77, 208, 225, 0.2)";
            e.target.style.backgroundColor = "#00cfff";
          }}
        >
          <FaArrowLeft style={{ marginRight: 8 }} /> Back
        </button>
        <h2 style={styles.heading}>Edit Profile</h2>
      </div>
      <div style={styles.formContainer} className="form-container">
        <div style={styles.form}>
          <label style={styles.label}>Name</label>
          <input
            style={styles.input}
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your Name"
            required
          />

          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Your Email"
            disabled
          />

          <label style={styles.label}>Field of Excellence</label>
          <input
            style={styles.input}
            name="field"
            value={formData.field}
            onChange={handleChange}
            placeholder="e.g., Graphic Design, Web Dev"
          />

          <label style={styles.label}>Bio</label>
          <textarea
            style={{ ...styles.input, height: '100px' }}
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
          />

          <label style={styles.label}>Skills</label>
          <input
            style={styles.input}
            name="skills"
            value={formData.skills}
            onChange={handleChange}
            placeholder="e.g., React, Figma, Python"
          />

          <button
            style={styles.button}
            onClick={handleSave}
            className="save-button"
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 6px 15px rgba(77, 208, 225, 0.4)";
              e.target.style.backgroundColor = "#4dd0e1";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 2px 5px rgba(77, 208, 225, 0.2)";
              e.target.style.backgroundColor = "#00cfff";
            }}
          >
            <FaSave style={{ marginRight: 8 }} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Inter', sans-serif",
    background: "linear-gradient(135deg, #5a8ab5 0%, #7eb0d5 50%, #a8c8e5 100%)",
    minHeight: "100vh",
    padding: "40px",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '30px',
    zIndex: 3,
    position: "relative",
  },
  backButton: {
    padding: '10px 16px',
    backgroundColor: '#00cfff',
    color: '#fff',
    fontWeight: '600',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'transform 0.2s, box-shadow 0.3s, background-color 0.3s',
    boxShadow: "0 2px 5px rgba(77, 208, 225, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  heading: {
    textAlign: 'center',
    margin: 0,
    color: '#fff',
    fontSize: '2rem',
    textShadow: "0 0 15px rgba(77, 208, 225, 0.6)",
    fontWeight: 600,
  },
  formContainer: {
    maxWidth: '600px',
    width: '100%',
    background: 'rgba(40, 70, 90, 0.8)',
    borderRadius: '14px',
    padding: '30px',
    boxShadow: '0 4px 10px rgba(77, 208, 225, 0.2)',
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(77, 208, 225, 0.2)",
    zIndex: 3,
    position: "relative",
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  label: {
    fontWeight: 'bold',
    color: '#e0ecf2',
    fontSize: '1.1rem',
    textShadow: "0 0 5px rgba(77, 208, 225, 0.2)",
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid rgba(77, 208, 225, 0.3)',
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: '#fff',
    outline: 'none',
    transition: 'border 0.3s, box-shadow 0.3s',
    fontFamily: "'Inter', sans-serif",
  },
  button: {
    marginTop: '25px',
    padding: '12px',
    backgroundColor: '#00cfff',
    color: '#fff',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.3s, background-color 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: "0 2px 5px rgba(77, 208, 225, 0.2)",
    position: "relative",
    overflow: "hidden",
  },
  error: {
    color: "#ff6b6b",
    textAlign: "center",
    textShadow: "0 0 5px rgba(255, 107, 107, 0.3)",
    zIndex: 3,
    position: "relative",
  },
};

export default Profile;