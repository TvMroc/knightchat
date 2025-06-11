import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, db } from "./Firebase";
import googleImg from "./assets/google.png";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import './App.css';
import { useUsernamePopup } from "./Usernamepopup";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const {showPopup, popup} = useUsernamePopup();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      const user = userCredential.user;
      // 获取 Firestore 里的 nickname
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        // 存储 uid，Header 组件才能识别
        localStorage.setItem('knightchat_user_uid', user.uid);
        localStorage.setItem('knightchat_user', username);
        navigate('/');
      } else alert("User data not found in database!");
    } catch (error: any) {
      alert(error.message || "Login failed!");
    }
  };
  

  const googleLogin = () => {
    const provider = new GoogleAuthProvider();
    const auth = getAuth();
    signInWithPopup(auth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        // const token = credential.accessToken;
        // The signed-in user info.
        const user = result.user;
        console.log("User signed in:", user);
        if ( result.operationType === 'signIn' ) {
          localStorage.setItem('knightchat_user', user.email || username);
        } else if ( result.operationType === 'link' ) {
          showPopup(user.uid);
        }
      }).catch((error) => {
        // Handle Errors here.
    });
  }

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
      <div style={{ marginTop: '1em', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
        <span>
          If you don't have an account <a href="#" onClick={() => navigate('/register')}>register</a>
        </span>
        <div>
          Or login with google  <div style={{backgroundColor: '#444444', borderRadius: '10px', height: 40, width: 40, padding: 3, filter: 'drop-shadow(0 0 4em #61dafbaa);'}}><a onClick={googleLogin}><img width={40} height={40} src={googleImg} /></a></div>
        </div>
      </div>
      {popup}
    </div>
  );
};

export default Login;