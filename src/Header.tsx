import React from "react";
import './App.css'


const Header: React.FC = () => (
  <header className="header">
    <div className="logo">
        <h2>KnightChat</h2>
    </div>
    <div className="menu">
        <a href="#">Home</a>
        <a href="#">Chat</a>
        <a href="#">Post</a>
        <a href="#">Profile</a>
    </div>
    <div className="login">
        <button className="login-button">Login</button>
    </div>
  </header>
);

export default Header;