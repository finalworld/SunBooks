export function LoginPage({ onLogin, error }: { onLogin: () => void; error?: string }) {
  return <main className="login"><div className="login-card">
    <img src="/sunbooks-logo.png" alt="SunBooks" />
    <p>Din egen bokhylla, alltid nära.</p>
    <button onClick={onLogin}><span className="google-g">G</span> Fortsätt med Google</button>
    {error && <div className="login-error">{error}</div>}
    <small>Dina böcker sparas privat på ditt konto.</small>
  </div></main>;
}
