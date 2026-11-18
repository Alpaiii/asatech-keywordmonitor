"use client";

import { useActionState } from "react";
import { login, signup, type AuthState } from "./actions";

const initialState: AuthState = {};

export function AuthForm() {
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState,
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    initialState,
  );
  const error = loginState.error ?? signupState.error;

  return (
    <form className="mt-8 space-y-5">
      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor="email"
        >
          Email
        </label>
        <input
          autoComplete="email"
          className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor="password"
        >
          Password
        </label>
        <input
          autoComplete="current-password"
          className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>
      {error ? (
        <p
          className="rounded-xl border border-red-900 bg-red-950/60 p-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60"
          disabled={loginPending || signupPending}
          formAction={loginAction}
        >
          Masuk
        </button>
        <button
          className="rounded-xl border border-slate-700 px-4 py-3 font-semibold disabled:opacity-60"
          disabled={loginPending || signupPending}
          formAction={signupAction}
        >
          Daftar lokal
        </button>
      </div>
    </form>
  );
}
