import { useRef, useState } from "react";
import type { User } from "firebase/auth";
import { Check, Download, Languages, Monitor, Moon, Settings, Sun, Trash2, Upload } from "lucide-react";
import type { Book, Theme } from "../types";
import { useI18n } from "../i18n";

type Props={theme:Theme;setTheme:(theme:Theme)=>void;user:User;books:Book[];onImport:(books:Book[])=>Promise<void>;onDeleteLibrary:()=>Promise<void>;onDeleteAccount:()=>Promise<void>};

export function SettingsPage({theme,setTheme,user,books,onImport,onDeleteLibrary,onDeleteAccount}:Props){
  const {t,language,setLanguage}=useI18n();const fileRef=useRef<HTMLInputElement>(null);const [confirm,setConfirm]=useState<"library"|"account"|null>(null);
  const choices=[["system",t("system"),Monitor],["light",t("light"),Sun],["dark",t("dark"),Moon]] as const;
  function exportData(){const payload=JSON.stringify({app:"SunBooks",version:1,exportedAt:new Date().toISOString(),books},null,2);const url=URL.createObjectURL(new Blob([payload],{type:"application/json"}));const link=document.createElement("a");link.href=url;link.download=`sunbooks-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(url)}
  async function importFile(file?:File){if(!file)return;const data=JSON.parse(await file.text());if(Array.isArray(data.books))await onImport(data.books)}
  return <section className="content settings-page"><div className="content-heading"><div><p>{t("customize")}</p><h1>{t("settings")}</h1></div><Settings/></div>
    <div className="settings-card"><h2>{t("language")}</h2><p>{t("languageHelp")}</p><div className="language-options"><button className={language==="sv"?"selected":""} onClick={()=>setLanguage("sv")}><Languages/><span>{t("swedish")}</span>{language==="sv"&&<Check/>}</button><button className={language==="en"?"selected":""} onClick={()=>setLanguage("en")}><Languages/><span>{t("english")}</span>{language==="en"&&<Check/>}</button></div></div>
    <div className="settings-card"><h2>{t("theme")}</h2><p>{t("themeHelp")}</p><div className="theme-options">{choices.map(([id,label,Icon])=><button className={theme===id?"selected":""} onClick={()=>setTheme(id)} key={id}><Icon/><span>{label}</span>{theme===id&&<Check/>}</button>)}</div></div>
    <div className="settings-card data-card"><h2>Data</h2><p>{t("exportHelp")}</p><button onClick={exportData}><Download/>{t("exportData")}</button><p>{t("importHelp")}</p><button onClick={()=>fileRef.current?.click()}><Upload/>{t("importData")}</button><input ref={fileRef} hidden type="file" accept="application/json" onChange={event=>importFile(event.target.files?.[0])}/></div>
    <div className="settings-card account"><h2>{t("account")}</h2><p>{user.email}</p><span>{t("googleAccount")}</span></div>
    <div className="settings-card danger-zone"><h2>{t("deleteData")}</h2><p>{t("deleteDataHelp")}</p><button onClick={()=>setConfirm("library")}><Trash2/>{t("deleteData")}</button><h2>{t("deleteAccount")}</h2><p>{t("deleteAccountHelp")}</p><button onClick={()=>setConfirm("account")}><Trash2/>{t("deleteAccount")}</button></div>
    {confirm&&<div className="inline-confirm"><strong>{confirm==="library"?t("deleteLibraryConfirm"):t("deleteAccountConfirm")}</strong><p>{t("deleteLibraryWarning")}</p><div><button onClick={()=>setConfirm(null)}>{t("cancel")}</button><button className="danger" onClick={async()=>{if(confirm==="library")await onDeleteLibrary();else await onDeleteAccount();setConfirm(null)}}>{t("confirmDelete")}</button></div></div>}
  </section>;
}
