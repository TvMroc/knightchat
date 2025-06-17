import React, { useEffect, useState, useRef } from "react";
import { db } from "./Firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
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

interface User {
  uid: string;
  nickname: string;
  email: string;
  avatarUrl?: string;
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [shownMessages, setShownMessages] = useState<Message[]>();
  const [input, setInput] = useState("");
  const [nicknameMap, setNicknameMap] = useState<{ [uid: string]: { nickname: string; avatarUrl?: string } }>({});
  const [friends, setFriends] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<User[]>([]);
  const [messageSearch, setMessageSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  const currentUid = localStorage.getItem("knightchat_user_uid") || "" ;
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchUsers = async () => {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const allUsers: User[] = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        nickname: data.nickname || "",
        email: data.email || "",
        avatarUrl: data.avatarUrl || "",
      };
    });
    setUsers(allUsers.filter((u: User) => u.nickname.toLowerCase().includes(userSearch.toLowerCase())));
  }
  
  useEffect(() => {
    fetchUsers();
  },[userSearch])

  useEffect(() => {
    setShownMessages(messages.filter(m => m.content.includes(messageSearch)));
  },[messageSearch])


  useEffect(() => {
    if (!currentUid) navigate("/login");

    const fetchMessages = async () => {
      const q = query(collection(db, "public-messages"), orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      const arr = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, "id">),
      }));

      const uids = Array.from(new Set(arr.map(m => m.user)));
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
      setMessages(
        arr.map(m => ({
          ...m,
          nickname: map[m.user]?.nickname || m.user,
          avatarUrl: map[m.user]?.avatarUrl || "",
        }))
      );
    };

    fetchMessages();
  }, []);

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

    const q = query(collection(db, "public-messages"), orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);
    const arr = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Message, "id">),
    }));
    setMessages(
      arr.map(m => ({
        ...m,
        nickname: nicknameMap[m.user]?.nickname || m.user,
        avatarUrl: nicknameMap[m.user]?.avatarUrl || "",
      }))
    );
  };

  useEffect(() => {
    const fetchFriendsAndRequests = async () => {
      if (!currentUid) return;

      const userDoc = await getDoc(doc(db, "users", currentUid));
      if (!userDoc.exists()) return;

      const data = userDoc.data();
      const friendUids: string[] = data.friends || [];
      const requestUids: string[] = data.friendRequestsReceived || [];

      const allUsersSnapshot = await getDocs(collection(db, "users"));
      const allUsers: User[] = allUsersSnapshot.docs.map(doc => {
        const d = doc.data();
        return {
          uid: doc.id,
          nickname: d.nickname || "",
          email: d.email || "",
          avatarUrl: d.avatarUrl || "",
        };
      });

      setFriends(allUsers.filter(u => friendUids.includes(u.uid)));
      setFriendRequests(allUsers.filter(u => requestUids.includes(u.uid)));
    };

    fetchFriendsAndRequests();
  }, [currentUid]);

  const handleAcceptRequest = async (requesterUid: string) => {
    await updateDoc(doc(db, "users", currentUid), {
      friends: arrayUnion(requesterUid),
      friendRequestsReceived: arrayRemove(requesterUid),
    });
    await updateDoc(doc(db, "users", requesterUid), {
      friends: arrayUnion(currentUid),
      friendRequestsSent: arrayRemove(currentUid),
    });

    setFriendRequests(prev => prev.filter(f => f.uid !== requesterUid));
    setFriends(prev => [...prev, friendRequests.find(f => f.uid === requesterUid)!]);
  };

  const handleDeclineRequest = async (requesterUid: string) => {
    await updateDoc(doc(db, "users", currentUid), {
      friendRequestsReceived: arrayRemove(requesterUid),
    });
    await updateDoc(doc(db, "users", requesterUid), {
      friendRequestsSent: arrayRemove(currentUid),
    });

    setFriendRequests(prev => prev.filter(f => f.uid !== requesterUid));
  };

  return (
    <div className="homepage-container">
      <div className="homepage-left">
        <h2 className="homepage-title">Public Tavern</h2>
        <input style={{margin: '0.5em'}} className="homepage-input" placeholder="search" type="text" value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)}></input>
        <div className="homepage-messages">
          {(shownMessages ? shownMessages : messages).map(msg => (
            <div className="homepage-message-item" key={msg.id}>
              <div className="homepage-avatar" onClick={() => navigate(`/profile/${msg.user}`)} title={msg.nickname}>
                {msg.avatarUrl ? (<img src={msg.avatarUrl} alt="avatar" className="homepage-avatar-img" />
                ) : ((msg.nickname || msg.user).charAt(0).toUpperCase())}
              </div>
              <span
                className="homepage-nickname"
                onClick={() => navigate(`/profile/${msg.user}`)}
                title={msg.nickname}
              >{msg.nickname}</span>
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

      <div className="homepage-right">
        <h3 className="homepage-friends-title">My Friends</h3>
        <ul className="homepage-friends-list">
          {friends.length === 0 && <li className="homepage-friend-empty">No friends yet.</li>}
          {friends.map(f => (
            <li key={f.uid} className="homepage-friend-item">
              <div className="homepage-friend-avatar" onClick={() => navigate(`/profile/${f.uid}`)}>
                {f.avatarUrl ? (<img src={f.avatarUrl} alt="avatar" className="homepage-friend-avatar-img" />
                ) : (f.nickname.charAt(0).toUpperCase())}
              </div>
              <span className="homepage-friend-nickname" onClick={() => navigate(`/profile/${f.uid}`)}>{f.nickname}</span>
              <button className="homepage-chat-btn" onClick={() => navigate(`/chat/${f.uid}`)}>Chat</button>
            </li>
          ))}
        </ul>

        <h3 className="homepage-friends-title">Friend Requests</h3>
        <ul className="homepage-friends-list">
          {friendRequests.length === 0 && <li className="homepage-friend-empty">No new requests.</li>}
          {friendRequests.map(req => (
            <li key={req.uid} className="homepage-friend-item">
              <div className="homepage-friend-avatar" onClick={() => navigate(`/profile/${req.uid}`)}>
                {req.avatarUrl ? (<img src={req.avatarUrl} alt="avatar" className="homepage-friend-avatar-img" />
                ) : (req.nickname.charAt(0).toUpperCase())}
              </div>
              <span className="homepage-friend-nickname" onClick={() => navigate(`/profile/${req.uid}`)}>{req.nickname}</span>
              <button className="homepage-chat-btn" onClick={() => handleAcceptRequest(req.uid)}>Accept</button>
              <button className="homepage-chat-btn" onClick={() => handleDeclineRequest(req.uid)}>Decline</button>
            </li>
          ))}
        </ul>

        <br></br>

        <h3>Search users</h3>
        <input className="homepage-input" placeholder="search" type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}></input>
        <ul className="homepage-friends-list">
          {users.length === 0 && <li className="homepage-friend-empty">...</li>}
          {users.map(req => (
            <li key={req.uid} className="homepage-friend-item">
              <div className="homepage-friend-avatar" onClick={() => navigate(`/profile/${req.uid}`)}>
                {req.avatarUrl ? (<img src={req.avatarUrl} alt="avatar" className="homepage-friend-avatar-img" />
                ) : (req.nickname.charAt(0).toUpperCase())}
              </div>
              <span className="homepage-friend-nickname" onClick={() => navigate(`/profile/${req.uid}`)}>{req.nickname}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
