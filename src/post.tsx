import React, { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { db } from "./Firebase";
import { collection, addDoc, getDocs, orderBy, query, Timestamp, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./post.css";

interface Comment {
  user: string;
  text: string;
  createdAt: Timestamp;
}
interface Post {
  id: string;
  author: string;
  content: string;
  createdAt: Timestamp;
  imageUrl?: string;
  likes?: string[];
  comments?: Comment[];
}

const storage = getStorage();

const PostPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [commentInput, setCommentInput] = useState<{ [key: string]: string }>({});

  const fetchPosts = async () => {
    setLoading(true);
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    setPosts(
      snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Post, "id">),
        likes: doc.data().likes || [],
        comments: doc.data().comments || [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) return;
    const author = localStorage.getItem("knightchat_user") || "Anonymous";
    let imageUrl = "";
    if (image) {
      const storageRef = ref(storage, `post-images/${Date.now()}_${image.name}`);
      await uploadBytes(storageRef, image);
      imageUrl = await getDownloadURL(storageRef);
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
    fetchPosts();
  };

  const handleLike = async (postId: string, likes: string[]) => {
    const user = localStorage.getItem("knightchat_user") || "Anonymous";
    if (likes.includes(user)) return;
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      likes: arrayUnion(user),
    });
    fetchPosts();
  };

  const handleComment = async (postId: string) => {
    const user = localStorage.getItem("knightchat_user") || "Anonymous";
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
        <button type="submit" className="post-btn">
          Post
        </button>
      </form>
      <div className="post-list">
        {loading && <div>Loading...</div>}
        {posts.map((post) => (
          <div className="post-item" key={post.id}>
            <div className="post-author">
              <span className="post-avatar">{post.author.charAt(0).toUpperCase()}</span>
              <span>{post.author}</span>
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
                disabled={post.likes?.includes(localStorage.getItem("knightchat_user") || "Anonymous")}
              >
                👍 {post.likes?.length || 0}
              </button>
            </div>
            <div className="post-comments">
              <div className="post-comments-text">
                {post.comments?.map((c, idx) => (
                  <div key={idx} style={{ margin: "0.5em 0", fontSize: "0.98em" }}>
                    <b>{c.user}:</b> {c.text}
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