import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import { FaPaperclip, FaArrowLeft, FaSignOutAlt } from "react-icons/fa";

const socket = io("http://localhost:5000", {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

const ChatWindow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialOtherUserId = queryParams.get("freelancerId");

  const [userId, setUserId] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [otherUserId, setOtherUserId] = useState(initialOtherUserId || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isChatCleared, setIsChatCleared] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isFetching, setIsFetching] = useState(false); // Track if we're fetching older messages
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchUserId = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const response = await axios.get("http://localhost:5000/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const id = response.data.id || response.data._id;
      if (!id) throw new Error("User ID not found in response");

      setUserId(id);
      return id;
    } catch (err) {
      console.error("Failed to fetch user ID:", err);
      setError("Failed to load user data. Please log in again.");
      localStorage.removeItem("token");
      navigate("/login");
      return null;
    }
  };

  const fetchThreads = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/auth/chat/threads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setThreads(response.data);
      if (response.data.length > 0 && !otherUserId && !isChatCleared && initialOtherUserId) {
        const initialThread = response.data.find(thread => thread.userId === initialOtherUserId);
        if (initialThread) {
          setOtherUserId(initialThread.userId);
          setSelectedThread(initialThread);
        }
      }
    } catch (err) {
      console.error("Failed to fetch threads:", err);
      setError("Failed to load chat threads.");
    }
  };

  const fetchMessages = async (otherUserId, pageNum) => {
    if (!otherUserId) return [];
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/auth/chat/messages/${otherUserId}?page=${pageNum}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fetchedMessages = response.data;
      console.log(`Fetched messages for page ${pageNum}:`, fetchedMessages);
      setHasMoreMessages(fetchedMessages.length === 20);
      await axios.post(
        `http://localhost:5000/api/auth/chat/mark-read/${otherUserId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socket.emit("updateUnread", { senderId: otherUserId, receiverId: userId });
      return fetchedMessages;
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setError("Failed to load messages.");
      return [];
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMoreMessages || isFetching) return;
    setIsFetching(true);
    const nextPage = page + 1;
    const olderMessages = await fetchMessages(otherUserId, nextPage);
    if (olderMessages.length > 0) {
      const messageList = messageListRef.current;
      const previousHeight = messageList.scrollHeight;
      const previousScrollTop = messageList.scrollTop;

      setMessages(prevMessages => [...olderMessages, ...prevMessages]);
      setPage(nextPage);

      // Adjust scroll position
      setTimeout(() => {
        const newHeight = messageList.scrollHeight;
        messageList.scrollTop = previousScrollTop + (newHeight - previousHeight);
      }, 0);
    }
    setIsFetching(false);
  };

  useEffect(() => {
    const initialize = async () => {
      const id = await fetchUserId();
      if (!id) return;

      socket.auth = { userId: id };
      socket.connect();
      socket.emit("join", id);
      console.log("Socket connected, joined room:", id);

      socket.on("receiveMessage", async (message) => {
        console.log("Received message:", message);
        if (message.senderId._id === id) return;
        setMessages((prevMessages) => {
          const messageExists = prevMessages.some((msg) => msg._id === message._id);
          if (messageExists) return prevMessages;
          return [...prevMessages, message];
        });
        if (message.senderId._id === otherUserId) {
          await axios.post(
            `http://localhost:5000/api/auth/chat/mark-read/${message.senderId._id}`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          socket.emit("updateUnread", { senderId: message.senderId._id, receiverId: id });
        }
        fetchThreads();
      });

      socket.on("updateUnread", ({ senderId, unreadCount }) => {
        fetchThreads();
      });

      await fetchThreads();
      if (otherUserId && !isChatCleared) {
        const initialMessages = await fetchMessages(otherUserId, 1);
        setMessages(initialMessages);
        setPage(1);
        setHasMoreMessages(initialMessages.length === 20);
      }
      setLoading(false);
    };

    initialize();

    return () => {
      socket.off("receiveMessage");
      socket.off("updateUnread");
      socket.disconnect();
    };
  }, [otherUserId, navigate, isChatCleared]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll handler to detect when user scrolls to the top
  useEffect(() => {
    const messageList = messageListRef.current;
    const handleScroll = () => {
      if (messageList.scrollTop <= 10 && hasMoreMessages && !isFetching) {
        console.log("Reached top, loading more messages...");
        loadMoreMessages();
      }
    };

    messageList?.addEventListener("scroll", handleScroll);
    return () => messageList?.removeEventListener("scroll", handleScroll);
  }, [page, hasMoreMessages, otherUserId, isFetching]);

  // Escape key handler to exit the current chat
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && selectedThread) {
        setSelectedThread(null);
        setOtherUserId(null);
        setMessages([]);
        setIsChatCleared(true);
        setPage(1);
        setHasMoreMessages(true);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedThread]);

  const handleThreadClick = async (thread) => {
    setSelectedThread(thread);
    setOtherUserId(thread.userId);
    setIsChatCleared(false);
    const initialMessages = await fetchMessages(thread.userId, 1);
    setMessages(initialMessages);
    setPage(1);
    setHasMoreMessages(initialMessages.length === 20);
  };

  const handleThreadKeyDown = (e, thread) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleThreadClick(thread);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !otherUserId) return;
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/auth/chat/message",
        { receiverId: otherUserId, content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prevMessages) => {
        const messageExists = prevMessages.some((msg) => msg._id === response.data._id);
        if (messageExists) return prevMessages;
        return [...prevMessages, response.data];
      });
      socket.emit("updateUnread", { senderId: userId, receiverId: otherUserId });
      setNewMessage("");
      fetchThreads();
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
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
          background: linear-gradient(to bottom, rgba(20, 45, 60, 0.4), rgba(74, 114, 150, 0.2));
          background-size: cover;
          background-position: center;
        }
        .particle-overlay {
          background: radial-gradient(circle at 10% 90%, rgba(0, 207, 255, 0.2) 2px, transparent 2px),
                      radial-gradient(circle at 90% 20%, rgba(0, 207, 255, 0.2) 2px, transparent 2px),
                      radial-gradient(circle at 50% 50%, rgba(0, 207, 255, 0.15) 3px, transparent 2px);
          animation: particles 30s infinite linear;
        }
        .thread-item, .message {
          animation: fadeIn 0.5s ease-in-out;
        }
        .send-button {
          transition: background-color 0.3s, transform 0.2s;
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
        input:focus {
          outline: none;
          border: 1px solid #00cfff !important;
          box-shadow: 0 0 5px rgba(0, 207, 255, 0.3) !important;
        }
        ::-webkit-scrollbar {
          width: 6px;
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
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .chat-container {
            flex-direction: column;
          }
          .thread-list {
            width: 100%;
          }
          .chat-area {
            width: 100%;
          }
          .thread-list-hidden {
            display: none;
          }
          .chat-area-hidden {
            display: none;
          }
          .back-button {
            display: block !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Chats</h2>
        <button
          onClick={handleLogout}
          style={styles.logoutButton}
          title="Logout"
        >
          <FaSignOutAlt />
        </button>
      </div>

      <div style={styles.chatContainer}>
        {/* Thread List */}
        <div
          style={styles.threadList}
          className={selectedThread ? "thread-list thread-list-hidden" : "thread-list"}
        >
          {threads.length > 0 ? (
            threads.map((thread, index) => (
              <div
                key={thread.userId}
                style={{
                  ...styles.threadItem,
                  animationDelay: `${index * 0.1}s`,
                  backgroundColor:
                    selectedThread?.userId === thread.userId
                      ? "rgba(74, 114, 150, 0.3)"
                      : "rgba(20, 45, 60, 0.85)",
                }}
                className="thread-item"
                role="button"
                tabIndex={0}
                onClick={() => handleThreadClick(thread)}
                onKeyDown={(e) => handleThreadKeyDown(e, thread)}
              >
                <div style={styles.avatar}>
                  {thread.name.charAt(0).toUpperCase()}
                </div>
                <div style={styles.threadInfo}>
                  <div style={styles.threadHeader}>
                    <p style={styles.threadName}>{thread.name}</p>
                    <p style={styles.threadTimestamp}>
                      {new Date(thread.lastMessageTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p style={styles.threadLastMessage}>{thread.lastMessage}</p>
                </div>
                {thread.unreadCount > 0 && (
                  <span style={styles.unreadBadge}>{thread.unreadCount}</span>
                )}
              </div>
            ))
          ) : (
            <p style={styles.noThreads}>No conversations yet.</p>
          )}
        </div>

        {/* Chat Area */}
        <div
          style={styles.chatArea}
          className={selectedThread ? "chat-area" : "chat-area chat-area-hidden"}
        >
          {otherUserId && !isChatCleared ? (
            <>
              {/* Chat Header */}
              <div style={styles.chatHeader}>
                <button
                  style={styles.backButton}
                  onClick={() => {
                    setSelectedThread(null);
                    setOtherUserId(null);
                    setMessages([]);
                    setIsChatCleared(true);
                    setPage(1);
                    setHasMoreMessages(true);
                  }}
                >
                  <FaArrowLeft />
                </button>
                <h3 style={styles.chatTitle}>{selectedThread?.name}</h3>
              </div>

              {/* Messages */}
              <div style={styles.messageList} ref={messageListRef}>
                {messages.map((message, index) => {
                  const isCurrentUser = message.senderId._id === userId;
                  return (
                    <div
                      key={message._id}
                      style={{
                        ...styles.message,
                        ...(isCurrentUser ? styles.messageRight : styles.messageLeft),
                        animationDelay: `${index * 0.05}s`,
                      }}
                      className="message"
                    >
                      <p style={styles.messageContent}>{message.content}</p>
                      <p style={styles.timestamp}>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={styles.inputArea}>
                <FaPaperclip style={styles.attachIcon} />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message"
                  style={styles.input}
                />
                <button
                  onClick={handleSendMessage}
                  style={styles.sendButton}
                  className="send-button"
                >
                  <svg
                    viewBox="0 0 24 24"
                    height="24"
                    width="24"
                    fill="#fff"
                  >
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <p style={styles.noChat}>Select a conversation to start chatting.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    background: "linear-gradient(135deg, #1e3a5f 0%, #4a7296 50%, #6a9bc3 100%)",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    position: "relative",
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
    background: "linear-gradient(to right, #1e3a5f, #4a7296)",
    padding: "15px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "600",
    margin: 0,
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
  },
  logoutButton: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "1.2rem",
    cursor: "pointer",
    padding: "5px",
  },
  chatContainer: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
    zIndex: 3,
    height: "calc(100vh - 60px)", // Adjust for header height (15px padding top + bottom + 30px content)
  },
  threadList: {
    width: "30%",
    background: "rgba(20, 45, 60, 0.85)",
    overflowY: "auto",
    borderRight: "1px solid rgba(0, 207, 255, 0.2)",
    backdropFilter: "blur(10px)",
  },
  threadItem: {
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid rgba(0, 207, 255, 0.1)",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#00cfff",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "1.1rem",
    marginRight: "8px",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.3)",
  },
  threadInfo: {
    flex: 1,
    overflow: "hidden",
  },
  threadHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2px",
  },
  threadName: {
    fontWeight: "500",
    fontSize: "0.95rem",
    color: "#fff",
    margin: "0",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  threadTimestamp: {
    fontSize: "0.7rem",
    color: "#d0e1e9",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  threadLastMessage: {
    fontSize: "0.8rem",
    color: "#d0e1e9",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    margin: "0",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  unreadBadge: {
    backgroundColor: "#ff4d4f",
    color: "#fff",
    borderRadius: "10px",
    padding: "1px 5px",
    fontSize: "0.7rem",
    fontWeight: "bold",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
  },
  chatArea: {
    width: "70%",
    display: "flex",
    flexDirection: "column",
    background: "rgba(20, 45, 60, 0.85)",
    backdropFilter: "blur(10px)",
    position: "relative",
  },
  chatHeader: {
    background: "linear-gradient(to right, #1e3a5f, #4a7296)",
    padding: "10px 15px",
    display: "flex",
    alignItems: "center",
    color: "#fff",
    borderBottom: "1px solid rgba(0, 207, 255, 0.2)",
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "1.1rem",
    cursor: "pointer",
    marginRight: "8px",
    display: "none",
  },
  chatTitle: {
    fontSize: "1.1rem",
    fontWeight: "500",
    margin: 0,
    textShadow: "0 0 15px rgba(0, 207, 255, 0.6)",
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
    position: "relative",
    zIndex: 4,
    minHeight: "0", // Ensure it respects flex constraints
  },
  message: {
    marginBottom: "6px",
    padding: "6px 10px",
    borderRadius: "8px",
    maxWidth: "fit-content",
    minWidth: "80px",
    position: "relative",
    boxShadow: "0 1px 3px rgba(0, 207, 255, 0.2)",
    backdropFilter: "blur(8px)",
  },
  messageLeft: {
    background: "rgba(68, 98, 179, 0.9)",
    marginRight: "auto",
    borderTopLeftRadius: "0",
    border: "1px solid rgba(0, 207, 255, 0.2)",
  },
  messageRight: {
    background: "#4dd0e1",
    marginLeft: "auto",
    borderTopRightRadius: "0",
    border: "1px solid rgba(0, 207, 255, 0.4)",
  },
  messageContent: {
    fontSize: "0.9rem",
    margin: 0,
    color: "#fff",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  timestamp: {
    fontSize: "0.6rem",
    color: "#d0e1e9",
    marginTop: "2px",
    textAlign: "right",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  inputArea: {
    display: "flex",
    alignItems: "center",
    padding: "8px",
    background: "rgba(20, 45, 60, 0.85)",
    borderTop: "1px solid rgba(0, 207, 255, 0.2)",
    backdropFilter: "blur(10px)",
    position: "sticky",
    bottom: 0,
    zIndex: 5,
  },
  attachIcon: {
    fontSize: "1.3rem",
    color: "#d0e1e9",
    margin: "0 8px",
    cursor: "pointer",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  input: {
    flex: 1,
    padding: "8px",
    borderRadius: "18px",
    border: "1px solid rgba(0, 207, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    color: "#fff",
    fontSize: "0.9rem",
    fontFamily: "'Inter', sans-serif",
  },
  sendButton: {
    backgroundColor: "#00cfff",
    border: "none",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    margin: "0 8px",
  },
  error: {
    color: "#ff6b6b",
    textAlign: "center",
    padding: "20px",
    textShadow: "0 0 5px rgba(255, 107, 107, 0.3)",
  },
  noThreads: {
    fontStyle: "italic",
    color: "#d0e1e9",
    padding: "20px",
    textAlign: "center",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
  noChat: {
    textAlign: "center",
    color: "#d0e1e9",
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textShadow: "0 0 5px rgba(0, 207, 255, 0.2)",
  },
};

export default ChatWindow;