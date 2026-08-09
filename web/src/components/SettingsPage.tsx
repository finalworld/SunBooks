import type { User } from "firebase/auth";
import { Check, Monitor, Moon, Settings, Sun } from "lucide-react";
import type { Theme } from "../types";

export function SettingsPage({ theme, setTheme, user }: { theme: Theme; setTheme: (theme: Theme) => void; user: User }) {
  const choices = [["system", "Följ enheten", Monitor], ["light", "Ljust beige", Sun], ["dark", "Mörkgrått", Moon]] as const;
  return <section className="content settings-page">
    <div className="content-heading"><div><p>ANPASSA</p><h1>Inställningar</h1></div><Settings /></div>
    <div className="settings-card"><h2>Tema</h2><p>Välj hur SunBooks ska se ut.</p><div className="theme-options">
      {choices.map(([id, label, Icon]) => <button className={theme === id ? "selected" : ""} onClick={() => setTheme(id)} key={id}><Icon /><span>{label}</span>{theme === id && <Check />}</button>)}
    </div></div>
    <div className="settings-card account"><h2>Konto</h2><p>{user.email}</p><span>Google-konto</span></div>
  </section>;
}
