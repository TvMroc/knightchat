import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./Firebase";
import { collection, getDocs, doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import "./App.css";

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
      // 按nickname字母顺序排序
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
        // 查找好友详细信息
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
    <div className="friends-container" style={{ maxWidth: 400, margin: "2em auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 16px rgba(0,0,0,0.08)", padding: "2em" }}>
      <h2>My Friends</h2>
      <div style={{ display: "flex", gap: "1em", alignItems: "center", marginBottom: "1em" }}>
        <input
          type="text"
          placeholder="Search my friends"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: "0.6em", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          className="post-btn"
          style={{ padding: "0.5em 1em", fontSize: "1em" }}
          onClick={() => setShowAdd(true)}
        >
          Add Friends
        </button>
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: "2em" }}>
        {searchResults.length === 0 && (
          <li style={{ color: "#888" }}>No friends found.</li>
        )}
        {searchResults.map(f => (
          <li key={f.uid} style={{ display: "flex", alignItems: "center", gap: "1em", marginBottom: "0.7em" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "#aa7a2f", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.2em"
            }}>
              {f.nickname.charAt(0).toUpperCase()}
            </div>
            <span>{f.nickname}</span>
            <button
              className="post-btn"
              style={{ marginLeft: "auto", padding: "0.3em 1em", fontSize: "0.95em" }}
              onClick={() => navigate(`/chat/${f.uid}`)}
            >
              Chat
            </button>
          </li>
        ))}
      </ul>
      {showAdd && (
        <div style={{ marginBottom: "2em", background: "#f7f7f7", borderRadius: 8, padding: "1em", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <h3>Add Friend</h3>
          <input
            type="text"
            placeholder="Search nickname"
            value={addSearch}
            onChange={e => setAddSearch(e.target.value)}
            style={{ width: "100%", padding: "0.6em", borderRadius: 6, border: "1px solid #ccc", marginBottom: "0.5em" }}
          />
          <ul style={{
            listStyle: "none", padding: 0, margin: 0, background: "#f7f7f7", borderRadius: 6
          }}>
            {addResults.length === 0 && (
              <li style={{ padding: "0.7em", color: "#888" }}>No user found.</li>
            )}
            {addResults.map(u => (
              <li
                key={u.uid}
                style={{
                  padding: "0.7em", cursor: "pointer", display: "flex", alignItems: "center", gap: "1em"
                }}
                onClick={() => handleAddFriend(u.uid)}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#aa7a2f", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold"
                }}>
                  {u.nickname.charAt(0).toUpperCase()}
                </div>
                <span>{u.nickname}</span>
              </li>
            ))}
          </ul>
          <button
            className="post-btn"
            style={{ marginTop: "1em" }}
            onClick={() => setShowAdd(false)}
          >
            Close
          </button>
        </div>
      )}
      <div>
        <h3>All Users (for test)</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {allUsers.map(u => (
            <li key={u.uid} style={{ display: "flex", alignItems: "center", gap: "1em", marginBottom: "0.5em" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "#aa7a2f", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1em"
              }}>
                {u.nickname.charAt(0).toUpperCase()}
              </div>
              <span>{u.nickname}</span>
              <span style={{ color: "#aaa", fontSize: "0.95em" }}>{u.email}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Friends;