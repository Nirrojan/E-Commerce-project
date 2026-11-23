
import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from "react";

const AuthContext = createContext(null);

const API_URL = "http://127.0.0.1:5000/api/auth";

const TOKEN_KEY = "bb_access_token";
const CURRENT_KEY = "bb_current_user";


function formatUser(user) {

  if (!user) return null;

  return {
    ...user,

    // This is now a Base64 image data URL from MySQL.
    picture: user.picture || ""
  };
}


export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {

    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) return null;

    try {
      return JSON.parse(
        localStorage.getItem(CURRENT_KEY) || "null"
      );
    } catch {
      return null;
    }
  });


  const [authLoading, setAuthLoading] = useState(true);


  // ==========================================
  // LOAD PROFILE WHEN PAGE REFRESHES
  // ==========================================

  useEffect(() => {

    async function loadProfile() {

      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      try {

        const data = await apiRequest("/me", "GET");

        setUser(formatUser(data.user));

      } catch (error) {

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(CURRENT_KEY);

        setUser(null);

      } finally {

        setAuthLoading(false);

      }
    }

    loadProfile();

  }, []);


  // ==========================================
  // SAVE USER IN LOCAL STORAGE
  // ==========================================

  useEffect(() => {

    if (user) {

      localStorage.setItem(
        CURRENT_KEY,
        JSON.stringify(user)
      );

    } else {

      localStorage.removeItem(CURRENT_KEY);

    }

  }, [user]);


  // ==========================================
  // JSON API REQUEST
  // ==========================================

  async function apiRequest(endpoint, method, body = null) {

    const token = localStorage.getItem(TOKEN_KEY);

    const headers = {};

    if (body !== null) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : null
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Something went wrong."
      );
    }

    return data;
  }


  // ==========================================
  // IMAGE UPLOAD REQUEST
  // ==========================================

  async function uploadRequest(endpoint, formData) {

    const token = localStorage.getItem(TOKEN_KEY);

    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Image upload failed."
      );
    }

    return data;
  }


  // ==========================================
  // REGISTER
  // ==========================================

  async function register({ name, email, password }) {

    const data = await apiRequest("/register", "POST", {
      name,
      email,
      password
    });

    localStorage.setItem(TOKEN_KEY, data.access_token);

    const newUser = formatUser(data.user);

    setUser(newUser);

    return newUser;
  }


  // ==========================================
  // LOGIN
  // ==========================================

  async function login(email, password) {

    const data = await apiRequest("/login", "POST", {
      email,
      password
    });

    localStorage.setItem(TOKEN_KEY, data.access_token);

    const loggedInUser = formatUser(data.user);

    setUser(loggedInUser);

    return loggedInUser;
  }


  // ==========================================
  // LOGOUT
  // ==========================================

  function logout() {

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_KEY);

    setUser(null);
  }


  // ==========================================
  // UPDATE PROFILE NAME
  // ==========================================

  async function updateProfile(updates) {

    const data = await apiRequest("/profile", "PUT", {
      name: updates.name
    });

    const updatedUser = formatUser(data.user);

    setUser(updatedUser);

    return updatedUser;
  }


  // ==========================================
  // UPLOAD PROFILE PICTURE
  // ==========================================

  async function uploadProfilePicture(file) {

    const formData = new FormData();

    formData.append("picture", file);

    const data = await uploadRequest(
      "/profile-picture",
      formData
    );

    const updatedUser = formatUser(data.user);

    setUser(updatedUser);

    return updatedUser;
  }


  // ==========================================
  // CHANGE PASSWORD
  // ==========================================

  async function changePassword(currentPassword, newPassword) {

    const data = await apiRequest(
      "/change-password",
      "POST",
      {
        current_password: currentPassword,
        new_password: newPassword
      }
    );

    return data;
  }


  return (

    <AuthContext.Provider
      value={{
        user,
        authLoading,
        register,
        login,
        logout,
        updateProfile,
        uploadProfilePicture,
        changePassword
      }}
    >

      {children}

    </AuthContext.Provider>

  );

}


export const useAuth = () => useContext(AuthContext);
