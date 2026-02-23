import { useState } from "react";
import styled from "styled-components";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../services/firebase";
import { motion } from "framer-motion";

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
      <LoginCard
        as={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
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
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(
    circle at top,
    #1f2937,
    #111827 60%
  );
`;

const LoginCard = styled.div`
  background: rgba(22, 27, 34, 0.95);
  padding: 40px 45px;
  border-radius: 16px;
  width: 350px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-3px);
  }
`;

const Title = styled.h2`
  font-size: 26px;
  font-weight: 600;
  margin-bottom: 22px;
  letter-spacing: 0.4px;
`;

const GoogleButton = styled.button`
  padding: 12px 20px;
  width: 100%;
  background: #2563eb;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: white;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.25s ease;

  &:hover:not(:disabled) {
    background: #1d4ed8;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Description = styled.p`
  color: #9ca3af;
  font-size: 14px;
  margin-top: 16px;
  line-height: 1.4;
`;

export default SignIn;