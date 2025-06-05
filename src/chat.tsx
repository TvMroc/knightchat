import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "./Firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, getDoc, doc, getDocs } from "firebase/firestore";
import "./chat.css";

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  time: Timestamp;
  participants: string[];
}

interface Contact {
  uid: string;
  nickname: string;
  email: string;
}

const Chat: React.FC = () => {
  const { uid: selectedUidFromUrl } = useParams<{ uid: string }>();
  const currentUid = localStorage.getItem("knightchat_user_uid") || "";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取好友列表
  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUid) return;
      const userDoc = await getDoc(doc(db, "users", currentUid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const friendUids: string[] = data.friends || [];
        // 获取好友详细信息
        const allUsersDocs = await getDocs(collection(db, "users"));
        const users: Contact[] = [];
        allUsersDocs.forEach(userSnap => {
          const udata = userSnap.data();
          if (friendUids.includes(userSnap.id)) {
            users.push({
              uid: userSnap.id,
              nickname: udata.nickname || "",
              email: udata.email || "",
            });
          }
        });
        setContacts(users);
        // 自动选中URL指定的联系人或第一个
        if (selectedUidFromUrl) {
          const found = users.find(u => u.uid === selectedUidFromUrl);
          setSelectedContact(found || users[0] || null);
        } else {
          setSelectedContact(users[0] || null);
        }
      }
    };
    fetchFriends();
    // eslint-disable-next-line
  }, [currentUid, selectedUidFromUrl]);

  // 发送消息
  const handleSend = async () => {
    if (input.trim() === "" || !currentUid || !selectedContact?.uid) return;
    const participants = [currentUid, selectedContact.uid].sort();
    await addDoc(collection(db, "messages"), {
      from: currentUid,
      to: selectedContact.uid,
      content: input,
      time: Timestamp.now(),
      participants, // 这里是数组
    });
    setInput("");
  };

  // 实时监听当前用户与选中联系人的消息
  useEffect(() => {
    if (!currentUid || !selectedContact?.uid) return;
    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", currentUid),
      orderBy("time")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 只显示当前聊天对象的消息
      const filtered = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, "id">),
        }))
        .filter(
          (msg) =>
            msg.participants.length === 2 &&
            msg.participants.includes(currentUid) &&
            msg.participants.includes(selectedContact.uid)
        );
      setMessages(filtered);
    });
    return () => unsubscribe();
  }, [currentUid, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-app">
      <aside className="chat-sidebar">
        <div className="sidebar-header">Chats</div>
        <ul className="contact-list">
          {contacts.map((c) => (
            <li
              key={c.uid}
              className={selectedContact?.uid === c.uid ? "active" : ""}
              onClick={() => setSelectedContact(c)}
            >
              <div className="contact-avatar">{c.nickname.charAt(0).toUpperCase()}</div>
              <div className="contact-info">
                <div className="contact-name">{c.nickname}</div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <main className="chat-main">
        <div className="chat-header">
          {selectedContact && (
            <>
              <div className="chat-avatar">{selectedContact.nickname.charAt(0).toUpperCase()}</div>
              <div className="chat-title">{selectedContact.nickname}</div>
            </>
          )}
        </div>
        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.from === currentUid ? "me" : "other"}`}
            >
              <div className="message-content">{msg.content}</div>
              <div className="message-meta">
                {msg.time && msg.time.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area">
          <input
            type="text"
            placeholder="Type a message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            className="chat-input"
          />
          <button className="chat-send" onClick={handleSend}>Send</button>
        </div>
      </main>
    </div>
  );
};

export default Chat;