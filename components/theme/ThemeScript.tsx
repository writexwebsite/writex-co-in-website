import { themeConfig } from "@/lib/theme/themeConfig";

export function ThemeScript() {
  const script = `(()=>{try{const k="wx_theme_mode",c="wx_theme_mode",valid=v=>v==="auto"||v==="light"||v==="dark";let m=null;try{const v=localStorage.getItem(k);if(valid(v))m=v}catch{}if(!m){const x=document.cookie.split(";").map(v=>v.trim()).find(v=>v.startsWith(c+"="));const v=x&&x.slice(c.length+1);if(valid(v))m=v}m=m||"auto";let r=m;if(m==="auto"){const h=new Date().getHours();r=Number.isFinite(h)?(h>=${themeConfig.dayStartHour}&&h<${themeConfig.nightStartHour}?"light":"dark"):(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")}const e=document.documentElement;e.dataset.theme=r;e.dataset.themeMode=m;e.style.colorScheme=r;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",r==="dark"?"${themeConfig.darkThemeColor}":"${themeConfig.lightThemeColor}")}catch{document.documentElement.dataset.theme="light"}})();`;

  return <script id="wx-theme-script" dangerouslySetInnerHTML={{ __html: script }} />;
}
