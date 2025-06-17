import React, { useEffect, useState } from "react";
import { db } from "./Firebase";
import { collection, addDoc, getDocs, orderBy, query, Timestamp, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import "./post.css";

const supabase = createClient(
  "https://pncpxnxhapaahhqrvult.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuY3B4bnhoYXBhYWhocXJ2dWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NDc3NDMsImV4cCI6MjA2NTIyMzc0M30.KmsH6qLMGwPPqQgsSxUalsCzfyVFKfliezfDspJFfVE"
);

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
  nickname?: string;
  avatarUrl?: string;
}

interface Friend {
  uid: string;
  nickname: string;
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
  const currentUid = localStorage.getItem("knightchat_user_uid") || "";
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!currentUid) {
    navigate('/login');
  }

  // For editing images
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editOriginImageUrl, setEditOriginImageUrl] = useState<string | null>(null);

  // For modal and expand
  const [expandedPosts, setExpandedPosts] = useState<{ [postId: string]: boolean }>({});
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // For share
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);

  // Fetch all used uids (author and commenters) and get nickname
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

  // Fetch friends for share
  const fetchFriends = async () => {
    if (!currentUid) return;
    const userDoc = await getDocs(collection(db, "users"));
    let myFriends: string[] = [];
    userDoc.forEach(docSnap => {
      if (docSnap.id === currentUid) {
        myFriends = docSnap.data().friends || [];
      }
    });
    // Get friend info
    const usersSnapshot = await getDocs(collection(db, "users"));
    const arr: Friend[] = [];
    usersSnapshot.forEach(userDoc => {
      if (myFriends.includes(userDoc.id)) {
        arr.push({
          uid: userDoc.id,
          nickname: userDoc.data().nickname || userDoc.id,
          avatarUrl: userDoc.data().avatarUrl || "",
        });
      }
    });
    setFriends(arr);
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
    // Collect all used uids (author and commenters)
    const authorUids = postArr.map(p => p.author);
    const commentUids = postArr.flatMap(p => (p.comments || []).map((c: {user: string}) => c.user));
    const allUids = Array.from(new Set([...authorUids, ...commentUids]));
    // Get nickname mapping
    const map = await fetchNicknames(allUids);
    setNicknameMap(map);
    // Add nickname and avatarUrl to each post
    setPosts(postArr.map(p => ({
      ...p,
      nickname: map[p.author]?.nickname || p.author,
      avatarUrl: map[p.author]?.avatarUrl || "",
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    fetchFriends();
    // eslint-disable-next-line
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Upload image to Supabase
 const uploadImageToSupabase = async (file: File, uid: string) => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${uid}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("post-images")
      .upload(fileName, file, { upsert: true });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (err) {
    console.error("Supabase upload failed", err);
    throw err;
  }
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

  const handleEditPost = (post: Post) => {
    setEditContent(post.content);
    setEditingPostId(post.id);
    setEditOriginImageUrl(post.imageUrl || null);
    setEditImage(null);
    setEditImagePreview(post.imageUrl || null);
    setMenuOpenId(null);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditImage(e.target.files[0]);
      setEditImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPostId) return;
    let imageUrl = editOriginImageUrl;
    if (editImage) {
      const author = localStorage.getItem("knightchat_user_uid") || "Anonymous";
      imageUrl = await uploadImageToSupabase(editImage, author);
    }
    await updateDoc(doc(db, "posts", editingPostId), {
      content: editContent,
      imageUrl: imageUrl || "",
    });
    setEditingPostId(null);
    setEditContent("");
    setEditImage(null);
    setEditImagePreview(null);
    setEditOriginImageUrl(null);
    fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    await deleteDoc(doc(db, "posts", postId));
    setMenuOpenId(null);
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

  // Helper: check if content needs "Show more"
  const needsShowMore = (text: string, maxLines: number = 4) => {
    return text.split('\n').length > maxLines || text.length > 180;
  };

  // 分享到好友的 chat
  const handleShareToFriend = async (friendUid: string, post: Post) => {
    const chatId = [currentUid, friendUid].sort().join("_");
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      user: currentUid,
      content: `[Shared Post]\n${post.content}`,
      postId: post.id,
      imageUrl: post.imageUrl || "",
      createdAt: Timestamp.now(),
    });
    setShowShareModal(false);
  };

  return (
    <div className="post-page">
      <div className="post-input-box">
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
            <div className="post-image-preview">
              <img src={imagePreview} alt="preview" />
            </div>
          )}
          <button type="submit" className="post-btn">
            Post
          </button>
        </form>
      </div>
      <div className="post-list">
        {loading && <div>Loading...</div>}
        {posts.map((post) => {
          const isExpanded = expandedPosts[post.id];
          const isCommentsExpanded = expandedComments[post.id];
          const showComments = isCommentsExpanded ? post.comments : post.comments?.slice(0, 5);
          const hasMoreComments = (post.comments?.length || 0) > 5;
          return (
            <div className="post-item" key={post.id}>
              {/* Menu for edit/delete/share */}
              <div className="post-menu">
                <button
                  className="post-menu-btn"
                  onClick={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                >⋯</button>
                {menuOpenId === post.id && (
                  <div className="post-menu-dropdown">
                    {post.author === currentUid && (
                      <>
                        <div className="post-menu-edit" onClick={() => handleEditPost(post)}>Edit</div>
                        <div className="post-menu-delete" onClick={() => handleDeletePost(post.id)}>Delete</div>
                      </>
                    )}
                    <div
                      className="post-menu-share"
                      onClick={() => {
                        setSharePost(post);
                        setShowShareModal(true);
                        setMenuOpenId(null);
                      }}
                    >Share</div>
                  </div>
                )}
              </div>
              {/* Edit modal */}
              {editingPostId === post.id && (
                <div className="post-modal-mask" onClick={() => setEditingPostId(null)}>
                  <div className="post-modal-content" onClick={e => e.stopPropagation()}>
                    <h4>Edit</h4>
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={4}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageChange}
                    />
                    {editImagePreview && (
                      <div className="post-image-preview">
                        <img src={editImagePreview} alt="preview" />
                      </div>
                    )}
                    <button className="post-btn" onClick={handleSaveEdit}>Save</button>
                    <button className="post-btn" onClick={() => setEditingPostId(null)}>Cancel</button>
                  </div>
                </div>
              )}
              <div className="post-author">
                {post.avatarUrl ? (
                  <img
                    src={post.avatarUrl}
                    alt="avatar"
                    className="post-avatar"
                    onClick={() => navigate(`/profile/${post.author}`)}
                  />
                ) : (
                  <span className="post-avatar"
                    onClick={() => navigate(`/profile/${post.author}`)}
                  >
                    {(post.nickname || post.author).charAt(0).toUpperCase()}
                  </span>
                )}
                <span
                  className="post-author-nickname"
                  onClick={() => navigate(`/profile/${post.author}`)}
                >{post.nickname || post.author}</span>
                <span className="post-time">
                  {post.createdAt.toDate().toLocaleString()}
                </span>
              </div>
              {/* Post content with show more */}
              <div
                className={`post-content${isExpanded ? " expanded" : ""}`}
                onClick={() => setSelectedPost(post)}
              >
                {post.content}
                {!isExpanded && needsShowMore(post.content, 4) && (
                  <span
                    className="post-show-more"
                    onClick={e => {
                      e.stopPropagation();
                      setExpandedPosts(prev => ({ ...prev, [post.id]: true }));
                    }}
                  > Show more </span>
                )}
              </div>
              {post.imageUrl && (
                <div className="post-image-block">
                  <img src={post.imageUrl} alt="post" />
                </div>
              )}
              <div className="post-like-row">
                <button
                  className="post-btn"
                  onClick={() => handleLike(post.id, post.likes || [])}
                >
                  👍 {post.likes?.length || 0}
                </button>
              </div>
              <div className="post-comments">
                <div className="post-comments-text">
                  {showComments?.map((c, idx) => (
                    <div key={idx} className="post-comment-item">
                      <b>
                        {(nicknameMap[c.user]?.nickname || c.user)}:
                      </b> {c.text}
                    </div>
                  ))}
                  {hasMoreComments && !isCommentsExpanded && (
                    <div
                      className="post-show-more-comments"
                      onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: true }))}
                    >Show more comments</div>
                  )}
                </div>
                <div className="post-comment-input-row">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentInput[post.id] || ""}
                    onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                  />
                  <button
                    className="post-btn"
                    onClick={() => handleComment(post.id)}
                    type="button"
                  >
                    Comment
                  </button>
                </div>
              </div>
              {/* Modal for full post */}
              {selectedPost && selectedPost.id === post.id && (
                <div className="post-modal-mask" onClick={() => setSelectedPost(null)}>
                  <div className="post-modal-content" onClick={e => e.stopPropagation()}>
                    {/* 大图弹窗的三个点 */}
                    <div className="post-menu" style={{ position: "absolute", top: 12, right: 12 }}>
                      <button
                        className="post-menu-btn"
                        onClick={() => setMenuOpenId("modal-" + post.id)}
                      >⋯</button>
                      {menuOpenId === "modal-" + post.id && (
                        <div className="post-menu-dropdown">
                          {selectedPost.author === currentUid && (
                            <>
                              <div className="post-menu-edit" onClick={() => handleEditPost(selectedPost)}>Edit</div>
                              <div className="post-menu-delete" onClick={() => handleDeletePost(selectedPost.id)}>Delete</div>
                            </>
                          )}
                          <div
                            className="post-menu-share"
                            onClick={() => {
                              setSharePost(selectedPost);
                              setShowShareModal(true);
                              setMenuOpenId(null);
                            }}
                          >Share</div>
                        </div>
                      )}
                    </div>
                    <div className="post-author">
                      {selectedPost.avatarUrl ? (
                        <img
                          src={selectedPost.avatarUrl}
                          alt="avatar"
                          className="post-avatar"
                          onClick={() => navigate(`/profile/${selectedPost.author}`)}
                        />
                      ) : (
                        <span className="post-avatar"
                          onClick={() => navigate(`/profile/${selectedPost.author}`)}
                        >
                          {(selectedPost.nickname || selectedPost.author).charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span
                        className="post-author-nickname"
                        onClick={() => navigate(`/profile/${selectedPost.author}`)}
                      >{selectedPost.nickname || selectedPost.author}</span>
                      <span className="post-time">
                        {selectedPost.createdAt.toDate().toLocaleString()}
                      </span>
                    </div>
                    <div className="post-content expanded">
                      {selectedPost.content}
                    </div>
                    {selectedPost.imageUrl && (
                      <div className="post-image-block">
                        <img src={selectedPost.imageUrl} alt="post" />
                      </div>
                    )}
                    <div>
                      <b>All comments:</b>
                      {selectedPost.comments && selectedPost.comments.length > 0 ? (
                        selectedPost.comments.map((c, idx) => (
                          <div key={idx} className="post-comment-item">
                            <b>{nicknameMap[c.user]?.nickname || c.user}:</b> {c.text}
                          </div>
                        ))
                      ) : (
                        <div className="post-no-comments">No comments</div>
                      )}
                    </div>
                    <button
                      className="post-btn"
                      onClick={() => setSelectedPost(null)}
                    >Close</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* 分享弹窗 */}
      {showShareModal && sharePost && (
        <div className="post-modal-mask" onClick={() => setShowShareModal(false)}>
          <div className="post-modal-content" onClick={e => e.stopPropagation()}>
            <h4>Share to Friend</h4>
            <ul>
              {friends.map(friend => (
                <li key={friend.uid} style={{ margin: "0.5em 0" }}>
                  <button
                    className="post-btn"
                    onClick={async () => {
                      await handleShareToFriend(friend.uid, sharePost);
                    }}
                  >
                    {friend.nickname}
                  </button>
                </li>
              ))}
            </ul>
            <button className="post-btn" onClick={() => setShowShareModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostPage;