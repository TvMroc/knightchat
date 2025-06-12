import React, { useEffect, useState, useRef } from "react";
import { db } from "./Firebase";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
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
  const { uid: paramUid } = useParams();
  const currentUid = localStorage.getItem("knightchat_user_uid");
  const isSelf = !paramUid || paramUid === currentUid;
  const uid = paramUid || currentUid;

  useEffect(() => {
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
  }, [uid, navigate]);

  useEffect(() => {
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
  }, [uid]);

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
    <div className="profile-layout">
      {/* 左侧资料 */}
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
            {isSelf && (
              <>
                <button className="profile-btn" onClick={() => setEditMode(true)}>
                  Edit Profile
                </button>
                <button className="profile-btn profile-btn-cancel" onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}
          </>
        )}
      </div>
      {/* 右侧动态 */}
      <div className="profile-posts-section">
        <div className="profile-posts-grid">
          {myPosts.length === 0 && <div style={{ color: "#888" }}>No posts yet.</div>}
          {myPosts.map(post => (
            <div key={post.id} className="profile-posts-grid-item">
              {post.imageUrl ? (
                <img src={post.imageUrl} alt="post" />
              ) : (
                <div className="profile-post-content only-text">{post.content}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;