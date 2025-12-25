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
  getDoc,
} from "firebase/firestore";

import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

import { firestore, storage } from "../../services/firebase";

import ChatMessage from "../../components/ChatMessage";
import { onlineDuration, shortName, avatarFromSeed } from "../../utils/helpers";

function ChatRoom({ roomId, user, leaveRoom, canDelete, onDelete }) {
    const [showEmoji, setShowEmoji] = useState(false);

    const dummyRef = useRef(null);
    const fileInputRef = useRef(null);
    const [pendingFile, setPendingFile] = useState(null);

    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    const [presenceUsers, setPresenceUsers] = useState([]);
    const [value, setValue] = useState("");

    const typingNames = typingUsers
    .filter(uid => uid !== user.uid)
    .map(uid => usersMap[uid]?.name || "Someone");
  
    const presenceRef = collection(firestore, `rooms/${roomId}/presence`);

    /* ---------------- MESSAGES (ORDERED) ---------------- */
    useEffect(() => {
        setMessages([]);

        const q = query(
            collection(firestore, `rooms/${roomId}/messages`),
            orderBy("createdAt", "asc")
        );

        const unsub = onSnapshot(q, snap => {
            setMessages(
                snap.docs.map(d => ({ id: d.id, ...d.data() }))
            );

            setTimeout(() => {
                dummyRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 80);
        });

        return () => unsub();
    }, [roomId]);

    /* ---------------- ROOM EXISTENCE WATCH ---------------- */
    useEffect(() => {
        if (!roomId) return;

        const roomRef = doc(firestore, "rooms", roomId);

        const unsub = onSnapshot(roomRef, snap => {
            if (!snap.exists()) {
                leaveRoom(); // 👈 FORCE EXIT
            }
        });

        return () => unsub();
    }, [roomId, leaveRoom]);

    /* ---------------- TYPING ---------------- */

    useEffect(() => {
        const unsub = onSnapshot(
            collection(firestore, "users"),
            snap => {
                const map = {};
                snap.forEach(doc => {
                    map[doc.id] = doc.data();
                });
                setUsersMap(map);
            }
        );

        return () => unsub();
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(
            collection(firestore, "rooms", roomId, "typing"),
            snap => {
                setTypingUsers(snap.docs.map(d => d.id));
            }
        );

        return () => unsub();
    }, [roomId]);


    /* ---------------- PRESENCE ---------------- */
    useEffect(() => {
        const unsub = onSnapshot(presenceRef, snap => {
            const now = Date.now();
            setPresenceUsers(
                snap.docs
                    .map(d => ({ uid: d.id, ...d.data() }))
                    .filter(u => {
                        const t = u.lastSeen?.toDate
                            ? u.lastSeen.toDate().getTime()
                            : 0;
                        return now - t < 60_000;
                    })
            );
        });
        return unsub;
    }, [presenceRef]);

    /* ---------------- PRESENCE HEARTBEAT ---------------- */
    useEffect(() => {
        if (!roomId) return;

        const ref = doc(
            firestore,
            `rooms/${roomId}/presence/${user.uid}`
        );

        let stopped = false;

        const beat = async () => {
            if (stopped) return;

            const roomSnap = await getDoc(
                doc(firestore, "rooms", roomId)
            );

            if (!roomSnap.exists()) {
                stopped = true;
                return;
            }

            await setDoc(
                ref,
                {
                    lastSeen: serverTimestamp(),
                    email: user.email,
                    displayName: user.displayName || shortName(user.email),
                    photoURL: user.photoURL || null,
                },
                { merge: true }
            );
        };

        beat();
        const interval = setInterval(beat, 20_000);

        return () => {
            stopped = true;
            clearInterval(interval);
        };
    }, [roomId, user, leaveRoom]);

    /* ---------------- SEND MESSAGE ---------------- */
    const handleSend = async e => {
        e.preventDefault();

        // 🚫 nothing to send
        if (!value.trim() && !pendingFile) return;

        // 🔴 room deleted check (keep yours if already present)

        let messageData = {
            uid: user.uid,
            displayName:
            user.displayName || user.email?.split("@")[0] || "Guest",
            photoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
        };

        // 🖼 MEDIA MESSAGE
        if (pendingFile) {
            const path = `chat/${roomId}/${Date.now()}_${pendingFile.name}`;
            const fileRef = storageRef(storage, path);

            await uploadBytes(fileRef, pendingFile);
            const url = await getDownloadURL(fileRef);

            let type = "file";
            if (pendingFile.type.startsWith("image")) type = "image";
            else if (pendingFile.type.startsWith("video")) type = "video";

            messageData = {
                ...messageData,
                type,
                text: value || "",          // ✅ caption
                fileURL: url,
                fileName: pendingFile.name,
                storagePath: path,
            };

            setPendingFile(null); // clear media
        }
        // 💬 TEXT ONLY MESSAGE
        else {
            messageData = {
                ...messageData,
                type: "text",
                text: value,
            };
        }

        await addDoc(
            collection(firestore, `rooms/${roomId}/messages`),
            messageData
        );

        setValue("");
    };

    useEffect(() => {
        return () => {
            if (pendingFile) {
                URL.revokeObjectURL(pendingFile);
            }
        };
    }, [pendingFile]);


    /* ---------------- HANDLE TYPING ---------------- */

    const typingTimeoutRef = useRef(null);

    const handleTyping = async e => {
        const text = e.target.value;
        setValue(text);

        const ref = doc(
            firestore,
            "rooms",
            roomId,
            "typing",
            user.uid
        );

        if (text.trim()) {
            await setDoc(ref, {
                uid: user.uid,
                at: serverTimestamp(),
            });

            // 🔥 debounce stop typing (SAFE)
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // typingTimeoutRef.current = setTimeout(async () => {
            //     await deleteDoc(ref);
            // }, 1200);
        } else {
            await deleteDoc(ref);
        }
    };

    useEffect(() => {
        const timeout = typingTimeoutRef.current;

        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }

            deleteDoc(
                doc(firestore, "rooms", roomId, "typing", user.uid)
            );
        };
    }, [roomId, user.uid]);



    /* ---------------- ADD OPEN FILE PICKER FUNCTION ---------------- */

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = file => {
        if (!file) return;
        setPendingFile(file); // store file, don’t upload yet
    };


    return (
        <ChatWrapper>
            <ChatTop>
                <Muted>Online: {presenceUsers.length}</Muted>

                <ChatActions>
                    <ActionBtn onClick={leaveRoom}>
                        ← Back
                    </ActionBtn>

                    {canDelete && (
                        <ActionBtn $danger onClick={onDelete}>
                            🗑 Delete
                        </ActionBtn>
                    )}
                </ChatActions>
            </ChatTop>

            <PresenceList>
                {presenceUsers.map(u => (
                    <PresenceItem key={u.uid}>
                        <AvatarSm
                        src={
                            u.photoURL ||
                            avatarFromSeed(u.displayName || u.uid)
                        }
                        referrerPolicy="no-referrer"
                        alt="user"
                        onError={e => {
                            e.currentTarget.src = avatarFromSeed(u.uid);
                        }}
                        />
                        
                        <span>
                            {u.displayName} - {onlineDuration(u.lastSeen)}
                        </span>
                    </PresenceItem>
                ))}
            </PresenceList>

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
                    ? `${typingNames[0]} is typing…`
                    : `${typingNames.join(", ")} are typing…`}
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

                        <CancelPreview onClick={() => setPendingFile(null)}>
                            ✕
                        </CancelPreview>
                    </PreviewBox>
                )}
            </ChatInputWrapper>

            {showEmoji && (
            <EmojiWrapper>
                <EmojiPicker
                onEmojiClick={e =>
                    setValue(v => v + e.emoji)
                }
                theme="dark"
                />
            </EmojiWrapper>
            )}

            <ChatForm onSubmit={handleSend}>
                <PlusButton type="button" onClick={openFilePicker}>
                    +
                </PlusButton>

                <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={
                    e => handleFileSelect(e.target.files[0])
                }
                />

                 {/* 😀 Emoji button */}
                <EmojiBtn
                    type="button"
                    onClick={() => setShowEmoji(v => !v)}
                >
                    😀
                </EmojiBtn>

                <MessageInput 
                value={value}
                onChange={handleTyping}
                placeholder={
                    pendingFile ? "Add a caption…" : "Type a message"
                }
                />

                <SendButton disabled={!value.trim() && !pendingFile}>
                    Send
                </SendButton>
            </ChatForm>
        </ChatWrapper>
    );
}
const ChatInputWrapper = styled.div`
    position: relative;   /* ✅ REQUIRED */
`;

/* ---------------- Styled Components ---------------- */

const ChatWrapper = styled.div`
    background: #161b22;
    padding: 10px 5px 5px 5px;
    height: 89vh;
    display: flex;
    flex-direction: column;
`;

const ChatTop = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
`;

const Muted = styled.small`
    color: #9ca3af;
    font-size: 13px;
`;

const ChatActions = styled.div`
    display: flex;
    gap: 10px;
`;

const ActionBtn = styled.button`
    padding: 6px 12px;
    font-size: 13px;
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


const PresenceList = styled.div`
    background: #1f2937;
    padding: 12px;
    border-radius: 10px;
    margin-bottom: 12px;
    max-height: 120px;
    overflow-y: auto;
    `;

    const PresenceItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px solid #374151;

    &:last-child {
        border-bottom: none;
    }
`;

const AvatarSm = styled.img`
    width: 30px;
    height: 30px;
    border-radius: 50%;
`;

const Messages = styled.div`
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
`;

const Typing = styled.div`
    margin: 8px 0;
    font-size: 13px;
    color: #93c5fd;
    font-style: italic;
`;

const PreviewBox = styled.div`
    position: absolute;
    bottom: 0;         /* ⬆ above input bar */
    right: 60px;          /* ➡ near send button */
    background: #1f2937;
    border-radius: 10px;
    max-width: 260px;
    padding: 10px;
    z-index: 10;

    img,
    video {
        max-width: 100%;
        border-radius: 8px;
    }

    @media (max-width: 768px) {
        max-width: 220px;
    }
`;


const FilePreview = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #93c5fd;
    background: #111827;
    padding: 10px;
    border-radius: 8px;

    span {
        word-break: break-all;
    }
`;

const CancelPreview = styled.button`
    position: absolute;
    top: -8px;
    right: -8px;
    background: #b91c1c;
    color: white;
    border: none;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    cursor: pointer;
    font-size: 12px;
`;


const ChatForm = styled.form`
    display: flex;
    gap: 5px;
    margin-top: 10px;

    input {
        flex: 1;
        padding: 12px;
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 8px;
        color: white;

        &:focus {
        outline: none;
        border-color: #2563eb;
        }
    }

    button {
        padding: 8px 16px;
        background: #2563eb;
        border: none;
        border-radius: 6px;
        color: white;
        cursor: pointer;

        &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        }
    }
`;

const PlusButton = styled.button`
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    background: #2563eb;
    color: white;
    font-size: 22px;
    border: none;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
        background: #1d4ed8;
    }
`;

const MessageInput = styled.input`
    flex: 1;
    padding: 12px;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 8px;
    color: white;

    &:focus {
        outline: none;
        border-color: #2563eb;
    }
`;

const SendButton = styled.button`
    padding: 8px 16px;
    background: #2563eb;
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const EmojiBtn = styled.button`
    width: 40px;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    background: #2563eb;
    font-size: 18px;
    color: white;
    border: none;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
        background: #1d4ed8;
    }
`;

const EmojiWrapper = styled.div`
  position: absolute;
  bottom: 70px;
  left: 20px;
  z-index: 20;
`;


export default ChatRoom;