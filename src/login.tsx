import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./Firebase";
import './App.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 简单校验：查找 Firestore 是否有该用户
    const querySnapshot = await getDocs(collection(db, "users"));
    const user = querySnapshot.docs.find(
      doc => doc.data().username === username && doc.data().password === password
    );
    if (user) {
      localStorage.setItem('knightchat_user', username);
      navigate('/');
    } else {
      alert("Invalid username or password!");
    }
  };

  return (
    <div className="login-container">
      <h2>Login KnightChat</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          className="login-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="login-input"
        />
        <button type="submit" className="login-submit">
          Login
        </button>
      </form>
      <div style={{ marginTop: '1em', textAlign: 'center' }}>
        <span>
          If you don't have an account <a href="#" onClick={e => {e.preventDefault(); navigate('/register')}}>register</a>
        </span>
      </div>
    </div>
  );
};

export default Login;