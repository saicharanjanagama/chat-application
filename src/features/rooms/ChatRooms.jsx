import { useEffect, useState } from "react";
import styled from "styled-components";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp,
  deleteDoc,
  getDocs
} from "firebase/firestore";

import { firestore } from "../../services/firebase";
import ChatRoom from "../chat/ChatRoom";

function ChatRooms({ user }) {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState("");

  /* ---------------- LISTEN ROOMS ---------------- */

  useEffect(() => {
    const roomsRef = collection(firestore, "rooms");

    const unsub = onSnapshot(roomsRef, snap => {
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setRooms(list.sort((a, b) =>
        a.createdAt?.seconds > b.createdAt?.seconds ? -1 : 1
      ));
    });

    return () => unsub();
  }, []);

  /* ---------------- CREATE ROOM ---------------- */

  const createRoom = async () => {
    const name = roomName.trim();
    if (!name) return;

    const roomId = name.toLowerCase();

    if (rooms.some(r => r.id === roomId)) {
      alert("Room already exists");
      return;
    }

    await setDoc(doc(firestore, "rooms", roomId), {
      name,
      createdBy: user.uid,
      createdAt: serverTimestamp()
    });

    setRoomName("");
    setCreating(false);
    setCurrentRoom({ id: roomId, name });
  };

  /* ---------------- DELETE ROOM ---------------- */

  const deleteRoom = async roomId => {
    if (!window.confirm("Delete this room permanently?")) return;

    const room = rooms.find(r => r.id === roomId);
    if (!room || room.createdBy !== user.uid) {
      alert("Not allowed");
      return;
    }

    const subs = ["messages", "typing", "presence"];

    for (const sub of subs) {
      const snap = await getDocs(
        collection(firestore, "rooms", roomId, sub)
      );

      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    }

    await deleteDoc(doc(firestore, "rooms", roomId));
    setCurrentRoom(null);
  };

  const canDeleteRoom = roomId => {
    const room = rooms.find(r => r.id === roomId);
    return room?.createdBy === user.uid;
  };

  /* ---------------- INSIDE ROOM ---------------- */

  if (currentRoom) {
    return (
      <ChatRoom
        key={currentRoom.id}
        roomId={currentRoom.id}
        user={user}
        leaveRoom={() => setCurrentRoom(null)}
        canDelete={canDeleteRoom(currentRoom.id)}
        onDelete={() => deleteRoom(currentRoom.id)}
      />
    );
  }

  /* ---------------- ROOMS LIST UI ---------------- */

  return (
    <RoomsWrapper>

      <RoomsHeader>
        <Title>Chat Rooms</Title>

        {!creating ? (
          <CreateBtn onClick={() => setCreating(true)}>
            + Create Room
          </CreateBtn>
        ) : (
          <CreateBox>
            <RoomInput
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              placeholder="Room name"
            />
            <SmallBtn onClick={createRoom}>Create</SmallBtn>
            <CancelBtn onClick={() => setCreating(false)}>
              ✕
            </CancelBtn>
          </CreateBox>
        )}
      </RoomsHeader>

      <RoomList>
        {rooms.map(r => (
          <RoomItem
            key={r.id}
            onClick={() =>
              setCurrentRoom({
                id: r.id,
                name: r.name
              })
            }
          >
            <RoomLeft>
              <RoomAvatar>
                {r.name?.charAt(0).toUpperCase()}
              </RoomAvatar>
              <div>
                <RoomName>{r.name}</RoomName>
                <RoomSub>
                  Created by {r.createdBy === user.uid ? "You" : "User"}
                </RoomSub>
              </div>
            </RoomLeft>

            {canDeleteRoom(r.id) && (
              <CreatorTag>Creator</CreatorTag>
            )}
          </RoomItem>
        ))}
      </RoomList>

    </RoomsWrapper>
  );
}

/* ---------------- STYLING ---------------- */

const RoomsWrapper = styled.div`
  background: #0f172a;
  padding: 20px;
  min-height: 89vh;
  border-radius: 12px;
`;

const RoomsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
`;

const Title = styled.h2`
  font-size: 22px;
  color: white;
`;

const CreateBtn = styled.button`
  background: #2563eb;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: #1d4ed8;
  }
`;

const CreateBox = styled.div`
  display: flex;
  gap: 6px;
`;

const RoomInput = styled.input`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #1e293b;
  color: white;
`;

const SmallBtn = styled.button`
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: white;
  cursor: pointer;

  &:hover {
    background: #059669;
  }
`;

const CancelBtn = styled.button`
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: #ef4444;
  color: white;
  cursor: pointer;

  &:hover {
    background: #dc2626;
  }
`;

const RoomList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const RoomItem = styled.li`
  background: #1e293b;
  padding: 14px;
  margin-bottom: 10px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: 0.2s;

  &:hover {
    background: #334155;
  }
`;

const RoomLeft = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const RoomAvatar = styled.div`
  width: 42px;
  height: 42px;
  background: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
`;

const RoomName = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: white;
`;

const RoomSub = styled.div`
  font-size: 12px;
  color: #94a3b8;
`;

const CreatorTag = styled.span`
  font-size: 12px;
  background: #facc1533;
  color: #facc15;
  padding: 4px 8px;
  border-radius: 6px;
`;

export default ChatRooms;