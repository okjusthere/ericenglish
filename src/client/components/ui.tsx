import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
export function Panel({children,className=''}:PropsWithChildren<{className?:string}>){return <section className={`panel ${className}`}>{children}</section>}
export function Button({children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button className={`button ${className}`} {...props}>{children}</button>}
export function Eyebrow({children}:PropsWithChildren){return <div className="eyebrow">{children}</div>}
export function Empty({title,children}:PropsWithChildren<{title:string}>){return <div className="empty"><div className="empty-mark">E</div><h3>{title}</h3><p>{children}</p></div>}
export function Metric({label,value,detail}: {label:string;value:ReactNode;detail?:string}){return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>}
export function ProgressRing({value,label}:{value:number;label:string}){return <div className="progress-ring" style={{'--progress':`${Math.max(0,Math.min(100,value))*3.6}deg`} as React.CSSProperties}><div><strong>{Math.round(value)}%</strong><span>{label}</span></div></div>}
export function JsonText({value}:{value:unknown}){if(typeof value==='string'){try{return <>{JSON.stringify(JSON.parse(value),null,2)}</>}catch{return <>{value}</>}}return <>{JSON.stringify(value,null,2)}</>}
