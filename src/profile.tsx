import React, { useEffect, useState } from "react";
import { db } from "./Firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./App.css";

const Profile: React.FC = () => {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const uid = localStorage.getItem("knightchat_user_uid");
    if (!uid) {
      navigate("/login");
      return;
    }
    const fetchProfile = async () => {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setNickname(data.nickname || "");
        setEmail(data.email || "");
        setCreatedAt(data.createdAt?.toDate().toLocaleString() || "");
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("knightchat_user_uid");
    localStorage.removeItem("knightchat_user");
    navigate("/login");
  };

  return (
    <div className="profile-container" style={{ maxWidth: 400, margin: "2em auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 16px rgba(0,0,0,0.08)", padding: "2em" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1em" }}>
        <div className="avatar" style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#aa7a2f",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2em",
          fontWeight: "bold"
        }}>
          {nickname ? nickname.charAt(0).toUpperCase() : "?"}
        </div>
        <h2>{nickname}</h2>
        <div style={{ color: "#555" }}>{email}</div>
        <div style={{ color: "#888", fontSize: "0.95em" }}>Joined: {createdAt}</div>
        <button
          className="login-submit"
          style={{ marginTop: "1.5em", width: "100%" }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;