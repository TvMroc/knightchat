import React, { useEffect, useState, useRef } from "react";
import { db } from "./Firebase";
import { collection, addDoc, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./home.css";

interface Message {
  id: string;
  user: string;
  content: string;
  createdAt: Timestamp;
  nickname?: string;
  avatarUrl?: string;
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [nicknameMap, setNicknameMap] = useState<{ [uid: string]: { nickname: string; avatarUrl?: string } }>({});
  const currentUid = localStorage.getItem("knightchat_user_uid") || "";
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取所有消息
  useEffect(() => {
    const fetchMessages = async () => {
      const q = query(collection(db, "public-messages"), orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      const arr = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, "id">),
      }));
      // 获取所有用到的 uid
      const uids = Array.from(new Set(arr.map(m => m.user)));
      // 获取昵称和头像
      const usersSnapshot = await getDocs(collection(db, "users"));
      const map: { [uid: string]: { nickname: string; avatarUrl?: string } } = {};
      usersSnapshot.forEach(userDoc => {
        const data = userDoc.data();
        if (uids.includes(userDoc.id)) {
          map[userDoc.id] = {
            nickname: data.nickname || userDoc.id,
            avatarUrl: data.avatarUrl || "",
          };
        }
      });
      setNicknameMap(map);
      setMessages(arr.map(m => ({
        ...m,
        nickname: map[m.user]?.nickname || m.user,
        avatarUrl: map[m.user]?.avatarUrl || "",
      })));
    };
    fetchMessages();
  }, []);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await addDoc(collection(db, "public-messages"), {
      user: currentUid,
      content: input,
      createdAt: Timestamp.now(),
    });
    setInput("");
    // 重新获取消息
    const q = query(collection(db, "public-messages"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const arr = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Message, "id">),
    }));
    setMessages(arr.map(m => ({
      ...m,
      nickname: nicknameMap[m.user]?.nickname || m.user,
      avatarUrl: nicknameMap[m.user]?.avatarUrl || "",
    })));
  };

  return (
    <div className="homepage-channel">
      <h2 className="homepage-title">Public Tavern</h2>
      <div className="homepage-messages">
        {messages.map(msg => (
          <div className="homepage-message-item" key={msg.id}>
            <div
              className="homepage-avatar"
              onClick={() => navigate(`/profile/${msg.user}`)}
              title={msg.nickname}
            >
              {msg.avatarUrl ? (
                <img src={msg.avatarUrl} alt="avatar" className="homepage-avatar-img" />
              ) : (
                (msg.nickname || msg.user).charAt(0).toUpperCase()
              )}
            </div>
            <span
              className="homepage-nickname"
              onClick={() => navigate(`/profile/${msg.user}`)}
              title={msg.nickname}
            >
              {msg.nickname}
            </span>
            <span className="homepage-message-content">{msg.content}</span>
            <span className="homepage-message-time">
              {msg.createdAt?.toDate?.().toLocaleTimeString?.() || ""}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="homepage-input-row" onSubmit={handleSend}>
        <input
          className="homepage-input"
          placeholder="Say something to the tavern..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="homepage-send-btn" type="submit">Send</button>
      </form>
    </div>
  );
}