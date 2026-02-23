import styled from "styled-components";
import { shortName, avatarFromSeed } from "../utils/helpers";
import { useEffect, useRef, useState, memo } from "react";
import Profile from "../features/profile/Profile";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { motion, AnimatePresence } from "framer-motion";

function Header({ user }) {
  const [openProfile, setOpenProfile] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);

  const menuRef = useRef(null);

  /* -------- Close on outside click -------- */
  useEffect(() => {
    const handleClickOutside = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* -------- Close on ESC -------- */
  useEffect(() => {
    const handleEsc = e => {
      if (e.key === "Escape") {
        setOpenMenu(false);
        setOpenProfile(false);
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () =>
      document.removeEventListener("keydown", handleEsc);
  }, []);

  if (!user) return null;

  const { displayName, email, photoURL } = user;

  return (
    <>
      <HeaderWrapper>
        <Title>💬 Chat App</Title>

        <AvatarMenuWrapper ref={menuRef}>
          <Avatar
            src={photoURL || avatarFromSeed(displayName || email)}
            referrerPolicy="no-referrer"
            alt="avatar"
            onClick={() => setOpenMenu(v => !v)}
          />

          <UserName>
            {displayName || shortName(email)}
          </UserName>

          <AnimatePresence>
            {openMenu && (
              <Menu
                as={motion.div}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.18 }}
              >
                <MenuItem
                  onClick={() => {
                    setOpenProfile(true);
                    setOpenMenu(false);
                  }}
                >
                  👤 Profile
                </MenuItem>

                <MenuItem
                  $danger
                  onClick={async () => {
                    setOpenMenu(false);
                    await signOut(auth);
                  }}
                >
                  🚪 Sign Out
                </MenuItem>
              </Menu>
            )}
          </AnimatePresence>
        </AvatarMenuWrapper>
      </HeaderWrapper>

      <AnimatePresence>
        {openProfile && (
          <Profile
            user={user}
            onClose={() => setOpenProfile(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(Header);

/* ---------------- STYLES ---------------- */

const HeaderWrapper = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1f2937;
  padding: 15px 25px;
  height: 10vh;
  border-radius: 10px;
  margin: 5px;
  margin-bottom: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.5px;
`;

const AvatarMenuWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  object-fit: cover;
  transition: all 0.25s ease;

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 0 0 2px #2563eb;
  }
`;

const UserName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #e5e7eb;
  transition: color 0.2s ease;

  &:hover {
    color: #93c5fd;
  }
`;

const Menu = styled.div`
  position: absolute;
  top: 50px;
  right: 0;
  background: rgba(31, 41, 55, 0.95);
  border-radius: 12px;
  padding: 8px;
  min-width: 160px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
  z-index: 50;
  backdrop-filter: blur(12px);
`;

const MenuItem = styled.button`
  width: 100%;
  background: transparent;
  border: none;
  padding: 10px 14px;
  color: ${({ $danger }) => ($danger ? "#f87171" : "#e5e7eb")};
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? "#7f1d1d" : "#374151"};
  }
`;