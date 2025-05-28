import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./Firebase";
import './App.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 用邮箱登录，用户名当作邮箱
      await signInWithEmailAndPassword(auth, username, password);
      localStorage.setItem('knightchat_user', username);
      navigate('/');
    } catch (error: any) {
      alert(error.message || "Login failed!");
    }
  };

  return (
    <div className="login-container">
      <h2>Login KnightChat</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="email"
          placeholder="Email"
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