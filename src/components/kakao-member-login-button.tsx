"use client";

type KakaoMemberLoginButtonProps = {
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  id?: string;
  className?: string;
  label?: string;
};

export function KakaoMemberLoginButton({
  busy = false,
  disabled = false,
  onClick,
  id = "member-kakao-login",
  className = "member-login-kakao-btn touch-manipulation",
  label = "카카오싱크로 시작하기",
}: KakaoMemberLoginButtonProps) {
  return (
    <button
      id={id}
      type="button"
      className={className}
      disabled={disabled || busy}
      onClick={onClick}
    >
      <span className="member-login-kakao-btn__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M9 1.5C4.86 1.5 1.5 4.35 1.5 7.8c0 2.145 1.425 4.0125 3.5625 5.085L3.75 15.75l3.4875-2.2875c.675.1125 1.3875.1875 2.1375.1875 4.14 0 7.5-2.85 7.5-6.3S13.14 1.5 9 1.5Z"
          />
        </svg>
      </span>
      {label}
    </button>
  );
}
