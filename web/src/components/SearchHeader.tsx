import { Camera, ChevronRight, HelpCircle, ScanText, Search, X } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../i18n";

type Props={query:string;advanced:boolean;onQuery:(value:string)=>void;onSearch:()=>void;onClear:()=>void;onMenu:()=>void;onAdvanced:()=>void;onBarcode:()=>void;onText:()=>void};

export function SearchHeader(props:Props){
  const{t}=useI18n();
  const[helpOpen,setHelpOpen]=useState(false);
  return <>
    <div className="sticky-search-header">
      <header className="topbar"><button className="icon-button menu-button" onClick={props.onMenu} aria-label={t("openMenu")}><img src="/assets/menu-ornate.png" alt=""/></button><form className="search-form" onSubmit={event=>{event.preventDefault();props.onSearch()}}><Search aria-hidden="true"/><input value={props.query} onChange={event=>props.onQuery(event.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")}/>{props.query&&<button type="button" className="clear" onClick={props.onClear} aria-label={t("close")}><X/></button>}</form></header>
      <div className="advanced-row"><button onClick={()=>setHelpOpen(open=>!open)}><HelpCircle/> {t("searchHelp")} <span>{helpOpen?"−":"?"}</span></button><button onClick={props.onAdvanced}>{t("advanced")} <span>{props.advanced?"−":"+"}</span></button></div>
    </div>
    {helpOpen&&<section className="search-help-panel"><button className="search-help-close" onClick={()=>setHelpOpen(false)} aria-label={t("close")}><X/></button><h2>{t("searchHelpTitle")}</h2><p>{t("searchHelpIntro")}</p><ul><li>{t("searchHelpTitleItem")}</li><li>{t("searchHelpAuthorItem")}</li><li>{t("searchHelpCodeItem")}</li><li>{t("searchHelpLinkItem")}</li></ul><small>{t("searchHelpExample")}</small></section>}
    {props.advanced&&<section className="advanced-panel"><button className="scan-card" onClick={props.onBarcode}><Camera/><span><strong>{t("scanBook")}</strong><small>{t("scanBarcode")}</small></span><ChevronRight/></button><button className="scan-card" onClick={props.onText}><ScanText/><span><strong>{t("scanText")}</strong><small>{t("scanScreen")}</small></span><ChevronRight/></button><p>{t("manualCode")}</p></section>}
  </>
}
