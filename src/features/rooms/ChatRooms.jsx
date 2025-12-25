import { useEffect, useState } from "react";
import styled from "styled-components";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp,
  deleteDoc,
  getDocs, 
} from "firebase/firestore";

import { firestore } from "../../services/firebase";
import ChatRoom from "../chat/ChatRoom";

function ChatRooms({ user }) {
  const roomsRef = collection(firestore, "rooms");
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);

  /* ---------------- Listen to rooms ---------------- */
  useEffect(
    () =>
      onSnapshot(roomsRef, snap =>
        setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  /* ---------------- Create room ---------------- */
  const createRoom = async () => {
    const name = prompt("Room name:");
    if (!name) return;

    const roomId = name.trim();

    // prevent empty / duplicate rooms
    if (!roomId) return;

    // optional: prevent duplicate rooms
    if (rooms.some(r => r.id === roomId)) {
      alert("Room already exists");
      return;
    }

    await setDoc(doc(firestore, "rooms", roomId), {
      name: roomId,           // keep name field for UI
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });

    setCurrentRoom({
      id: roomId,
      name: roomId,
    });
  };

  /* ---------------- Check delete permission ---------------- */
  const canDeleteRoom = roomId => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return false;
    return room.createdBy === user.uid;
  };

  /* ---------------- Delete room ---------------- */
  const deleteRoom = async roomId => {
    if (!window.confirm("Delete this room permanently?")) return;

    const room = rooms.find(r => r.id === roomId);
    if (!room || room.createdBy !== user.uid) {
      alert("You are not allowed to delete this room");
      return;
    }

    const subs = ["messages", "typing", "presence"];

    for (const sub of subs) {
      const q = await getDocs(
        collection(firestore, "rooms", roomId, sub)
      );

      for (const d of q.docs) {
        await deleteDoc(d.ref);
      }
    }

    await deleteDoc(doc(firestore, "rooms", roomId));
    setCurrentRoom(null);
  };


  /* ---------------- Inside room ---------------- */
  if (currentRoom) {
    return (
      <>
        <ChatRoom
        key={currentRoom.id}   // 🔥 VERY IMPORTANT
        roomId={currentRoom.id}
        user={user}
        leaveRoom={() => {
          setCurrentRoom(null)
        }}
        canDelete={canDeleteRoom(currentRoom.id)}
        onDelete={() => deleteRoom(currentRoom.id)}
        />
      </>
    );
  }

  /* ---------------- Rooms list ---------------- */
  return (
    <RoomsWrapper>
      <RoomsHeader>
        <RoomInfo>
          <Title>Chat Rooms</Title>

          {/* 🟢 Online indicator */}
          <OnlineDot title="Online" />
        </RoomInfo>
        <Button onClick={createRoom}>➕ Create Room</Button>
      </RoomsHeader>

      <RoomList>
        {rooms.map(r => (
          <RoomItem
          key={r.id}
          onClick={() => setCurrentRoom({
            id: r.id,
            name: r.name,
          })}
          >
            <strong>{r.id}</strong>
            {canDeleteRoom(r.id) && <Tag>Creator</Tag>}
          </RoomItem>
        ))}
      </RoomList>
    </RoomsWrapper>
  );
}


/* ---------------- Styled Components ---------------- */

const RoomsWrapper = styled.div`
  background: #161b22;
  padding: 20px;
`;

const RoomsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RoomInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const OnlineDot = styled.span`
  width: 8px;
  height: 8px;
  background: #00a884;
  border-radius: 50%;
`;

const Title = styled.h2`
  font-size: 20px;
`;

const Button = styled.button`
  padding: ${({ $small }) => ($small ? "6px 12px" : "8px 16px")};
  font-size: ${({ $small }) => ($small ? "13px" : "15px")};
  background: ${({ $danger }) => ($danger ? "#b91c1c" : "#2563eb")};
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: 0.2s ease;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? "#7f1d1d" : "#1d4ed8"};
  }
`;

const RoomList = styled.ul`
  list-style: none;
  margin-top: 15px;
  padding: 0;
`;

const RoomItem = styled.li`
  padding: 14px 18px;
  background: #1f2937;
  margin-bottom: 10px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: 0.2s ease;

  &:hover {
    background: #374151;
  }
`;

const Tag = styled.span`
  padding: 3px 8px;
  background: #ffd70033;
  color: #ffd700;
  border-radius: 6px;
  font-size: 12px;
`;

export default ChatRooms;