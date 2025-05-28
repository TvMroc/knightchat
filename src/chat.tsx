import React, { useState, useRef, useEffect } from "react";
import "./chat.css";

interface Message {
  id: number;
  sender: string;
  content: string;
  time: string;
}

const mockMessages: Message[] = [
  { id: 1, sender: "Alice", content: "Hi there!", time: "09:00" },
  { id: 2, sender: "Me", content: "Hello!", time: "09:01" },
  { id: 3, sender: "Alice", content: "How are you?", time: "09:02" },
  { id: 4, sender: "Me", content: "I'm fine, thanks!", time: "09:03" },
];

const contacts = [
  { name: "Alice", last: "How are you?", time: "09:02" },
  { name: "Bob", last: "See you!", time: "08:55" },
  { name: "Charlie", last: "Good night!", time: "00:12" },
];

const Chat: React.FC = () => {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() === "") return;
    setMessages([
      ...messages,
      {
        id: messages.length + 1,
        sender: "Me",
        content: input,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
  };

  return (
    
    <div className="chat-app">
      <aside className="chat-sidebar">
        <div className="sidebar-header">Chats</div>
        <ul className="contact-list">
          {contacts.map((c) => (
            <li
              key={c.name}
              className={selectedContact.name === c.name ? "active" : ""}
              onClick={() => setSelectedContact(c)}
            >
              <div className="contact-avatar">{c.name.charAt(0).toUpperCase()}</div>
              <div className="contact-info">
                <div className="contact-name">{c.name}</div>
                <div className="contact-last">{c.last}</div>
              </div>
              <div className="contact-time">{c.time}</div>
            </li>
          ))}
        </ul>
      </aside>
      <main className="chat-main">
        <div className="chat-header">
          <div className="chat-avatar">{selectedContact.name.charAt(0).toUpperCase()}</div>
          <div className="chat-title">{selectedContact.name}</div>
        </div>
        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${msg.sender === "Me" ? "me" : "other"}`}
            >
              <div className="message-content">{msg.content}</div>
              <div className="message-meta">{msg.time}</div>
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