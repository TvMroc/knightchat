import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Header from './Header'
import Login from './login';
import Register from './register';
import { db } from './Firebase';
import { collection, deleteDoc, doc, getDocs, setDoc, type DocumentData } from 'firebase/firestore';

function App() {
  const [count, setCount] = useState<number>(0);
  const [data, setData] = useState<DocumentData[]>([]);
  const [message, setMessage] = useState<string>('');
  const messagesRef = collection(db, "messages");
  console.log("")

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
      const querySnapshot = await getDocs(messagesRef);
      const data = querySnapshot.docs.map(doc => doc.data());
      setData(data);
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
                {data.map((doc: DocumentData, id: number) => (
                  <p key={id}>{doc.message} <button onClick={() => deleteMessage(id)}>a</button></p>
                ))}
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
      </Routes>
    </Router>
  )
}

export default App