import styled from "styled-components";
// import SignOut from "./SignOut";
import { shortName, avatarFromSeed } from "../utils/helpers";
import { useEffect, useRef, useState } from "react";
import Profile from "../features/profile/Profile";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

function Header({ user }) {
  const [openProfile, setOpenProfile] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setOpenMenu(false);
    setOpenProfile(false);
  }, [user]);

  if (!user) return null;

  const { displayName, email, photoURL } = user;

  return (
    <>
      <HeaderWrapper >
        <Title>🔥 Chat App</Title>
        <AvatarMenuWrapper ref={menuRef}>
          {/* Avatar */}
          <Avatar
            src={photoURL || avatarFromSeed(displayName || email)}
            referrerPolicy="no-referrer"
            alt="avatar"
            onClick={() => setOpenMenu(v => !v)}
          /> {displayName || shortName(email)}
                

          {/* Dropdown menu */}
          {openMenu && (
            <Menu>
              <MenuItem
                onClick={() => {
                  setOpenProfile(true);
                  setOpenMenu(false);
                }}
              >
                Profile
              </MenuItem>

              <MenuItem
                $danger
                onClick={() => signOut(auth)}
              >
                Sign Out
              </MenuItem>
            </Menu>
          )}
        </AvatarMenuWrapper>
      </HeaderWrapper>

      {/* Profile Modal */}
      {openProfile && (
        <Profile
          user={user}
          onClose={() => setOpenProfile(false)}
        />
      )}
    </>
  );
}

/* ---------------- Styled Components ---------------- */

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
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
`;

const Title = styled.h1`
/* border: 2px solid red; */
  font-size: 24px;
  font-weight: bold;
`;

const AvatarMenuWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  /* border: 2px solid white; */
`;

const Avatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  object-fit: cover;
`;

const Menu = styled.div`
  position: absolute;
  top: 60px;
  right: 25px;
  background: #1f2937;
  border-radius: 10px;
  padding: 6px;
  min-width: 140px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.4);
  z-index: 50;
`;

const MenuItem = styled.button`
  width: 100%;
  background: transparent;
  border: none;
  padding: 10px 12px;
  color: ${({ $danger }) => ($danger ? "#f87171" : "#e5e7eb")};
  text-align: left;
  cursor: pointer;
  border-radius: 6px;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? "#7f1d1d" : "#374151"};
  }
`;

export default Header;