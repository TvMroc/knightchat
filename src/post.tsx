import React, { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { db } from "./Firebase";
import { collection, addDoc, getDocs, orderBy, query, Timestamp, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import "./post.css";

// 初始化 Supabase
const supabase = createClient(
  "https://pncpxnxhapaahhqrvult.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuY3B4bnhoYXBhYWhocXJ2dWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDc3NDMsImV4cCI6MjA2NTIyMzc0M30.KmsH6qLMGwPPqQgsSxUalsCzfyVFKfliezfDspJFfVE"
);

interface Comment {
  user: string; // 存储uid
  text: string;
  createdAt: Timestamp;
}
interface Post {
  id: string;
  author: string; // 存储uid
  content: string;
  createdAt: Timestamp;
  imageUrl?: string;
  likes?: string[];
  comments?: Comment[];
  nickname?: string;
  avatarUrl?: string; 

}

const PostPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<{ [key: string]: string }>({});
  const [nicknameMap, setNicknameMap] = useState<{ [uid: string]: { nickname: string; avatarUrl?: string } }>({});

  // 获取所有用到的uid（作者和评论者），并查nickname
  const fetchNicknames = async (uids: string[]) => {
    const map: { [uid: string]: { nickname: string; avatarUrl?: string } } = {};
    const usersSnapshot = await getDocs(collection(db, "users"));
    usersSnapshot.forEach(userDoc => {
      const data = userDoc.data();
      if (uids.includes(userDoc.id)) {
        map[userDoc.id] = {
        nickname: data.nickname || userDoc.id,
        avatarUrl: data.avatarUrl || "",
      };
      }
    });
    return map;
  };

  const fetchPosts = async () => {
    setLoading(true);
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const postArr = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Post, "id">),
      likes: doc.data().likes || [],
      comments: doc.data().comments || [],
    }));
    // 收集所有用到的uid（作者和评论者）
    const authorUids = postArr.map(p => p.author);
    const commentUids = postArr.flatMap(p => (p.comments || []).map((c: {user: string}) => c.user));
    const allUids = Array.from(new Set([...authorUids, ...commentUids]));
    // 获取nickname映射
    const map = await fetchNicknames(allUids);
    setNicknameMap(map);
    // 给每个post加nickname字段
    setPosts(postArr.map(p => ({
      ...p,
      nickname: map[p.author]?.nickname || p.author,
      avatarUrl: map[p.author]?.avatarUrl || "",
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0])); // 预览
    }
  };

  // 上传图片到 Supabase
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

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) return;
    const author = localStorage.getItem("knightchat_user_uid") || "Anonymous";
    let imageUrl = "";
    if (image) {
      imageUrl = await uploadImageToSupabase(image, author);
    }
    await addDoc(collection(db, "posts"), {
      author,
      content,
      createdAt: Timestamp.now(),
      imageUrl,
      likes: [],
      comments: [],
    });
    setContent("");
    setImage(null);
    setImagePreview(null);
    fetchPosts();
  };

  const handleLike = async (postId: string, likes: string[]) => {
    const user = localStorage.getItem("knightchat_user_uid") || "Anonymous";
    const postRef = doc(db, "posts", postId);
    if (likes.includes(user)) {
      await updateDoc(postRef, {
        likes: arrayRemove(user),
      });
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(user),
      });
    }
    fetchPosts();
  };

  const handleComment = async (postId: string) => {
    const user = localStorage.getItem("knightchat_user_uid") || "Anonymous";
    const text = commentInput[postId];
    if (!text) return;
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      comments: arrayUnion({
        user,
        text,
        createdAt: Timestamp.now(),
      }),
    });
    setCommentInput((prev) => ({ ...prev, [postId]: "" }));
    fetchPosts();
  };

  const navigate = useNavigate();


  return (
    <div className="post-page">
      <h2>Share your thoughts</h2>
      <form className="post-form" onSubmit={handlePost}>
        <textarea
          className="post-input"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <input type="file" accept="image/*" onChange={handleImageChange} />
        {imagePreview && (
          <div style={{ margin: "1em 0" }}>
            <img src={imagePreview} alt="preview" style={{ maxWidth: 200, borderRadius: 8 }} />
          </div>
        )}
        <button type="submit" className="post-btn">
          Post
        </button>
      </form>
      <div className="post-list">
        {loading && <div>Loading...</div>}
        {posts.map((post) => (
          <div className="post-item" key={post.id}>
            <div className="post-author">
              {post.avatarUrl ? (
                <img
                  src={post.avatarUrl}
                  alt="avatar"
                  className="post-avatar"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    objectFit: "cover",
                    marginRight: 8,
                    verticalAlign: "middle",
                    cursor: "pointer"
                  }}
                  onClick={() => navigate(`/profile/${post.author}`)}
                />
              ) : (
                <span className="post-avatar" style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#aa7a2f",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  marginRight: 8,
                  verticalAlign: "middle",
                  cursor: "pointer"
                }}
                onClick={() => navigate(`/profile/${post.author}`)}
                >
                  {(post.nickname || post.author).charAt(0).toUpperCase()}
                </span>
              )}
              <span
                style={{ cursor: "pointer", fontWeight: "bold" }}
                onClick={() => navigate(`/profile/${post.author}`)}
              >{post.nickname || post.author}</span>
              <span className="post-time">
                {post.createdAt.toDate().toLocaleString()}
              </span>
            </div>
            <div className="post-content">{post.content}</div>
            {post.imageUrl && (
              <div style={{ margin: "1em 0" }}>
                <img src={post.imageUrl} alt="post" style={{ maxWidth: "100%", borderRadius: "8px" }} />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "1em" }}>
              <button
                className="post-btn"
                style={{ padding: "0.3em 1em", fontSize: "0.95em" }}
                onClick={() => handleLike(post.id, post.likes || [])}
              >
                {post.likes?.includes(localStorage.getItem("knightchat_user_uid") || "Anonymous")
                  ? "👍"
                  : "👍"} {post.likes?.length || 0}
              </button>
            </div>
            <div className="post-comments">
              <div className="post-comments-text">
                {post.comments?.map((c, idx) => (
                  <div key={idx} style={{ margin: "0.5em 0", fontSize: "0.98em" }}>
                    <b>
                      {(nicknameMap[c.user]?.nickname || c.user)}:
                    </b> {c.text}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5em", marginTop: "0.5em" }}>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentInput[post.id] || ""}
                  onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                  style={{ flex: 1, borderRadius: 6, border: "1px solid #ccc", padding: "0.4em" }}
                />
                <button
                  className="post-btn"
                  style={{ padding: "0.3em 1em", fontSize: "0.95em" }}
                  onClick={() => handleComment(post.id)}
                  type="button"
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostPage;