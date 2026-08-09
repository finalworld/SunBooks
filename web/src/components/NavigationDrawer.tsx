import type { User } from "firebase/auth";
import { BookOpen, Library, Settings, X } from "lucide-react";
import type { View } from "../types";

export function NavigationDrawer({ user, count, onClose, onNavigate, onSignOut }: { user: User; count: number; onClose: () => void; onNavigate: (view: View) => void; onSignOut: () => void }) {
  return <><button className="scrim" onClick={onClose} aria-label="Stäng meny" /><aside className="drawer">
    <div className="drawer-user"><img src={user.photoURL || "/sunbooks-logo.png"} alt="" /><div><strong>{user.displayName}</strong><span>{user.email}</span></div><button onClick={onClose} aria-label="Stäng"><X /></button></div>
    <nav><button onClick={() => onNavigate("home")}><BookOpen /> Startsida</button><button onClick={() => onNavigate("library")}><Library /> Mitt bibliotek <span>{count}</span></button><button onClick={() => onNavigate("settings")}><Settings /> Inställningar</button></nav>
    <button className="signout" onClick={onSignOut}>Logga ut</button>
  </aside></>;
}
