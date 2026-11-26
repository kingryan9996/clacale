// 저장 데이터 형식 버전: 일정/이용권/찜의 모양을 바꿀 때 1씩 올리고 lib/migrate.js 에 변환을 추가한다 (출시 전 개발 중에는 올리지 않는다)
export const SCHEMA_VERSION = 1;
export const SCHEMA_KEY = "clacale:schema";
export const BACKUP_APP = "clacale";
export const BACKUP_FILE_PREFIX = "clacale-backup";
export const BACKUP_META_PREFIX = "clacale:backup:"; // 계정별 백업 기록 { last, base, snooze }
export const BACKUP_REMIND_DAYS = 30; // 마지막 백업(없으면 사용 시작)으로부터 이만큼 지나면 백업을 권한다
export const BACKUP_SNOOZE_DAYS = 7; // "나중에" 누르면 이만큼 조용히
export const PREMIGRATE_PREFIX = "clacale:premigrate:"; // 변환 직전 원본을 한 번 보관하는 키 접두사

// 가져오기 실패 문구
export const BACKUP_ERRORS = {
  parse: "백업 파일을 읽을 수 없어요. 클라캘에서 내보낸 .json 파일인지 확인해 주세요.",
  app: "클라캘 백업 파일이 아니에요.",
  newer: "더 새로운 버전의 앱에서 만든 백업이에요. 앱을 새로고침한 뒤 다시 시도해 주세요.",
  empty: "백업 파일에 불러올 데이터가 없어요.",
};
