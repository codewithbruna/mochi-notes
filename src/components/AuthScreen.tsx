import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, MoonStar, Sparkles, UserRound } from "lucide-react";
import type { AuthStatus, CredentialsInput, SignUpInput } from "../types";

type AuthMode = "login" | "signup";

interface AuthScreenProps {
  onAuthenticated: (status: AuthStatus) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const status = mode === "signup"
        ? await window.mochi.signUp({ name, email, password } satisfies SignUpInput)
        : await window.mochi.signIn({ email, password } satisfies CredentialsInput);
      onAuthenticated(status);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível acessar sua conta.");
    } finally {
      setSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError("");
  };

  return (
    <main className="auth-page">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />
      <div className="aurora-grain" />

      <section className="auth-intro" aria-label="Mochi Notes">
        <div className="auth-brand"><span className="auth-brand-mark">M</span> Mochi Notes</div>
        <div className="auth-copy">
          <span className="eyebrow"><Sparkles size={15} /> Seu espaço particular</span>
          <h1>Ideias que brilham mesmo depois do escuro.</h1>
          <p>Um lugar calmo para guardar lembretes, listas e pequenas descobertas do seu dia.</p>
        </div>
        <div className="auth-bottom-note"><MoonStar size={17} /> Privado, local e feito para o seu ritmo.</div>
      </section>

      <section className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-heading">
            <p>{mode === "login" ? "Bem-vinda de volta" : "Comece por aqui"}</p>
            <h2>{mode === "login" ? "Entre no seu universo" : "Crie seu espaço"}</h2>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
            <button className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")} type="button" role="tab" aria-selected={mode === "login"}>Entrar</button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")} type="button" role="tab" aria-selected={mode === "signup"}>Criar conta</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === "signup" && (
              <label>
                <span>Como podemos te chamar?</span>
                <div className="auth-input"><UserRound size={18} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" required /></div>
              </label>
            )}
            <label>
              <span>E-mail</span>
              <div className="auth-input"><Mail size={18} /><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" type="email" autoComplete="email" required /></div>
            </label>
            <label>
              <span>Senha</span>
              <div className="auth-input">
                <LockKeyhole size={18} />
                <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "No mínimo 6 caracteres" : "Sua senha"} type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
                <button className="password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" disabled={submitting} type="submit">
              {submitting ? "Só um instante..." : mode === "login" ? "Entrar no Mochi" : "Criar minha conta"}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>
          <p className="auth-footnote">Suas credenciais ficam apenas neste computador.</p>
        </div>
      </section>
    </main>
  );
}
