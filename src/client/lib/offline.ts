import { openDB } from 'idb';
const db=()=>openDB('english-os-offline',1,{upgrade(database){database.createObjectStore('captures',{keyPath:'id'});}});
export interface OfflineCapture {id:string;captureType:string;text:string;context:string;createdAt:string;}
export async function queueCapture(capture:OfflineCapture){await (await db()).put('captures',capture);}
export async function queuedCaptures(){return (await db()).getAll('captures') as Promise<OfflineCapture[]>;}
export async function removeQueuedCapture(id:string){await (await db()).delete('captures',id);}
