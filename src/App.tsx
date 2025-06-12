import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import Delete from './assets/delete.png'
import './App.css'
import Header from './Header'
import Login from './login';
import Register from './register';
import { db } from './Firebase';
import Chat from './chat';
import { collection, deleteDoc, doc, getDocs, QuerySnapshot, setDoc, type DocumentData } from 'firebase/firestore';
import Post from './post';
import Profile from './profile';
import Friends from './friends';

function App() {
  const [count, setCount] = useState<number>(0);
  const [data, setData] = useState<QuerySnapshot<DocumentData, DocumentData>>();
  const [message, setMessage] = useState<string>('');
  const messagesRef = collection(db, "messages");

  const addMessage = async () => {
    if (message.trim() === '') {
      return;
    }
    await setDoc(doc(messagesRef), { message: message, createdAt: new Date()});
    setMessage('');
    fetchData();
  }

  const deleteMessage = async (id: number) => {
    await deleteDoc(doc(messagesRef, id.toString()));
    fetchData();
  }

  const fetchData = async () => {
    try {
      const data = await getDocs(messagesRef);
      setData(data);
      console.log(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={
          <div>
            <div>
              <a href="https://vite.dev" target="_blank">
                <img src={viteLogo} className="logo" alt="Vite logo" />
              </a>
              <a href="https://react.dev" target="_blank">
                <img src={reactLogo} className="logo react" alt="React logo" />
              </a>
            </div>
            <div className="card">
              <button onClick={() => setCount(count + 1)}>
                count is {count}
              </button>
              <div>
                {data?.docs.map((doc) => {
                  const info = doc.data();
                  return(
                  <p>{info.message} <button className='button' onClick={() => deleteMessage(doc._document.key.path.segments[6])}><img width={40} src={Delete}/></button></p>
                )})}
              </div>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button onClick={addMessage}>add message</button>
            </div>
          </div>
        } />
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
  )
}

export default App