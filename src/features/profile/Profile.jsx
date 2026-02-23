import { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "../../services/firebase";

function Profile({ user, onClose }) {
  const uid = user.uid;

  const [profile, setProfile] = useState(null);
  const [about, setAbout] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  const cardRef = useRef();

  /* ---------------- REALTIME PROFILE ---------------- */

  useEffect(() => {
    const unsub = onSnapshot(
      doc(firestore, "users", uid),
      snap => {
        const data = snap.data();
        setProfile(data);

        if (!isEditing) {
          setAbout(data?.about || "");
        }
      }
    );

    return () => unsub();
  }, [uid, isEditing]);

  /* ---------------- CLOSE ON ESC ---------------- */

  useEffect(() => {
    const handleKey = e => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  /* ---------------- CLOSE ON OUTSIDE CLICK ---------------- */

  const handleOutsideClick = e => {
    if (cardRef.current && !cardRef.current.contains(e.target)) {
      onClose();
    }
  };

  /* ---------------- AVATAR UPLOAD ---------------- */

  const handleAvatarChange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const fileRef = ref(storage, `avatars/${uid}/avatar.jpg`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      await updateDoc(doc(firestore, "users", uid), {
        photoURL: url
      });

      setPreview(null);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }

    setUploading(false);
  };

  /* ---------------- SAVE ABOUT ---------------- */

  const saveAbout = async () => {
    if (about === profile?.about) {
      setIsEditing(false);
      return;
    }

    setSaving(true);

    try {
      await updateDoc(doc(firestore, "users", uid), {
        about
      });
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }

    setSaving(false);
    setIsEditing(false);
  };

  return (
    <Overlay onClick={handleOutsideClick}>
      <Card
        ref={cardRef}
        as={motion.div}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Title>Profile</Title>

        <AvatarWrapper>
          <Avatar
            src={
              preview ||
              profile?.photoURL ||
              user.photoURL ||
              "https://ui-avatars.com/api/?name=User"
            }
            referrerPolicy="no-referrer"
          />

          <UploadLabel>
            {uploading ? "Uploading..." : "Change Photo"}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </UploadLabel>
        </AvatarWrapper>

        <Name>
          {profile?.name || user.displayName || "User"}
        </Name>

        {!isEditing ? (
          <AboutText
            onClick={() => setIsEditing(true)}
            title="Click to edit status"
          >
            {profile?.about || "Click to add your status"}
          </AboutText>
        ) : (
          <Textarea
            autoFocus
            placeholder="About / Status"
            value={about}
            onChange={e => setAbout(e.target.value)}
          />
        )}

        <Actions>
          {isEditing ? (
            <>
              <Primary
                disabled={saving}
                onClick={saveAbout}
              >
                {saving ? "Saving..." : "Save"}
              </Primary>
              <Secondary
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Secondary>
            </>
          ) : (
            <Secondary onClick={onClose}>
              Close
            </Secondary>
          )}
        </Actions>
      </Card>
    </Overlay>
  );
}

/* ---------------- STYLING ---------------- */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
`;

const Card = styled.div`
  background: #0f172a;
  width: 340px;
  padding: 28px;
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
`;

const Title = styled.h2`
  margin-bottom: 14px;
  color: white;
`;

const AvatarWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Avatar = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #2563eb;
  margin-bottom: 10px;
`;

const UploadLabel = styled.label`
  font-size: 13px;
  color: #38bdf8;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    color: #60a5fa;
  }
`;

const Name = styled.h3`
  margin: 12px 0;
  color: white;
`;

const AboutText = styled.p`
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 16px;
  cursor: pointer;
  min-height: 40px;

  &:hover {
    color: #e2e8f0;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  height: 80px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 10px;
  color: white;
  resize: none;
  margin-bottom: 16px;

  &:focus {
    outline: none;
    border-color: #2563eb;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
`;

const Primary = styled.button`
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: #2563eb;
  color: white;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Secondary = styled.button`
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: #334155;
  color: white;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    background: #475569;
  }
`;

export default Profile;