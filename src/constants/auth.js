// 로그인/가입/탈퇴 문구와 서버 오류 → 한국어 안내 변환표
export const PASSWORD_MIN = 6; // Supabase 기본 최소 길이와 같다(대시보드 Authentication 설정을 바꾸면 함께 바꾼다)

export const PROVIDER_LABEL = { kakao: "카카오", google: "Google", email: "이메일" };

export const AUTH_TEXT = {
  confirmSent: "인증 메일을 보냈어요. 메일의 링크를 눌러 인증한 뒤 로그인해 주세요.",
  resetSent: "비밀번호 재설정 메일을 보냈어요. 메일의 링크를 눌러 새 비밀번호를 정해 주세요.",
  forgot: "비밀번호를 잊으셨나요?",
  emailFormat: "이메일 형식을 확인해 주세요.",
  passwordShort: `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`,
  demoNotice: "미리보기에서는 실제 인증 서버 대신 데모 계정으로 로그인돼요.",
  loading: "불러오는 중…",
  resetTitle: "새 비밀번호 설정",
  resetHint: "새로 사용할 비밀번호를 입력해 주세요.",
  resetPlaceholder: `새 비밀번호 (${PASSWORD_MIN}자 이상)`,
  resetConfirm: "새 비밀번호 확인",
  resetMismatch: "비밀번호가 서로 달라요.",
  resetOk: "비밀번호 변경",
  withdraw: "회원 탈퇴",
  withdrawTitle: "정말 탈퇴하시겠어요?",
  withdrawBody: "탈퇴하면 계정과 서버에 저장된 일정·이용권·찜이 바로 삭제되고, 되돌릴 수 없어요. 이 기기에 저장된 데이터도 함께 지워져요.",
  withdrawHint: "먼저 아래 '데이터 백업'의 내보내기로 파일을 저장해 두면 안전해요.",
  withdrawOk: "탈퇴하기",
  withdrawFailed: "탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.",
};

// [정규식, 안내문]: 서버 오류의 code/message 에 처음 맞는 항목을 쓴다
export const AUTH_ERRORS = [
  [/user_already_exists|already registered|already been registered/i, "이미 가입된 이메일이에요. 로그인해 주세요."],
  [/invalid_credentials|invalid login credentials/i, "이메일 또는 비밀번호가 맞지 않아요."],
  [/email_not_confirmed|email not confirmed/i, "이메일 인증이 아직 끝나지 않았어요. 받은 메일의 링크를 눌러 주세요."],
  [/weak_password|password should be at least/i, `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`],
  [/same_password|different from the old password/i, "이전과 다른 비밀번호를 입력해 주세요."],
  [/over_email_send_rate_limit|over_request_rate_limit|rate limit|too many requests/i, "요청이 너무 많아요. 잠시 후 다시 시도해 주세요."],
  [/email_address_invalid|invalid.*email|unable to validate email/i, "이메일 형식을 확인해 주세요."],
  [/provider is not enabled|unsupported provider/i, "이 로그인 방식은 아직 준비되지 않았어요."],
  [/failed to fetch|networkerror|network request failed|load failed/i, "네트워크 연결을 확인해 주세요."],
];
export const AUTH_ERROR_DEFAULT = "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
