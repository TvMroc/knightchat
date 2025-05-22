import React from "react";
import './App.css'


const Header: React.FC = () => (
  <header className="header">
    <div className="logo">
        <h2>KnightChat</h2>
    </div>
    <div className="menu">
        <a href="#"><h3>Home</h3></a>
        <a href="#"><h3>Chat</h3></a>
        <a href="#"><h3>Post</h3></a>
        <a href="#"><h3>Profile</h3></a>
    </div>
    <div className="login">
        <button className="login-button">
          <img src="./assets/login.png" alt="" />
        </button>
    </div>
  </header>
);

export default Header;