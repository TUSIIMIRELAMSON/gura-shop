'use client';
import React,{useEffect,useState} from 'react';
import {ArrowRight,ChevronLeft,ChevronRight,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {api} from '@/lib/client-api';
import {Promotion,promotionDestination} from '@/lib/promotions';
import './promotions.css';

export function PromotionScreen({items,logo,open,onClose,onVisit}:{items:Promotion[];logo:string|null;open:boolean;onClose:()=>void;onVisit:(p:Promotion)=>void}){
  const [index,setIndex]=useState(0),[logoFailed,setLogoFailed]=useState(false),[imageFailed,setImageFailed]=useState(false);
  const p=items[Math.min(index,Math.max(0,items.length-1))];
  useEffect(()=>setLogoFailed(false),[logo]);
  useEffect(()=>setImageFailed(false),[p?.image_url]);
  return <Dialog open={open} onOpenChange={value=>{if(!value)onClose();}}>
    <DialogContent className="opening-promotion" showCloseButton={false} onOpenAutoFocus={event=>{event.preventDefault();document.getElementById('skip-opening-promotion')?.focus();}}>
      <div className="promotion-top"><strong>GURA <span>SHOPS</span></strong><Button id="skip-opening-promotion" variant="ghost" onClick={onClose}>Skip <X size={17}/></Button></div>
      <div className={'promotion-body '+(!p?'promotion-welcome':'')}>
        {p&&<p className="promotion-eyebrow">Current deals</p>}
        <DialogTitle className="promotion-title">{p?.title||'Welcome to GURA SHOPS'}</DialogTitle>
        <DialogDescription className="promotion-description">{p?.description||'Your shops. Your everyday finds.'}</DialogDescription>
        {p?.image_url&&!imageFailed&&<img className="promotion-artwork" src={p.image_url} alt={p.title} onError={()=>setImageFailed(true)}/>}
        {!p&&<div className="welcome-wordmark" aria-hidden="true">GURA<span>•</span></div>}
        <div className="promotion-actions"><Button onClick={()=>p?onVisit(p):onClose()}>{p?.button_label||'Start shopping'}<ArrowRight size={18}/></Button>
          {p&&<small>Ends {new Date(p.ends_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</small>}
        </div>
      </div>
      <footer className="promotion-footer">
        {items.length>1&&<div className="promotion-pagination" aria-label="Offers"><Button variant="ghost" size="icon" aria-label="Previous offer" onClick={()=>setIndex(i=>(i-1+items.length)%items.length)}><ChevronLeft/></Button><span aria-live="polite">{Math.min(index+1,items.length)} / {items.length}</span><Button variant="ghost" size="icon" aria-label="Next offer" onClick={()=>setIndex(i=>(i+1)%items.length)}><ChevronRight/></Button></div>}
        {logo&&!logoFailed?<img className="mclam-logo" src={logo} alt="McLAM" onError={()=>setLogoFailed(true)}/>:<strong className="mclam-wordmark">McLAM</strong>}
        <span>McLAM OnlineShops</span>
      </footer>
    </DialogContent>
  </Dialog>;
}

export default function OpeningPromotions({navigate}:{navigate:(path:string)=>void}){
  const [data,setData]=useState<{items:Promotion[];logo_url:string|null}|null>(null),[open,setOpen]=useState(false),[now,setNow]=useState(Date.now());
  useEffect(()=>{
    let live=true;
    try{if(sessionStorage.getItem('gura:opening-seen'))return;}catch{/* Browsing still works without browser storage. */}
    api('promotions').then(value=>{if(live){setData(value);setNow(Date.now());setOpen(true);}}).catch(()=>{});
    return()=>{live=false;};
  },[]);
  const dismiss=()=>{setOpen(false);try{sessionStorage.setItem('gura:opening-seen','1');}catch{}};
  const current=(data?.items||[]).filter(p=>p.active===1&&p.starts_at<=now&&p.ends_at>now);
  useEffect(()=>{
    if(!open)return;
    // Without a scheduled deal, the short branded welcome moves straight into the shop.
    if(!current.length){const timer=setTimeout(dismiss,2200);return()=>clearTimeout(timer);}
    const timer=setTimeout(()=>setNow(Date.now()),Math.min(2147483647,Math.max(1,Math.min(...current.map(p=>p.ends_at))-Date.now())));
    return()=>clearTimeout(timer);
  },[open,data,now]);
  return <PromotionScreen items={current} logo={data?.logo_url||null} open={open} onClose={dismiss} onVisit={p=>{dismiss();navigate(promotionDestination(p));}}/>;
}
