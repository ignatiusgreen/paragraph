import { passwordSignIn, sendCode, verifyCode } from "./actions";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; email?: string; sent?: string }> }) {
  const { error, email, sent } = await searchParams;
  return (
    <main className="login">
      <div className="login-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="Paragraph" width={220} height={66} />
        <div className="card stack">
          <h1 className="card-title">Dashboard sign-in</h1>
          {error ? <div className="notice warn" role="alert">{error}</div> : null}
          {sent ? (
            <form action={verifyCode} className="stack">
              <input type="hidden" name="email" value={email} />
              <p className="muted small">We sent a sign-in code to {email}.</p>
              <div className="field">
                <label htmlFor="code">Code from the email</label>
                <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus />
              </div>
              <button className="btn" type="submit">Sign in</button>
              <a className="small" href="/login">Use a password instead</a>
            </form>
          ) : (
            <form action={passwordSignIn} className="stack">
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="off" defaultValue={email} required />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" />
              </div>
              <button className="btn" type="submit">Sign in</button>
              <button className="btn ghost" type="submit" formAction={sendCode} formNoValidate>Email me a code instead</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
