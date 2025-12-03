import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext";
import { io } from "socket.io-client";


// const backendUrl = import.meta.env.VITE_BACKEND_URL;
// axios.defaults.baseURL = backendUrl;

export const AuthProvider = ({ children }) => {
  
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
axios.defaults.baseURL = backendUrl;

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Check if the user is authenticate and if so, set the user data and connect the socket

  const checkAuth = async () => {
    try {
      const { data } = await axios.get("/api/auth/check");
      if (data.success) {
        setAuthUser(data.user);
        connectSocket(data.user);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Login function to handle user authentication and socket connection

  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(`/api/auth/${state}`, credentials);
      if (data.success) {
        setAuthUser(data.userData);
        connectSocket(data.userData);
        axios.defaults.headers.common["token"] = data.token;
        setToken(data.token);
        localStorage.setItem("token", data.token);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Loout function to handle user logout and socket disconnection
  
  const logout = async () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    axios.defaults.headers.common["token"] = null;
    toast.success("Logged out successfully");
    if (socket) socket.disconnect(); 
  };

  // Update profile function to handle user profile updates

  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Connect socket function to handle socket connection and online user updates
  const connectSocket = (userData) => {
    if (!userData || socket?.connected) return;

    const newSocket = io(backendUrl, {
      query: { userId: userData._id },
    });

    newSocket.connect();
    setSocket(newSocket);

    newSocket.on("getOnlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["token"] = token;
    }
    checkAuth();
  }, []); 


  // after authUser state is set / available — example useEffect:
useEffect(() => {
  if (!authUser) return;

  const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", {
    query: { userId: authUser._id },
    transports: ["websocket", "polling"],
  });

  setSocket(socket);

  // Inform server user is online (server listens for handshake query + emits)
  socket.emit("user-online", authUser._id);

  // Listen for online users list
  socket.on("online-users", (list) => {
    setOnlineUsers(Array.isArray(list) ? list : []);
  });

  // Listen for incoming messages (server emits 'new-message')
  socket.on("new-message", (msg) => {
    // handle incoming message: e.g., setMessages or increase unseen count
    console.log("Received new message via socket:", msg);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err);
  });

  return () => {
    socket.disconnect();
    setSocket(null);
    setOnlineUsers([]);
  };
}, [authUser]);


  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  );
};


// import { useEffect, useState } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";
// import { io } from "socket.io-client";
// import { AuthContext } from "./AuthContext.jsx"


// export const AuthProvider = ({ children }) => {
//   const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
//   axios.defaults.baseURL = backendUrl;

//   const [token, setToken] = useState(localStorage.getItem("token"));
//   const [authUser, setAuthUser] = useState(null);
//   const [onlineUsers, setOnlineUsers] = useState([]);
//   const [socket, setSocket] = useState(null);

//   // ✅ Check user authentication
//   const checkAuth = async () => {
//     try {
//       const { data } = await axios.get("/api/auth/check");
//       if (data.success) {
//         setAuthUser(data.user);
//       }
//     } catch (error) {
//       console.error("Auth check failed:", error.message);
//     }
//   };

//   // ✅ Login
//   const login = async (state, credentials) => {
//     try {
//       const { data } = await axios.post(`/api/auth/${state}`, credentials);
//       if (data.success) {
//         setAuthUser(data.userData);
//         axios.defaults.headers.common["token"] = data.token;
//         setToken(data.token);
//         localStorage.setItem("token", data.token);
//         toast.success(data.message);
//       } else {
//         toast.error(data.message);
//       }
//     } catch (error) {
//       toast.error(error.message);
//     }
//   };

//   // ✅ Logout
//   const logout = async () => {
//     localStorage.removeItem("token");
//     setToken(null);
//     setAuthUser(null);
//     setOnlineUsers([]);
//     axios.defaults.headers.common["token"] = null;
//     if (socket) socket.disconnect();
//     setSocket(null);
//     toast.success("Logged out successfully");
//   };

//   // ✅ Update profile
//   const updateProfile = async (body) => {
//     try {
//       const { data } = await axios.put("/api/auth/update-profile", body);
//       if (data.success) {
//         setAuthUser(data.user);
//         toast.success("Profile updated successfully");
//       }
//     } catch (error) {
//       toast.error(error.message);
//     }
//   };

//   // ✅ Setup Axios token header
//   useEffect(() => {
//     if (token) {
//       axios.defaults.headers.common["token"] = token;
//       checkAuth();
//     }
//   }, [token]);

//   // ✅ Setup Socket connection when user is authenticated
//   useEffect(() => {
//     if (!authUser) return;

//     const newSocket = io(backendUrl, {
//       query: { userId: authUser._id },
//       transports: ["websocket", "polling"],
//     });

//     setSocket(newSocket);

//     // Listen for online users
//     newSocket.on("getOnlineUsers", (userIds) => {
//       setOnlineUsers(userIds);
//     });

//     // Listen for new messages
//     newSocket.on("new-message", (msg) => {
//       console.log("📩 New message received:", msg);
//       toast.success(`New message from ${msg.senderId}`);
//     });

//     // Connection errors
//     newSocket.on("connect_error", (err) => {
//       console.error("Socket connection error:", err.message);
//     });

//     // Cleanup when user logs out or unmounts
//     return () => {
//       newSocket.disconnect();
//       setSocket(null);
//       setOnlineUsers([]);
//     };
//   }, [authUser]);

//   // ✅ Provide all values
//   const value = {
//     axios,
//     authUser,
//     onlineUsers,
//     socket,
//     login,
//     logout,
//     updateProfile,
//   };

//   return (
//     <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
//   );
// };
