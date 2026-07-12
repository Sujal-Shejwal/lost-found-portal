import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./Items.css";

function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="items-page">
      <h2>Notifications</h2>

      {notifications.length === 0 ? (
        <p className="empty-text">No notifications yet.</p>
      ) : (
        <div className="items-grid">
          {notifications.map((note) => (
            <div className="notification-card" key={note.id}>
              <p>{note.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;
