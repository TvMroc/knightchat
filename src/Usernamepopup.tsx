import { doc, setDoc, Timestamp } from "firebase/firestore";
import { useState, useCallback } from "react";
import { db } from "./Firebase";

export function useUsernamePopup() {
    const [id, setId] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [shown, setShown] = useState(false);

    const showPopup = useCallback((id: string, email: string) => {
        setShown(true);
        setEmail(email);
        setId(id);
    }, []);

    const submit = async () => {
        await setDoc(doc(db, "users", id), {
            uid: id,
            createdAt: Timestamp.now(),
            email: email,
            nickname: username,
        });
        setShown(false);
        setUsername("");
        setEmail("");
    };

    const popup = shown ? (
        <div style={{position: "fixed", backdropFilter: "blur(2px)", width: "100vw", height: "100vh", justifyContent: "center", alignItems: "center", display: "flex"}}>
            <div style={{backgroundColor: '#444444', width: 'auto', padding: '2em', borderRadius: '10px', filter: 'drop-shadow(0 0 2em rgba(0, 0, 0, 0.87))'}}>
                <h2>Enter Username</h2> 
                <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" placeholder="Username" className="username-input"/>
                <button onClick={submit} className="username-submit">Submit</button>
            </div>
        </div>
    ) : <></>;

    return { popup, showPopup };
}