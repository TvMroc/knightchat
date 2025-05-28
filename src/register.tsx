import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./Firebase";
import './App.css';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("The two passwords do not match!");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, username, password);
      alert(`Registration successful!\nEmail: ${username}`);
      navigate('/login');
    } catch (error: any) {
      alert(error.message || "Registration failed!");
    }
  };

  return (
    <div className="login-container">
      <h2>Register KnightChat</h2>
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
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          className="login-input"
        />
        <button type="submit" className="login-submit">
          Register
        </button>
      </form>
      <div style={{ marginTop: '1em', textAlign: 'center' }}>
        <span>
          Already have an account? <a href="#" onClick={e => {e.preventDefault(); navigate('/login')}}>Login</a>
        </span>
      </div>
    </div>
  );
};

export default Register;