import { createContext, useContext, useState } from 'react';
import { store } from '../lib/store';

// 인증 스텁 (제공해주신 구조 그대로 반영)
export const auth = {
  async oauth(provider) { 
    return { type: "user", id: `${provider}-demo`, provider, name: provider === "kakao" ? "카카오 데모 계정" : "Google 데모 계정" }; 
  },
  async email(email) { 
    return { type: "user", id: `email-${email}`, provider: "email", name: email }; 
  },
};

const AuthContext = createContext(null);

// 1. 테스트용 고정 세션 객체 정의
const TEST_SESSION = {
  type: "user",
  id: "test-user-999",
  provider: "kakao",
  name: "테스트 클라이머"
}


export function AuthProvider({ children }) {
    // 배포용
//   const [session, setSession] = useState(() => store.get("clacale:session", null));

  // 개발용. localStorage에 세션이 없으면(null이면) TEST_SESSION을 기본값으로 사용
  const [session, setSession] = useState(() => {
    return store.get("clacale:session", null) ?? TEST_SESSION;
  });

// 카카오/구글 로그인 함수
  const loginWithOAuth = async (provider) => {
    const sess = await auth.oauth(provider);
    store.set("clacale:session", sess);
    setSession(sess);
  };

  // 이메일 로그인 함수
  const loginWithEmail = async (email) => {
    const sess = await auth.email(email);
    store.set("clacale:session", sess);
    setSession(sess);
  };

  const signOut = () => {
    store.set("clacale:session", null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, loginWithOAuth, loginWithEmail, signOut, auth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);