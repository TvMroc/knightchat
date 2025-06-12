import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "./Firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, getDoc, doc, arrayUnion, updateDoc, getDocs, collectionGroup } from "firebase/firestore";
import "./chat.css";

interface Message {
  to: string;
  content: string;
  time: Timestamp;
}

interface Contact {
  uid: string;
  nickname: string;
  email: string;
}

const Chat = () => {
  const { uid: selectedUidFromUrl } = useParams<{ uid: string }>();
  const currentUid = localStorage.getItem("knightchat_user_uid") || "";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myMessages, setMyMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUid) return;
      const userDoc = await getDoc(doc(db, "users", currentUid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const friendUids: string[] = data.friends || [];
        const friends = await Promise.all(friendUids.map(uid => getDoc(doc(db, "users", uid))));
        const users: Contact[] = [];
        friends.forEach(friend => {
          if (friend.exists()) {
            const friendData = friend.data();
            users.push({
              uid: friendData.uid,
              nickname: friendData.nickname || "",
              email: friendData.email || "",
            });
          }
        });
        setContacts(users);
        if (selectedUidFromUrl) {
          setSelectedContact(users.find(u => u.uid === selectedUidFromUrl) || users[0] || null);
        } else {
          setSelectedContact(users[0] || null);
        }
      }
    };
    fetchFriends();
  }, []);

  const handleSend = async () => {
    if (input.trim() === "" || !currentUid || !selectedContact?.uid) return;
    const userRef = doc(db, "users", currentUid);
    await updateDoc(userRef, {
      messages: arrayUnion({
        to: selectedContact.uid,
        content: input,
        time: Timestamp.now()})
    });
    setInput("");
    getMessages();
  };


  const getMessages = async () => {
    if (!currentUid || !selectedContact?.uid) return;
    const userDoc = await getDoc(doc(db, "users", currentUid));
    
    const msgs: Message[] = userDoc.data()?.messages;
    const usersRef = doc(db, 'users', selectedContact?.uid || "");
    const messages = (await getDoc(usersRef)).data()?.messages.filter((doc: {to: string, content: string, time: Timestamp}) => doc.to === currentUid);
    const allMessages = [
      ...msgs.filter(msg => msg.to === selectedContact.uid),
      ...messages]
    setMessages(allMessages.sort((a, b) => a.time.toMillis() - b.time.toMillis()));
  }
  
  useEffect(() => {
    getMessages();
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-app">
      <aside className="chat-sidebar">
        <div className="sidebar-header">Chats</div>
        <ul className="contact-list">
          {contacts.map((c) => (
            <li key={c.uid} className={selectedContact?.uid === c.uid ? "active" : ""} onClick={() => setSelectedContact(c)}>
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
          {selectedContact && messages.map((msg) => (
            <div className={`chat-message ${msg.to === currentUid ? "other" : "me"}`}>
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