import { useEffect, useState } from "react";
import styled from "styled-components";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "../../services/firebase";

function Profile({ user, onClose }) {
  const uid = user.uid;

  const [profile, setProfile] = useState(null);
  const [about, setAbout] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ---------- Load profile ---------- */
  useEffect(() => {
    const unsub = onSnapshot(
      doc(firestore, "users", uid),
      snap => {
        const data = snap.data();
        setProfile(data);

        // 🚫 do not override local edits
        if (!isEditing) {
          setAbout(data?.about || "");
        }
      }
    );

    return () => unsub();
  }, [uid, isEditing]);

  /* ---------- Upload Avatar ---------- */
  const handleAvatarChange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileRef = ref(storage, `avatars/${uid}/avatar.jpg`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      await updateDoc(doc(firestore, "users", uid), {
        photoURL: url,
      });
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }

    setUploading(false);
  };

  /* ---------- Save About ---------- */
  const saveAbout = async () => {
    await updateDoc(doc(firestore, "users", uid), {
      about,
    });
    setIsEditing(false);
  };

  return (
    <Overlay>
      <Card>
        <Title>Profile</Title>

        {/* Avatar */}
        <Avatar
          src={profile?.photoURL || user.photoURL}
          referrerPolicy="no-referrer"
        />

        <UploadLabel>
          {uploading ? "Uploading..." : "Change photo"}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={handleAvatarChange}
          />
        </UploadLabel>

        {/* Name */}
        <Name>{profile?.name || user.displayName}</Name>

        {/* About / Status */}
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
            onBlur={async () => {
            if (about !== profile?.about) {
                await updateDoc(
                doc(firestore, "users", uid),
                { about }
                );
            }
            setIsEditing(false);
            }}
        />
        )}


        {/* Actions */}
        <Actions>
          {isEditing ? (
            <>
              <Primary onClick={saveAbout}>Save</Primary>
              <Secondary onClick={() => setIsEditing(false)}>
                Cancel
              </Secondary>
            </>
          ) : (
            <Secondary onClick={onClose}>Close</Secondary>
          )}
        </Actions>
      </Card>
    </Overlay>
  );
}

/* ---------------- Styles ---------------- */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
`;

const Card = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: #111827;
    padding: 28px;
    width: 320px;
    border-radius: 16px;
    text-align: center;
`;

const Title = styled.h2`
  margin-bottom: 10px;
`;

const Avatar = styled.img`
  width: 110px;
  height: 110px;
  border-radius: 50%;
  object-fit: cover;
  margin: 10px 0;
`;

const UploadLabel = styled.label`
  display: inline-block;
  margin-bottom: 10px;
  color: #38bdf8;
  cursor: pointer;
  font-size: 14px;
`;

const Name = styled.h3`
  margin: 10px 0;
`;

const AboutText = styled.p`
  font-size: 14px;
  color: #9ca3af;
  margin: 8px 0 16px;
  cursor: pointer;
  line-height: 1.4;

  &:hover {
    color: #e5e7eb;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  height: 70px;
  background: #1f2937;
  border: none;
  border-radius: 8px;
  padding: 10px;
  color: white;
  resize: none;
  margin-bottom: 10px;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
`;

const Primary = styled.button`
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: #2563eb;
  color: white;
  cursor: pointer;
`;

const Secondary = styled.button`
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: #374151;
  color: white;
  cursor: pointer;
`;

export default Profile;
