import './App.css'
import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { db } from "./Firebase";
import { doc, getDoc } from "firebase/firestore";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const uid = localStorage.getItem('knightchat_user_uid');
      if (uid) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setNickname(data.nickname || null);
          setAvatarUrl(data.avatarUrl || null);
        }
      } else {
        setNickname(null);
        setAvatarUrl(null);
      }
    };

    fetchProfile();

    const onStorage = () => {
      fetchProfile();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    // 每次页面切换时也同步一次
    const uid = localStorage.getItem('knightchat_user_uid');
    if (uid) {
      getDoc(doc(db, "users", uid)).then(userDoc => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setNickname(data.nickname || null);
          setAvatarUrl(data.avatarUrl || null);
        }
      });
    } else {
      setNickname(null);
      setAvatarUrl(null);
    }
  });

  return (
    <header className="header">
      <div 
        className="logo">
        <h2>KnightChat</h2>
      </div>
      <div className="menu">
        <a onClick={() => navigate('/')}><h3>Home</h3></a>
        <a onClick={() => navigate('/chat')}><h3>Chat</h3></a>
        <a onClick={() => navigate('/post')}><h3>Post</h3></a>
        <a onClick={() => navigate('/friends')}><h3>Friends</h3></a>
      </div>
      <div className="login">
        {nickname ? (
          <div
            className="avatar"
            title={nickname}
            onClick={() => navigate('/profile')}
            style={{ cursor: "pointer" }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              nickname.charAt(0).toUpperCase()
            )}
          </div>
        ) : (
          <button
            className="login-button"
            onClick={() => navigate('/login')}
          >
            <img src="./assets/login.png" alt="" />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;