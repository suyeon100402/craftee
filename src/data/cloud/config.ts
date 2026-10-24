/*
 * Supabase 프로젝트 주소와 공개용 키.
 * Supabase 대시보드 → Project Settings → API 에서 복사한다.
 * 이 키는 브라우저에 그대로 들어가도 되는 공개용 키다(누가 무엇을 볼 수 있는지는 supabase/schema.sql의 보안 규칙이 막는다).
 * service_role / secret 키는 절대 여기에 넣지 않는다.
 */
export const SUPABASE_URL = '';
export const SUPABASE_KEY = '';

export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
