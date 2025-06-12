import React, { useEffect, useState, useRef } from "react";
import { db } from "./Firebase";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "./profile.css";

const supabase = createClient(
  "https://pncpxnxhapaahhqrvult.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuY3B4bnhoYXBhYWhocXJ2dWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDc3NDMsImV4cCI6MjA2NTIyMzc0M30.KmsH6qLMGwPPqQgsSxUalsCzfyVFKfliezfDspJFfVE"
);

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: any;
}

const Profile: React.FC = () => {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setBio(data.bio || "");
        setAvatarUrl(data.avatarUrl || "");
        setNewNickname(data.nickname || "");
        setNewBio(data.bio || "");
      }
    };
    fetchProfile();
  }, [navigate]);

  useEffect(() => {
    const uid = localStorage.getItem("knightchat_user_uid");
    if (!uid) return;
    const fetchMyPosts = async () => {
      const q = query(
        collection(db, "posts"),
        where("author", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setMyPosts(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Post, "id">),
        }))
      );
    };
    fetchMyPosts();
  }, []); // 依赖项改为 []

  const handleLogout = () => {
    localStorage.removeItem("knightchat_user_uid");
    localStorage.removeItem("knightchat_user");
    navigate("/login");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewAvatar(e.target.files[0]);
      setAvatarUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const uploadAvatar = async (file: File, uid: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${uid}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    const uid = localStorage.getItem("knightchat_user_uid");
    if (!uid) return;
    let avatarDownloadUrl = avatarUrl;
    if (newAvatar) {
      avatarDownloadUrl = await uploadAvatar(newAvatar, uid);
    }
    await updateDoc(doc(db, "users", uid), {
      nickname: newNickname,
      bio: newBio,
      avatarUrl: avatarDownloadUrl,
    });
    setNickname(newNickname);
    setBio(newBio);
    setAvatarUrl(avatarDownloadUrl);
    setEditMode(false);
    setSaving(false);
  };

  return (
    <div className="profile-container">
      <div className="profile-main">
        <div
          className="avatar"
          onClick={() => editMode && fileInputRef.current?.click()}
          title={editMode ? "Click to change avatar" : ""}
          style={{ cursor: editMode ? "pointer" : "default" }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="round-image"/>
          ) : (
            nickname ? nickname.charAt(0).toUpperCase() : "?"
          )}
          {editMode && (
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          )}
        </div>
        {editMode ? (
          <>
            <input
              type="text"
              className="profile-nickname-input"
              value={newNickname}
              onChange={e => setNewNickname(e.target.value)}
              placeholder="Nickname"
              maxLength={20}
            />
            <textarea
              className="profile-bio-input"
              value={newBio}
              onChange={e => setNewBio(e.target.value)}
              placeholder="Bio"
              maxLength={100}
            />
            <button
              className="profile-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="profile-btn profile-btn-cancel"
              onClick={() => setEditMode(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2>{nickname}</h2>
            <div className="profile-email">{email}</div>
            <div className="profile-joined">Joined: {createdAt}</div>
            <div className="profile-bio">{bio}</div>
            <button
              className="profile-btn"
              onClick={() => setEditMode(true)}
            >
              Edit Profile
            </button>
            <button
              className="profile-btn profile-btn-cancel"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        )}
      </div>
      {/* 个人动态 */}
      <div style={{ width: "100%", marginTop: "2em" }}>
        <h3 style={{ marginBottom: "1em" }}>My Posts</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5em" }}>
          {myPosts.length === 0 && <div style={{ color: "#888" }}>No posts yet.</div>}
          {myPosts.map(post => (
            <div key={post.id} style={{ width: 220, background: "#faf8f5", borderRadius: 8, padding: "1em" }}>
              {post.imageUrl && (
                <img src={post.imageUrl} alt="post" style={{ width: "100%", borderRadius: 6, marginBottom: 8 }} />
              )}
              <div style={{ fontSize: "1em", marginBottom: 6 }}>{post.content}</div>
              <div style={{ color: "#aaa", fontSize: "0.95em" }}>
                {post.createdAt?.toDate?.().toLocaleString?.() || ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;