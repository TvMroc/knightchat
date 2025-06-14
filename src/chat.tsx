import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "./Firebase";
import { collection, addDoc, query, orderBy, getDocs, getDoc, doc, Timestamp } from "firebase/firestore";
import "./chat.css";

interface Message {
  id?: string;
  to: string;
  content: string;
  time: Timestamp;
  user?: string; 
  postId?: string;
  imageUrl?: string;
}

interface Contact {
  uid: string;
  nickname: string;
  email: string;
  avatarUrl?: string;
}

const Chat = () => {
  const { uid: selectedUidFromUrl } = useParams<{ uid: string }>();
  const currentUid = localStorage.getItem("knightchat_user_uid") || "";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [nicknameMap, setNicknameMap] = useState<{ [uid: string]: { nickname: string; avatarUrl?: string } }>({});
  const [sharedPostModal, setSharedPostModal] = useState<{ postId: string; content: string; imageUrl?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUid) return;
      const userDoc = await getDoc(doc(db, "users", currentUid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const friendUids: string[] = data.friends || [];
        const friends = await Promise.all(friendUids.map(uid => getDoc(doc(db, "users", uid))));
        const users: Contact[] = [];
        const map: { [uid: string]: { nickname: string; avatarUrl?: string } } = {};
        friends.forEach(friend => {
          if (friend.exists()) {
            const friendData = friend.data();
            users.push({
              uid: friend.id,
              nickname: friendData.nickname || "",
              email: friendData.email || "",
              avatarUrl: friendData.avatarUrl || "",
            });
            map[friend.id] = {
              nickname: friendData.nickname || "",
              avatarUrl: friendData.avatarUrl || "",
            };
          }
        });
        setContacts(users);
        setNicknameMap(map);
        if (selectedUidFromUrl) {
          setSelectedContact(users.find(u => u.uid === selectedUidFromUrl) || users[0] || null);
        } else {
          setSelectedContact(users[0] || null);
        }
      }
    };
    fetchFriends();
    // eslint-disable-next-line
  }, []);

  const getMessages = async () => {
    if (!currentUid || !selectedContact?.uid) return;
    const chatId = [currentUid, selectedContact.uid].sort().join("_");
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const arr = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];
    setMessages(arr);
  };

  useEffect(() => {
    getMessages();
    // eslint-disable-next-line
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() === "" || !currentUid || !selectedContact?.uid) return;
    const chatId = [currentUid, selectedContact.uid].sort().join("_");
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      to: selectedContact.uid,
      user: currentUid,
      content: input,
      time: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
    setInput("");
    getMessages();
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.postId) {
      return (
        <div
          className="chat-shared-post"
          onClick={() => setSharedPostModal({ postId: msg.postId!, content: msg.content.replace('[Shared Post]\n', ''), imageUrl: msg.imageUrl })}
          style={{ cursor: "pointer" }}
        >
          {msg.imageUrl && <img src={msg.imageUrl} alt="post" className="chat-shared-post-img" />}
          <div className="chat-shared-post-content">{msg.content.replace('[Shared Post]\n', '')}</div>
        </div>
      );
    }
    return <div className="message-content">{msg.content}</div>;
  };

  return (
    <div className="chat-app">
      <aside className="chat-sidebar">
        <div className="sidebar-header">Chats</div>
        <ul className="contact-list">
          {contacts.map((c) => (
            <li key={c.uid} className={selectedContact?.uid === c.uid ? "active" : ""} onClick={() => setSelectedContact(c)}>
              <div className="contact-avatar">
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="avatar" className="contact-avatar-img" />
                ) : (
                  c.nickname.charAt(0).toUpperCase()
                )}
              </div>
              <div className="contact-info">
                <div className="contact-name">
                  {c.nickname}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
      <main className="chat-main">
        <div className="chat-header">
          {selectedContact && (
            <div className="chat-banner">
              <div
                className="chat-avatar"
                onClick={() => navigate(`/profile/${selectedContact.uid}`)}
                style={{ cursor: "pointer" }}
              >
                {selectedContact.avatarUrl ? (
                  <img src={selectedContact.avatarUrl} alt="avatar" className="chat-avatar-img" />
                ) : (
                  selectedContact.nickname.charAt(0).toUpperCase()
                )}
              </div>
              <div
                className="chat-title"
                onClick={() => navigate(`/profile/${selectedContact.uid}`)}
                style={{ cursor: "pointer" }}
              >
                {selectedContact.nickname}
              </div>
            </div>
          )}
        </div>
        <div className="chat-messages">
          {selectedContact && messages.map((msg, idx) => {
            const isMe = (msg.user || currentUid) === currentUid;
            return (
              <div className={`chat-message ${isMe ? "me" : "other"}`} key={msg.id || idx}>
                {renderMessageContent(msg)}
                <div className="message-meta">
                  {msg.time && msg.time.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            );
          })}
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
      {sharedPostModal && (
        <div className="post-modal-mask" onClick={() => setSharedPostModal(null)}>
          <div className="post-modal-content" onClick={e => e.stopPropagation()}>
            <div className="post-content expanded">{sharedPostModal.content}</div>
            {sharedPostModal.imageUrl && (
              <div className="post-image-block">
                <img src={sharedPostModal.imageUrl} alt="post" />
              </div>
            )}
            <button className="post-btn" onClick={() => setSharedPostModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;