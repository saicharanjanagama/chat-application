import { useState } from "react";
import styled from "styled-components";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../services/firebase";

function SignIn() {
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>Welcome to Chat App 👋</Title>

        <GoogleButton onClick={login} disabled={loading}>
          {loading ? "Please wait..." : "Sign In with Google"}
        </GoogleButton>

        <Description>
          Respect others — behave kindly 😄
        </Description>
      </LoginCard>
    </LoginContainer>
  );
}

/* ---------------- Styled Components ---------------- */

const LoginContainer = styled.div`
  height: 80vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LoginCard = styled.div`
  background: #161b22;
  padding: 40px 45px;
  border-radius: 14px;
  width: 350px;
  text-align: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
`;

const Title = styled.h2`
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 20px;
`;

const GoogleButton = styled.button`
  padding: 12px 20px;
  width: 100%;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: white;
  font-size: 15px;
  transition: 0.25s ease;

  &:hover {
    background: #1d4ed8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Description = styled.p`
  color: #9ca3af;
  font-size: 14px;
  margin-top: 14px;
`;

export default SignIn;