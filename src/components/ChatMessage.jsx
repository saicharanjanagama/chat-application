import styled from "styled-components";
import {
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { firestore } from "../services/firebase";
import {
  deleteObject,
  ref as storageRef,
  ref as refFromURL
} from "firebase/storage";
import { storage } from "../services/firebase";
import { fmtTime, avatarFromSeed } from "../utils/helpers";
import Linkify from "linkify-react";
import { motion } from "framer-motion";
import { useState } from "react";

function ChatMessage({ message, currentUid, roomId }) {
  const {
    id,
    uid,
    text,
    displayName,
    photoURL,
    createdAt,
    type,
    fileURL,
    fileName,
    storagePath,
    edited = false,
    reactions = {},
    replyTo
  } = message;

  const mine = uid === currentUid;
  const [processing, setProcessing] = useState(false);

  /* ---------------- DELETE ---------------- */
  const deleteMsg = async () => {
    if (processing) return;
    if (!window.confirm("Delete this message?")) return;

    try {
      setProcessing(true);

      if (storagePath) {
        const fileRef = storageRef(storage, storagePath);
        await deleteObject(fileRef);
      } else if (fileURL) {
        try {
          const fileRef = refFromURL(storage, fileURL);
          await deleteObject(fileRef);
        } catch {}
      }

      await deleteDoc(
        doc(firestore, `rooms/${roomId}/messages/${id}`)
      );
    } catch {
      alert("Failed to delete message");
    }

    setProcessing(false);
  };

  /* ---------------- EDIT ---------------- */
  const editMsg = async () => {
    const updatedText = prompt("Edit message:", text);
    if (!updatedText || updatedText.trim() === text) return;

    await updateDoc(
      doc(firestore, `rooms/${roomId}/messages/${id}`),
      {
        text: updatedText.trim(),
        edited: true
      }
    );
  };

  /* ---------------- REACTIONS ---------------- */
  const toggleReaction = async emoji => {
    const ref = doc(
      firestore,
      `rooms/${roomId}/messages/${id}`
    );

    const alreadyReacted =
      reactions?.[emoji]?.includes(currentUid);

    await updateDoc(ref, {
      [`reactions.${emoji}`]: alreadyReacted
        ? arrayRemove(currentUid)
        : arrayUnion(currentUid)
    });
  };

  return (
    <MessageRow $mine={mine}>
      {/* Avatar */}
      <Avatar
        src={
          photoURL
            ? photoURL
            : avatarFromSeed(displayName || uid || "User")
        }
        referrerPolicy="no-referrer"
        alt="avatar"
        onError={e => {
          e.currentTarget.src = avatarFromSeed(uid);
        }}
      />

      {/* Message */}
      <MessageBubble
        $mine={mine}
        as={motion.div}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Meta>
          <Sender>{displayName}</Sender>
          <Time>{fmtTime(createdAt)}</Time>
        </Meta>

        {/* REPLY PREVIEW */}
        {replyTo && (
          <ReplyPreview>
            <strong>{replyTo.displayName}</strong>
            <p>{replyTo.text}</p>
          </ReplyPreview>
        )}

        {/* IMAGE */}
        {type === "image" && (
          <>
            <MediaImage
              src={fileURL}
              alt="sent"
              onClick={() => window.open(fileURL)}
            />
            {text && <Caption>{text}</Caption>}
          </>
        )}

        {/* VIDEO */}
        {type === "video" && (
          <>
            <MediaVideo controls>
              <source src={fileURL} />
            </MediaVideo>
            {text && <Caption>{text}</Caption>}
          </>
        )}

        {/* FILE */}
        {type === "file" && (
          <>
            <FileBox href={fileURL} target="_blank" rel="noopener noreferrer">
              📄 {fileName}
            </FileBox>
            {text && <Caption>{text}</Caption>}
          </>
        )}

        {/* TEXT */}
        {(!type || type === "text") && (
          <Text>
            <Linkify
              options={{
                target: "_blank",
                rel: "noopener noreferrer",
                className: "chat-link"
              }}
            >
              {text}
            </Linkify>
            {edited && <EditedBadge>(edited)</EditedBadge>}
          </Text>
        )}

        {/* STATUS TICKS */}
        {/* {mine && <TickWrapper>{renderTicks()}</TickWrapper>} */}

        {/* REACTIONS */}
        {Object.keys(reactions).length > 0 && (
          <ReactionBar>
            {Object.entries(reactions).map(
              ([emoji, users]) =>
                users.length > 0 && (
                  <ReactionItem
                    key={emoji}
                    onClick={() =>
                      toggleReaction(emoji)
                    }
                  >
                    {emoji} {users.length}
                  </ReactionItem>
                )
            )}
          </ReactionBar>
        )}
      </MessageBubble>

      {/* Actions */}
      {mine && (
        <Actions>
          <IconButton $edit onClick={editMsg} disabled={processing}>
            <EditIcon src="images/edit.png" alt="edit" />
          </IconButton>
          <IconButton $delete onClick={deleteMsg} disabled={processing}>
            <DeleteIcon src="images/delete.png" alt="delete" />
          </IconButton>
        </Actions>
      )}
    </MessageRow>
  );
}
/* ---------------- Styled Components ---------------- */

const MessageRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  align-items: flex-start;
  flex-direction: ${({ $mine }) =>
    $mine ? "row-reverse" : "row"};
`;

const Avatar = styled.img`
  width: 30px;
  height: 30px;
  border-radius: 50%;
`;

const MessageBubble = styled.div`
  background: ${({ $mine }) =>
    $mine ? "#2563eb" : "#1f2937"};
  padding: 12px 15px;
  border-radius: 12px;
  max-width: 70%;
`;

const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
`;

const Sender = styled.strong`
  font-size: 14px;
`;

const Time = styled.small`
  font-size: 11px;
  opacity: 0.7;
`;

const Text = styled.div`
  font-size: 15px;
  word-wrap: break-word;
`;

const MediaImage = styled.img`
  max-width: 240px;
  border-radius: 10px;
  cursor: pointer;

  @media (max-width: 768px) {
    max-width: 200px;
  }
`;

const MediaVideo = styled.video`
  max-width: 240px;
  border-radius: 10px;

  @media (max-width: 768px) {
    max-width: 200px;
  }
`;

const FileBox = styled.a`
  display: inline-block;
  padding: 10px;
  background: #111827;
  border-radius: 8px;
  color: #93c5fd;
  text-decoration: none;

  &:hover {
    background: #1f2937;
  }
`;

const Caption = styled.div`
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const IconButton = styled.button`
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.15s ease;

  &:hover {
    background: ${({ $delete, $edit }) =>
      $delete
        ? "#b91c1c33"
        : $edit
        ? "#2563eb33"
        : "transparent"};
  }
`;

const EditIcon = styled.img`
  width: 16px;
  height: 16px;
  opacity: 0.75;

  ${IconButton}:hover & {
    opacity: 1;
  }
`;

const DeleteIcon = styled.img`
  width: 16px;
  height: 16px;
  opacity: 0.75;

  ${IconButton}:hover & {
    opacity: 1;
  }
`;

const EditedBadge = styled.span`
  font-size: 11px;
  opacity: 0.6;
  margin-left: 6px;
`;

const ReplyPreview = styled.div`
  background: #111827;
  padding: 6px;
  border-left: 3px solid #2563eb;
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 12px;

  p {
    margin: 2px 0 0;
  }
`;

const ReactionBar = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
`;

const ReactionItem = styled.div`
  background: #111827;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
`;

export default ChatMessage;