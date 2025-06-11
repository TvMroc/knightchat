import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./Firebase";
import { doc, setDoc } from "firebase/firestore";
import './App.css';

const Register = () => {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("The two passwords do not match!");
      return;
    }
    if (!nickname.trim()) {
      alert("Please enter a nickname!");
      return;
    }
    try {
      // 注册到auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // 存储到users集合
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        nickname: nickname,
        createdAt: new Date()
      });
      alert(`Registration successful!\nEmail: ${email}`);
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
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          required
          className="login-input"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
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