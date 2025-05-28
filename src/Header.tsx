import './App.css'
import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import './App.css';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<string | null>(localStorage.getItem('knightchat_user'));

  useEffect(() => {
    const onStorage = () => {
      setUser(localStorage.getItem('knightchat_user'));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 每次页面切换时也同步一次
  useEffect(() => {
    setUser(localStorage.getItem('knightchat_user'));
  });

  const handleLogout = () => {
    localStorage.removeItem('knightchat_user');
    setUser(null);
    navigate('/login');
  };

  return (
    <header className="header">
      <div 
        onClick={() => navigate('/')}
        className="logo">
        <h2>KnightChat</h2>
      </div>
      <div className="menu">
        <a onClick={() => navigate('/')} href="#"><h3>Home</h3></a>
        <a onClick={() => navigate('/chat')} href="#"><h3>Chat</h3></a>
        <a href="#"><h3>Post</h3></a>
        <a href="#"><h3>Profile</h3></a>
      </div>
      <div className="login">
        {user ? (
          <div className="avatar" title={user} onClick={handleLogout}>
            {user.charAt(0).toUpperCase()}
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