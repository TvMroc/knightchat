import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./Firebase";
import { collection, getDocs, doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import "./friends.css";

interface User {
  uid: string;
  nickname: string;
  email: string;
}

const Friends: React.FC = () => {
  const currentUid = localStorage.getItem("knightchat_user_uid") || "";
  const navigate = useNavigate();
  const [friends, setFriends] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  // 获取所有用户
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const users: User[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        users.push({
          uid: docSnap.id,
          nickname: data.nickname || "",
          email: data.email || "",
        });
      });
      users.sort((a, b) => a.nickname.localeCompare(b.nickname));
      setAllUsers(users);
    };
    fetchUsers();
  }, []);

  // 获取当前用户的好友
  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUid) return;
      const userDoc = await getDoc(doc(db, "users", currentUid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const friendUids: string[] = data.friends || [];
        const friendsList = allUsers.filter(u => friendUids.includes(u.uid));
        setFriends(friendsList);
      }
    };
    fetchFriends();
  }, [allUsers, currentUid]);

  // 搜索好友
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(friends);
      return;
    }
    const results = friends.filter(u =>
      u.nickname.toLowerCase().includes(search.trim().toLowerCase())
    );
    setSearchResults(results);
  }, [search, friends]);

  // 搜索添加好友
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<User[]>([]);
  useEffect(() => {
    if (!addSearch.trim()) {
      setAddResults([]);
      return;
    }
    const results = allUsers
      .filter(u =>
        u.nickname.toLowerCase().includes(addSearch.trim().toLowerCase()) &&
        u.uid !== currentUid &&
        !friends.some(f => f.uid === u.uid)
      );
    setAddResults(results);
  }, [addSearch, allUsers, friends, currentUid]);

  // 添加好友
  const handleAddFriend = async (uid: string) => {
    if (!currentUid) return;
    const userRef = doc(db, "users", currentUid);
    await updateDoc(userRef, {
      friends: arrayUnion(uid),
    });
    setAddSearch("");
    setShowAdd(false);
    // 重新拉取好友
    const userDoc = await getDoc(doc(db, "users", currentUid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const friendUids: string[] = data.friends || [];
      const friendsList = allUsers.filter(u => friendUids.includes(u.uid));
      setFriends(friendsList);
    }
  };

  return (
    <div className="friends-container">
      <h2 className="friends-title">My Friends</h2>
      <div className="friends-search-bar">
          <input
            type="text"
            placeholder="Search my friends"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="friends-search-input"
          />
          <button
            className="friends-btn"
            onClick={() => setShowAdd(true)}
          >
            Add Friends
          </button>
        </div>
      <div className="friends-content-scroll">
        <ul className="friends-list">
          {searchResults.length === 0 && (
            <li className="friends-list-empty">No friends found.</li>
          )}
          {searchResults.map(f => (
            <li key={f.uid} className="friends-list-item">
              <div className="friends-avatar">{f.nickname.charAt(0).toUpperCase()}</div>
              <span className="friends-nickname">{f.nickname}</span>
              <button
                className="friends-btn friends-chat-btn"
                onClick={() => navigate(`/chat/${f.uid}`)}
              >
                Chat
              </button>
            </li>
          ))}
        </ul>
        {showAdd && (
          <div className="friends-add-modal">
            <h3>Add Friend</h3>
            <input
              type="text"
              placeholder="Search nickname"
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              className="friends-search-input"
              style={{ marginBottom: "0.5em" }}
            />
            <ul className="friends-list">
              {addResults.length === 0 && (
                <li className="friends-list-empty">No user found.</li>
              )}
              {addResults.map(u => (
                <li
                  key={u.uid}
                  className="friends-list-item friends-list-item-add"
                  onClick={() => handleAddFriend(u.uid)}
                >
                  <div className="friends-avatar">{u.nickname.charAt(0).toUpperCase()}</div>
                  <span className="friends-nickname">{u.nickname}</span>
                </li>
              ))}
            </ul>
            <button
              className="friends-btn friends-close-btn"
              onClick={() => setShowAdd(false)}
            >
              Close
            </button>
          </div>
        )}
        <div className="friends-allusers-section">
          <h3>All Users (for test)</h3>
          <ul className="friends-list">
            {allUsers.map(u => (
              <li key={u.uid} className="friends-list-item">
                <div className="friends-avatar friends-avatar-small">{u.nickname.charAt(0).toUpperCase()}</div>
                <span className="friends-nickname">{u.nickname}</span>
                <span className="friends-email">{u.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Friends;