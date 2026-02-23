import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import EmojiPicker from "emoji-picker-react";

import {
  collection,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  query,
  orderBy,
  getDocs
} from "firebase/firestore";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import { firestore, storage } from "../../services/firebase";
import ChatMessage from "../../components/ChatMessage";
import { onlineDuration, shortName, avatarFromSeed } from "../../utils/helpers";

function ChatRoom({ roomId, user, leaveRoom, canDelete, onDelete }) {

  const [messages, setMessages] = useState([]);
  const [presenceUsers, setPresenceUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [value, setValue] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showOnlineDropdown, setShowOnlineDropdown] = useState(false);

  const dummyRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  /* ---------------- MESSAGES ---------------- */

  useEffect(() => {
    const q = query(
      collection(firestore, `rooms/${roomId}/messages`),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(q, snap => {
      setMessages(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );

      setTimeout(() => {
        dummyRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });
  }, [roomId]);

  /* ---------------- USERS (ONE TIME FETCH) ---------------- */

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(firestore, "users"));
      const map = {};
      snap.forEach(doc => {
        map[doc.id] = doc.data();
      });
      setUsersMap(map);
    };
    fetchUsers();
  }, []);

  /* ---------------- TYPING ---------------- */

  useEffect(() => {
    return onSnapshot(
      collection(firestore, "rooms", roomId, "typing"),
      snap => {
        setTypingUsers(
          snap.docs.map(d => d.id).filter(id => id !== user.uid)
        );
      }
    );
  }, [roomId, user.uid]);

  const handleTyping = e => {
    const text = e.target.value;
    setValue(text);

    const typingRef = doc(
      firestore,
      "rooms",
      roomId,
      "typing",
      user.uid
    );

    if (!text.trim()) {
      deleteDoc(typingRef);
      return;
    }

    setDoc(typingRef, {
      uid: user.uid,
      at: serverTimestamp()
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      deleteDoc(typingRef);
    }, 1200);
  };

  /* ---------------- PRESENCE ---------------- */

  useEffect(() => {
    const presenceRef = collection(
      firestore,
      `rooms/${roomId}/presence`
    );

    return onSnapshot(presenceRef, snap => {

      const active = snap.docs.map(d => ({
        uid: d.id,
        ...d.data()
      }));

      setPresenceUsers(active);
    });
  }, [roomId]);

  /* ---------------- PRESENCE HEARTBEAT ---------------- */

  useEffect(() => {
    const ref = doc(
      firestore,
      `rooms/${roomId}/presence/${user.uid}`
    );

    const beat = async () => {
      await setDoc(ref, {
        online: true,
        lastSeen: serverTimestamp(),
        displayName:
          user.displayName || shortName(user.email),
        photoURL: user.photoURL || null
      }, { merge: true });
    };

    beat();
    const interval = setInterval(beat, 8000);

    return async () => {
      clearInterval(interval);
      await setDoc(ref, {
        online: false,
        lastSeen: serverTimestamp()
      }, { merge: true });
    };
  }, [roomId, user]);

  /* ---------------- SEND MESSAGE ---------------- */

  const handleSend = async e => {
    e.preventDefault();
    if (!value.trim() && !pendingFile) return;

    let messageData = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp()
    };

    if (pendingFile) {
      const path = `chat/${roomId}/${Date.now()}_${pendingFile.name}`;
      const fileRef = storageRef(storage, path);

      await uploadBytes(fileRef, pendingFile);
      const url = await getDownloadURL(fileRef);

      let type = "file";
      if (pendingFile.type.startsWith("image")) type = "image";
      if (pendingFile.type.startsWith("video")) type = "video";

      messageData = {
        ...messageData,
        type,
        text: value || "",
        fileURL: url,
        fileName: pendingFile.name,
        storagePath: path
      };

      setPendingFile(null);
    } else {
      messageData = {
        ...messageData,
        type: "text",
        text: value
      };
    }

    await addDoc(
      collection(firestore, `rooms/${roomId}/messages`),
      messageData
    );

    setValue("");
  };

  const typingNames = typingUsers.map(uid =>
    usersMap[uid]?.name || "Someone"
  );

  return (
    <ChatWrapper>

      <ChatTop>
        <OnlineCount onClick={() =>
          setShowOnlineDropdown(v => !v)
        }>
          🟢 Online: {presenceUsers.filter(u => u.online).length}
        </OnlineCount>

        <ChatActions>
          <ActionBtn onClick={leaveRoom}>← Back</ActionBtn>
          {canDelete && (
            <ActionBtn $danger onClick={onDelete}>
              🗑 Delete
            </ActionBtn>
          )}
        </ChatActions>
      </ChatTop>

      {showOnlineDropdown && (
        <OnlineDropdown>
          {presenceUsers.map(u => (
            <OnlineItem key={u.uid}>
              <img
                src={u.photoURL || avatarFromSeed(u.displayName)}
                alt=""
              />
              <div>
                <strong>{u.displayName}</strong>
                <small>
                  {u.online
                    ? "Online"
                    : `Last seen ${onlineDuration(u.lastSeen)}`}
                </small>
              </div>
            </OnlineItem>
          ))}
        </OnlineDropdown>
      )}

      <Messages>
        {messages.map(m => (
          <ChatMessage
            key={m.id}
            message={m}
            currentUid={user.uid}
            roomId={roomId}
          />
        ))}
        <div ref={dummyRef} />
      </Messages>

      {typingNames.length > 0 && (
        <Typing>
          {typingNames.length === 1
            ? `${typingNames[0]} is typing...`
            : `${typingNames.join(", ")} are typing...`}
        </Typing>
      )}

      <ChatInputWrapper>

        {pendingFile && (
          <PreviewBox>
            {pendingFile.type.startsWith("image") && (
              <img
                src={URL.createObjectURL(pendingFile)}
                alt="preview"
              />
            )}

            {pendingFile.type.startsWith("video") && (
              <video controls>
                <source
                  src={URL.createObjectURL(pendingFile)}
                />
              </video>
            )}

            {!pendingFile.type.startsWith("image") &&
              !pendingFile.type.startsWith("video") && (
                <FilePreview>
                  📄 <span>{pendingFile.name}</span>
                </FilePreview>
              )}

            <CancelPreview
              onClick={() => setPendingFile(null)}
            >
              ✕
            </CancelPreview>
          </PreviewBox>
        )}

        {showEmoji && (
          <EmojiWrapper>
            <EmojiPicker
              theme="dark"
              onEmojiClick={e =>
                setValue(v => v + e.emoji)
              }
            />
          </EmojiWrapper>
        )}

        <ChatForm onSubmit={handleSend}>
          <PlusButton
            type="button"
            onClick={() =>
              fileInputRef.current.click()
            }
          >
            +
          </PlusButton>

          <input
            hidden
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={e =>
              setPendingFile(e.target.files[0])
            }
          />

          <EmojiBtn
            type="button"
            onClick={() =>
              setShowEmoji(v => !v)
            }
          >
            😀
          </EmojiBtn>

          <MessageInput
            value={value}
            onChange={handleTyping}
            placeholder={
              pendingFile
                ? "Add a caption..."
                : "Type a message"
            }
          />

          <SendButton
            disabled={!value.trim() && !pendingFile}
          >
            Send
          </SendButton>
        </ChatForm>

      </ChatInputWrapper>
    </ChatWrapper>
  );
}

/* ---------------- LAYOUT ---------------- */

const ChatWrapper = styled.div`
  background: #0f172a;
  height: 89vh;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: 12px;
`;

/* ---------------- HEADER ---------------- */

const ChatTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const OnlineCount = styled.div`
  font-size: 14px;
  color: #38bdf8;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;

  &:hover {
    color: #60a5fa;
  }
`;

const ChatActions = styled.div`
  display: flex;
  gap: 10px;
`;

const ActionBtn = styled.button`
  padding: 6px 14px;
  background: ${({ $danger }) =>
    $danger ? "#dc2626" : "#2563eb"};
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: 0.2s ease;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? "#b91c1c" : "#1d4ed8"};
  }
`;

/* ---------------- ONLINE DROPDOWN ---------------- */

const OnlineDropdown = styled.div`
  background: #1e293b;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 10px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
`;

const OnlineItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;

  img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
  }

  strong {
    font-size: 14px;
  }

  small {
    display: block;
    font-size: 12px;
    color: #94a3b8;
  }
`;

/* ---------------- MESSAGES ---------------- */

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 10px;
  }
`;

/* ---------------- TYPING ---------------- */

const Typing = styled.div`
  font-size: 13px;
  color: #38bdf8;
  font-style: italic;
  margin: 6px 0;
`;

/* ---------------- INPUT WRAPPER ---------------- */

const ChatInputWrapper = styled.div`
  position: relative;
`;

/* ---------------- FILE PREVIEW ---------------- */

const PreviewBox = styled.div`
  position: absolute;
  bottom: 60px;
  right: 10px;
  background: #1e293b;
  border-radius: 12px;
  max-width: 260px;
  padding: 12px;
  z-index: 20;
  box-shadow: 0 10px 25px rgba(0,0,0,0.6);

  img,
  video {
    max-width: 100%;
    border-radius: 8px;
  }
`;

const FilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #60a5fa;
  background: #0f172a;
  padding: 10px;
  border-radius: 8px;

  span {
    word-break: break-word;
  }
`;

const CancelPreview = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef4444;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  color: white;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: #dc2626;
  }
`;

/* ---------------- EMOJI ---------------- */

const EmojiWrapper = styled.div`
  position: absolute;
  bottom: 60px;
  left: 10px;
  z-index: 30;
`;

/* ---------------- INPUT BAR ---------------- */

const ChatForm = styled.form`
  display: flex;
  gap: 6px;
  margin-top: 10px;
  align-items: center;
`;

const PlusButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #2563eb;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: #1d4ed8;
  }
`;

const EmojiBtn = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #334155;
  border: none;
  font-size: 18px;
  color: white;
  cursor: pointer;

  &:hover {
    background: #475569;
  }
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  color: white;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #2563eb;
  }
`;

const SendButton = styled.button`
  padding: 10px 16px;
  background: #2563eb;
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  font-weight: 500;
  transition: 0.2s;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default ChatRoom;