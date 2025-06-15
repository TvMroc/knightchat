import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Header from './Header';
import Login from './login';
import Register from './register';
import Chat from './chat';
import Post from './post';
import Profile from './profile';
import Friends from './friends';
import HomePage from './home'; 

function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat/:uid" element={<Chat />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/post" element={<Post />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:uid" element={<Profile />} />
        <Route path="/friends" element={<Friends />} />
      </Routes>
    </Router>
  );
}

export default App;