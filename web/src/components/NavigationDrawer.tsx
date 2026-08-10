import { useState } from "react";
import type { User } from "firebase/auth";
import { BarChart3, BookOpen, Compass, Library, Power, Settings } from "lucide-react";
import type { View } from "../types";
import { useI18n } from "../i18n";

const APP_VERSION="0.6.2";

export function NavigationDrawer({user,count,onClose,onNavigate,onSignOut}:{user:User;count:number;onClose:()=>void;onNavigate:(view:View)=>void;onSignOut:()=>void}){
  const{t}=useI18n();const[confirmSignOut,setConfirmSignOut]=useState(false);
  return <><button className="scrim" onClick={onClose} aria-label={t("close")}/><aside className="drawer parchment-drawer"><div className="drawer-brand"><h1>SunReads</h1><button onClick={onClose} aria-label={t("close")}><img src="/assets/drawer-close-transparent.png" alt=""/></button></div><div className="drawer-scroll"><nav><button onClick={()=>onNavigate("home")}><BookOpen/>{t("home")}</button><button onClick={()=>onNavigate("library")}><Library/>{t("library")}<span>{count}</span></button><button onClick={()=>onNavigate("discover")}><Compass/>{t("discover")}</button><button onClick={()=>onNavigate("stats")}><BarChart3/>{t("statistics")}</button><button onClick={()=>onNavigate("settings")}><Settings/>{t("settings")}</button></nav></div><div className="drawer-footer"><div className="drawer-account-card"><div className="drawer-user"><img src={user.photoURL||"/sunbooks-logo.png"} alt=""/><div><strong>{user.displayName}</strong><span>{user.email}</span></div></div><button className="signout" onClick={()=>setConfirmSignOut(true)} aria-label={t("signOut")}><Power/><small>{t("signOut")}</small></button></div>{confirmSignOut&&<div className="signout-confirm"><strong>{t("signOutConfirm")}</strong><div><button onClick={()=>setConfirmSignOut(false)}>{t("cancel")}</button><button className="danger" onClick={onSignOut}>{t("confirmSignOut")}</button></div></div>}<small>SunReads v{APP_VERSION}</small></div></aside></>
}
