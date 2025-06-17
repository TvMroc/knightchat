import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "./Firebase";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
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
  likes?: string[];
  comments?: { user: string; text: string; createdAt: any }[];
  author?: string;
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
  const currentUid = auth.currentUser?.uid || "";
  const isSelf = !paramUid || paramUid === currentUid;
  const uid = paramUid || currentUid;
  const [friendStatus, setFriendStatus] = useState<"not_friends" | "request_sent" | "request_received" | "friends">("not_friends");

  const [privacy, setPrivacy] = useState(1);

  // 弹窗相关
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [detailMenuOpen, setDetailMenuOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // 评论用户昵称映射
  const [nicknameMap, setNicknameMap] = useState<{ [uid: string]: string }>({});

  const [profileData, setProfileData] = useState<any>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);

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
        setPrivacy(data.privacy ?? 1); // 读取隐私设置
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
      const posts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Post, "id">),
      }));
      setMyPosts(posts);

      // 收集所有评论用户uid
      const commentUids = Array.from(
        new Set(
          posts.flatMap(post =>
            (post.comments || []).map(c => c.user)
          )
        )
      );
      // 查询所有评论用户的nickname
      if (commentUids.length > 0) {
        const usersSnap = await getDocs(collection(db, "users"));
        const map: { [uid: string]: string } = {};
        usersSnap.forEach(userDoc => {
          if (commentUids.includes(userDoc.id)) {
            map[userDoc.id] = userDoc.data().nickname || userDoc.id;
          }
        });
        setNicknameMap(map);
      }
    };
    fetchMyPosts();
  }, [uid]);

  useEffect(() => {
  if (isSelf || !currentUid || !paramUid) {
    setFriendStatus("not_friends");
    return;
  }

  const checkFriendStatus = async () => {
    const currentDoc = await getDoc(doc(db, "users", currentUid));
    const targetDoc = await getDoc(doc(db, "users", paramUid));
    if (!currentDoc.exists() || !targetDoc.exists()) return;

    const currentData = currentDoc.data();
    const targetData = targetDoc.data();

    const currentFriends = currentData.friends || [];
    const sent = currentData.friendRequestsSent || [];
    const received = currentData.friendRequestsReceived || [];

    if (currentFriends.includes(paramUid)) {
      setFriendStatus("friends");
    } else if (sent.includes(paramUid)) {
      setFriendStatus("request_sent");
    } else if (received.includes(paramUid)) {
      setFriendStatus("request_received");
    } else {
      setFriendStatus("not_friends");
    }
  };

  checkFriendStatus();
}, [currentUid, paramUid, isSelf]);


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

  const uploadImageToSupabase = async (file: File, uid: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${uid}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("post-images")
      .upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
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
      privacy, // 保存隐私设置
    });
    setNickname(newNickname);
    setBio(newBio);
    setAvatarUrl(avatarDownloadUrl);
    setEditMode(false);
    setSaving(false);
  };

  const handleAddFriend = async () => {
  if (!currentUid || !paramUid) return;

  await updateDoc(doc(db, "users", currentUid), {
    friendRequestsSent: arrayUnion(paramUid),
  });

  await updateDoc(doc(db, "users", paramUid), {
    friendRequestsReceived: arrayUnion(currentUid),
  });

  setFriendStatus("request_sent");
};

const handleAcceptFriend = async () => {
  if (!currentUid || !paramUid) return;

  await updateDoc(doc(db, "users", currentUid), {
    friends: arrayUnion(paramUid),
    friendRequestsReceived: arrayRemove(paramUid),
  });

  await updateDoc(doc(db, "users", paramUid), {
    friends: arrayUnion(currentUid),
    friendRequestsSent: arrayRemove(currentUid),
  });

  setFriendStatus("friends");
};

const handleRemoveFriend = async () => {
  if (!currentUid || !paramUid) return;

  await updateDoc(doc(db, "users", currentUid), {
    friends: arrayRemove(paramUid),
  });

  await updateDoc(doc(db, "users", paramUid), {
    friends: arrayRemove(currentUid),
  });

  setFriendStatus("not_friends");
};



  const handleChat = () => {
    if (paramUid) navigate(`/chat/${paramUid}`);
  };

  // 隐私判断
  let canShowDetail = true;
  if (!isSelf) {
    if (privacy === 3) {
      canShowDetail = false;
    } else if (privacy === 2 && !(friendStatus == 'friends')) {
      canShowDetail = false;
    }
  }

  // 详情弹窗相关
  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setDetailMenuOpen(false);
    setEditing(false);
    setEditContent(post.content);
    setEditImagePreview(post.imageUrl || null);
    setEditImage(null);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditImage(e.target.files[0]);
      setEditImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedPost) return;
    let imageUrl = selectedPost.imageUrl;
    if (editImage) {
      imageUrl = await uploadImageToSupabase(editImage, currentUid!);
    }
    await updateDoc(doc(db, "posts", selectedPost.id), {
      content: editContent,
      imageUrl: imageUrl || "",
    });
    setEditing(false);
    setSelectedPost(null);
    // 刷新
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

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    await deleteDoc(doc(db, "posts", selectedPost.id)); // 真正删除
    setSelectedPost(null);
    // 刷新
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
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;

      // 获取当前用户的 blockedUsers 列表
      if (currentUid) {
        const currentUserDoc = await getDoc(doc(db, "users", currentUid));
        if (currentUserDoc.exists()) {
          const data = currentUserDoc.data();
          const blocked = data.blockedUsers || [];
          setBlockedUsers(blocked);
        }
      }

      // 获取访问用户资料
      const profileDoc = await getDoc(doc(db, "users", uid));
      if (!profileDoc.exists()) {
        setProfileData(null);
        return;
      }
      const profile = profileDoc.data();

      // 被访问用户是否block了当前用户（双向block考虑）
      const profileBlockedUsers: string[] = profile.blockedUsers || [];

      if (profileBlockedUsers.includes(currentUid) || blockedUsers.includes(uid)) {
        setIsBlocked(true);
        setProfileData(null);
        return;
      }

      setIsBlocked(false);
      setProfileData(profile);
    };

    fetchProfile();
  }, [uid, currentUid, blockedUsers]);


  const handleBlock = async () => {
    if (!currentUid || !uid) return;
    const userRef = doc(db, "users", currentUid);
    await updateDoc(userRef, {
      blockedUsers: arrayUnion(uid),
    });
    setBlockedUsers((prev) => [...prev, uid]);
  };

  const handleUnblock = async () => {
    if (!currentUid || !uid) return;
    const userRef = doc(db, "users", currentUid);
    await updateDoc(userRef, {
      blockedUsers: arrayRemove(uid),
    });
    setBlockedUsers((prev) => prev.filter((id) => id !== uid));
  };

  if (isBlocked) {
    return (
      <div>
        <p>You cannot view this profile because you are blocked or have blocked this user.</p>
        {blockedUsers.includes(uid) && (
          <button onClick={handleUnblock}>Unblock</button>
        )}
      </div>
    );
  }

  if (!profileData) {
    return <div>Loading...</div>;
  }

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
            <div style={{ margin: "1em 0" }}>
              <label className="profile-privacy-select-label">
                <b>Privacy Settings:</b>
                <select
                  className="profile-privacy-select"
                  value={privacy}
                  onChange={e => setPrivacy(Number(e.target.value))}
                  style={{ marginLeft: 8 }}
                >
                  <option value={1}>Visible to everyone</option>
                  <option value={2}>Visible only to friends</option>
                  <option value={3}>Invisible to everyone</option>
                </select>
              </label>
            </div>
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
            <h2 className="profile-nickname">{nickname}</h2>
            {/* 只有允许时才显示详细资料 */}
            {canShowDetail && (
              <>
                <div className="profile-email">{email}</div>
                <div className="profile-joined">{createdAt}</div>
                <div className="profile-bio">{bio}</div>
              </>
            )}
            {isSelf ? (
              <>
                <button className="profile-btn" onClick={() => setEditMode(true)}>
                  Edit Profile
                </button>
                <button className="profile-btn profile-btn-cancel" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <div style={{ display: "flex", gap: "1em" }}>
                <button className="profile-btn" onClick={handleChat}>
                  Chat
                </button>
                {friendStatus === "friends" && (
                  <button className="profile-btn profile-btn-cancel" onClick={handleRemoveFriend}>
                    Remove Friend
                  </button>
                )}
                {friendStatus === "not_friends" && (
                  <button className="profile-btn" onClick={handleAddFriend}>
                    Add Friend
                  </button>
                )}
                {friendStatus === "request_sent" && (
                  <button className="profile-btn" disabled>
                    Request Sent
                  </button>
                )}
                {friendStatus === "request_received" && (
                  <button className="profile-btn" onClick={handleAcceptFriend}>
                    Accept Friend
                  </button>)}
                {blockedUsers.includes(uid) ? (
                  <button onClick={handleUnblock}>Unblock</button>
                ) : (
                  <button onClick={handleBlock}>Block</button>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {/* 右侧动态 */}
      <div className="profile-posts-section">
        {canShowDetail ? (
          <div className="profile-posts-grid">
            {myPosts.length === 0 && <div style={{ color: "#888" }}>No posts yet.</div>}
            {myPosts.map(post => (
              <div
                key={post.id}
                className="profile-posts-grid-item"
                style={{ cursor: "pointer" }}
                onClick={() => handlePostClick(post)}
              >
                {post.imageUrl ? (
                  <img src={post.imageUrl} alt="post" className="profile-posts-grid-img"/>
                ) : (
                  <div className="profile-post-content only-text">{post.content}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: "#888", textAlign: "center", marginTop: "3em" }}>
            <b>Profile is not public</b>
          </div>
        )}
      </div>
      {/* Post 详情弹窗 */}
      {selectedPost && (
        <div className="profile-post-modal-mask" onClick={() => setSelectedPost(null)}>
          <div
            className="profile-post-modal-content"
            onClick={e => e.stopPropagation()}
          >
            {/* 三个点菜单，仅自己可见 */}
            {selectedPost.author === currentUid && !editing && (
              <button
                className="profile-post-modal-menu-btn"
                onClick={() => setDetailMenuOpen(v => !v)}
              >⋯</button>
            )}
            {selectedPost.author === currentUid && !editing && detailMenuOpen && (
              <div className="profile-post-modal-menu-dropdown">
                <div
                  onClick={() => { setEditing(true); setDetailMenuOpen(false); }}
                >Edit</div>
                <div
                  className="danger"
                  onClick={handleDeletePost}
                >Delete</div>
              </div>
            )}
            {/* 编辑模式 */}
            {editing ? (
              <>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={4}
                  className="profile-post-modal-edit-textarea"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageChange}
                />
                {editImagePreview && (
                  <div style={{ margin: "1em 0" }}>
                    <img src={editImagePreview} alt="preview" style={{ maxWidth: 200, borderRadius: 8 }} />
                  </div>
                )}
                <div className="profile-post-modal-actions">
                  <button className="profile-btn" onClick={handleSaveEdit}>Save</button>
                  <button className="profile-btn profile-btn-cancel" style={{ marginLeft: 8 }} onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                {selectedPost.imageUrl && (
                  <div style={{ marginBottom: 16 }}>
                    <img src={selectedPost.imageUrl} alt="post" className="profile-posts-grid-img" style={{ maxWidth: "100%", borderRadius: 8 }} />
                  </div>
                )}
                <div className="profile-post-modal-maintext">{selectedPost.content}</div>
                <div style={{ color: "#888", fontSize: "0.95em", marginBottom: 8 }}>
                  Upload time:{selectedPost.createdAt?.toDate?.().toLocaleString?.() || ""}
                </div>
                <div style={{ marginBottom: 8 }}>
                  👍 {selectedPost.likes?.length || 0}
                </div>
                <div>
                  <b>Comments:</b>
                  {selectedPost.comments && selectedPost.comments.length > 0 ? (
                    selectedPost.comments.map((c, idx) => (
                      <div key={idx} className="profile-post-modal-comment">
                        <b>{nicknameMap[c.user] || c.user}:</b> {c.text}
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#aaa" }}>No comments</div>
                  )}
                </div>
              </>
            )}
            <button
              className="profile-post-modal-close"
              onClick={() => setSelectedPost(null)}
            >Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;