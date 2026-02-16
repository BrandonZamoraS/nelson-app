"use client";

import { useState } from "react";

type PasswordInputProps = {
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
};

export function PasswordInput({
  name,
  label,
  required = false,
  minLength = 8,
  autoComplete,
  placeholder,
  hint,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-input-wrapper">
        <input
          name={name}
          type={showPassword ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="password-input"
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          tabIndex={-1}
        >
          {showPassword ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 10C2.5 10 5 4.5 10 4.5C15 4.5 17.5 10 17.5 10C17.5 10 15 15.5 10 15.5C5 15.5 2.5 10 2.5 10Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.95 14.95C13.5255 16.0358 11.7904 16.6374 10 16.6667C5 16.6667 2.5 10 2.5 10C3.43717 8.06819 4.80629 6.38045 6.5 5.05M8.25 3.53333C8.82379 3.3775 9.41076 3.29841 10 3.29999C15 3.29999 17.5 9.99999 17.5 9.99999C17.0111 10.9463 16.4235 11.8373 15.75 12.6583M11.7667 11.7667C11.5378 12.0123 11.2617 12.2093 10.9548 12.3459C10.6478 12.4826 10.3165 12.556 9.98045 12.562C9.64445 12.5679 9.31068 12.5062 8.99937 12.3805C8.68807 12.2548 8.40532 12.0675 8.16791 11.8301C7.9305 11.5927 7.74316 11.3099 7.61747 10.9986C7.49179 10.6873 7.43012 10.3536 7.43605 10.0175C7.44198 9.68154 7.51538 9.35019 7.65206 9.04327C7.78873 8.73634 7.98566 8.46019 8.23133 8.23133"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2.5 2.5L17.5 17.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}
