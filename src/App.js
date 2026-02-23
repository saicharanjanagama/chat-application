import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "./services/firebase";
import "./App.css";

import Header from "./components/Header";
import SignIn from "./components/SignIn";
import ChatRooms from "./features/rooms/ChatRooms";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u) {
        // await u.reload();

        // 🔥 CREATE / UPDATE USER PROFILE
        await setDoc(
          doc(firestore, "users", u.uid),
          {
            uid: u.uid,
            name: u.displayName || "User",
            email: u.email,
            photoURL: u.photoURL || null,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        setUser({ ...u });
      } else {
        setUser(null);
      }

      setLoading(false);
    });
  }, []);



  if (loading) return null; // or spinner

  return (
    <div className="App">
      <Header user={user} />
      <Routes>
        <Route
          path="/login"
          element={!user ? <SignIn /> : <Navigate to="/rooms" />}
        />

        <Route
          path="/rooms/*"
          element={user ? <ChatRooms user={user} /> : <Navigate to="/login" />}
        />

        <Route
          path="*"
          element={<Navigate to={user ? "/rooms" : "/login"} />}
        />
      </Routes>
    </div>
  );
}


export default App;
