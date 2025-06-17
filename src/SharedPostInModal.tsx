import React, { useEffect, useState } from "react";
import { Timestamp, doc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from "firebase/firestore";
import { db } from "./Firebase"; // 请替换成你的firebase初始化文件路径
import { useNavigate } from "react-router-dom";

interface Comment {
  user: string;
  text: string;
  createdAt: Timestamp;
}

interface Post {
  id: string;
  author: string;
  nickname?: string;
  avatarUrl?: string;
  content: string;
  imageUrl?: string;
  createdAt: Timestamp;
  likes?: string[];
  comments?: Comment[];
}

interface SharedPostInModalProps {
  post: Post;
  currentUid: string;
  onClose: () => void;
  fetchPosts: () => void; // 你现有刷新帖子列表函数
}

const needsShowMore = (text: string, maxLines: number) => {
  const maxChars = maxLines * 50;
  return text.length > maxChars;
};

export const SharedPostInModal: React.FC<SharedPostInModalProps> = ({
  post,
  currentUid,
  onClose,
  fetchPosts,
}) => {
  const navigate = useNavigate();

  const [isExpanded, setIsExpanded] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [likes, setLikes] = useState<string[]>(post.likes || []);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);

  // 新增：内部状态存昵称映射
  const [nicknameMap, setNicknameMap] = useState<Record<string, { nickname?: string; avatarUrl?: string }>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);

  const COMMENTS_TO_SHOW = 3;
  const showComments = isCommentsExpanded ? comments : comments.slice(0, COMMENTS_TO_SHOW);
  const hasMoreComments = comments.length > COMMENTS_TO_SHOW;

  // 新增：获取所有用户昵称映射
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const usersCol = collection(db, "users");
        const usersSnapshot = await getDocs(usersCol);
        const map: Record<string, { nickname?: string; avatarUrl?: string }> = {};
        usersSnapshot.forEach(doc => {
          const data = doc.data();
          map[doc.id] = { nickname: data.nickname, avatarUrl: data.avatarUrl };
        });
        setNicknameMap(map);
      } catch (error) {
        console.error("Failed to load users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const handleLike = async () => {
    const postRef = doc(db, "posts", post.id);
    if (likes.includes(currentUid)) {
      await updateDoc(postRef, {
        likes: arrayRemove(currentUid),
      });
      setLikes((prev) => prev.filter((id) => id !== currentUid));
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(currentUid),
      });
      setLikes((prev) => [...prev, currentUid]);
    }
    fetchPosts();
  };

  const handleComment = async () => {
    if (!commentInput.trim()) return;
    const postRef = doc(db, "posts", post.id);
    const newComment: Comment = {
      user: currentUid,
      text: commentInput.trim(),
      createdAt: Timestamp.now(),
    };
    await updateDoc(postRef, {
      comments: arrayUnion(newComment),
    });
    setComments((prev) => [...prev, newComment]);
    setCommentInput("");
    fetchPosts();
  };

  if (loadingUsers) {
    return <div>Loading user data...</div>;
  }

  return (
    <div className="shared-post-modal">
      <button className="close-btn" onClick={onClose}>Close</button>

      <div className="post-author" style={{ cursor: "pointer" }}>
        {post.avatarUrl ? (
          <img
            src={post.avatarUrl}
            alt="avatar"
            className="post-avatar"
            onClick={() => navigate(`/profile/${post.author}`)}
          />
        ) : (
          <span
            className="post-avatar"
            onClick={() => navigate(`/profile/${post.author}`)}
          >
            {(nicknameMap[post.author]?.nickname || post.author).charAt(0).toUpperCase()}
          </span>
        )}
        <span
          className="post-author-nickname"
          onClick={() => navigate(`/profile/${post.author}`)}
        >
          {nicknameMap[post.author]?.nickname || post.author}
        </span>
        <span className="post-time">
          {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : ""}
        </span>
      </div>

      <div
        className={`post-content${isExpanded ? " expanded" : ""}`}
        onClick={() => setIsExpanded(true)}
        style={{ whiteSpace: isExpanded ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }}
      >
        {post.content}
        {!isExpanded && needsShowMore(post.content, 4) && (
          <span
            className="post-show-more"
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            style={{ color: "blue", cursor: "pointer", marginLeft: 6 }}
          >
            Show more
          </span>
        )}
      </div>

      {post.imageUrl && (
        <div className="post-image-block">
          <img src={post.imageUrl} alt="post" style={{ maxWidth: "100%", maxHeight: 300 }} />
        </div>
      )}

      <div className="post-like-row">
        <button className="post-btn" onClick={handleLike} type="button">
          👍 {likes.length}
        </button>
      </div>

      <div className="post-comments" style={{ marginTop: 10 }}>
        <div className="post-comments-text">
          {showComments.map((c, idx) => (
            <div key={idx} className="post-comment-item">
              <b>
                {nicknameMap[c.user]?.nickname || c.user}:
              </b>{" "}
              {c.text}
            </div>
          ))}
          {hasMoreComments && !isCommentsExpanded && (
            <div
              className="post-show-more-comments"
              onClick={() => setIsCommentsExpanded(true)}
              style={{ color: "blue", cursor: "pointer" }}
            >
              Show more comments
            </div>
          )}
        </div>

        <div className="post-comment-input-row" style={{ marginTop: 8 }}>
          <input
            type="text"
            placeholder="Add a comment..."
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            style={{ width: "80%", padding: "4px 8px" }}
          />
          <button className="post-btn" onClick={handleComment} type="button" style={{ marginLeft: 8 }}>
            Comment
          </button>
        </div>
      </div>
    </div>
  );
};
export default SharedPostInModal;