'use client';
import React,{useState} from 'react';
import {Plus,Eye,Trash2,ImagePlus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {CATEGORIES,Product} from '@/lib/catalog';
import {SUBCATEGORIES} from '@/lib/subcategories';
import {Promotion} from '@/lib/promotions';
import {api,go,useLoad,useShop,Action,Form,Field,SelectField,Empty,Loading,PageTitle} from './shop';
import {PromotionScreen} from './opening-promotions';
import {toast} from 'sonner';
import './promotions.css';

function localDate(value:number){const d=new Date(value);return new Date(value-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function offerStatus(p:Promotion){if(!p.active)return 'Hidden';if(p.ends_at<=Date.now())return 'Ended';return p.starts_at>Date.now()?'Scheduled':'Live';}

export default function AdminPromotions(){
  const {revision,refresh}=useShop(),offers=useLoad<Promotion[]>('admin/promotions',revision),branding=useLoad<{logo_url:string|null}>('admin/branding',revision);
  const [editing,setEditing]=useState<Promotion|null>(null),[formKey,setFormKey]=useState(0),[preview,setPreview]=useState<Promotion|null>(null),[logoFile,setLogoFile]=useState<File|null>(null);
  const logo=branding.data?.logo_url||null;
  return <><PageTitle title="Opening promotions"><Button onClick={()=>{setEditing(null);setFormKey(n=>n+1);document.getElementById('offer-editor')?.scrollIntoView({behavior:'smooth'});}}><Plus/> New offer</Button></PageTitle>
    <p className="muted mb">Welcome shoppers with GURA SHOPS, your McLAM logo, and the offers running now.</p>
    <div className="promotions-admin-grid"><div>
      <section className="panel promotion-branding"><h2>McLAM logo</h2><p className="muted">Upload your official logo. A transparent PNG works well.</p>
        {branding.error?<Loading error={branding.error} retry={branding.reload}/>:logo?<img src={logo} alt="Current McLAM logo"/>:<strong className="mclam-wordmark">McLAM</strong>}
        <Form submit="Save logo" onSave={async(_:any,form:HTMLFormElement)=>{if(!logoFile)throw new Error('Choose your logo first.');const fd=new FormData();fd.append('file',logoFile);await api('admin/branding/logo','POST',fd);setLogoFile(null);form.reset();refresh();toast.success('McLAM logo saved');}}>
          <Field label="Choose logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" required onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setLogoFile(e.target.files?.[0]||null)}/>
        </Form>
        {logo&&<Action className="mt-3" variant="outline" onClick={async()=>{await api('admin/branding/logo','DELETE');refresh();toast.success('Logo removed');}}>Remove logo</Action>}
      </section>
      <section className="panel"><h2>Your offers</h2>{offers.loading||offers.error?<Loading error={offers.error} retry={offers.reload}/>:!offers.data?.length?<Empty icon={ImagePlus} title="Add your first offer">Only your published offers appear to shoppers during their scheduled dates.</Empty>:<div className="saved-offers">{offers.data.map(p=><article key={p.id} className="saved-offer">
        {p.image_url&&<img src={p.image_url} alt="" loading="lazy"/>}<div><span className={'offer-state '+offerStatus(p).toLowerCase()}>{offerStatus(p)}</span><h3>{p.title}</h3><p>{new Date(p.starts_at).toLocaleString()} – {new Date(p.ends_at).toLocaleString()}</p>
          <div className="offer-buttons"><Button variant="outline" onClick={()=>{setEditing(p);setFormKey(n=>n+1);document.getElementById('offer-editor')?.scrollIntoView({behavior:'smooth'});}}>Edit</Button><Button variant="ghost" onClick={()=>setPreview(p)}><Eye/> Preview</Button></div>
        </div></article>)}</div>}</section>
    </div><section className="panel" id="offer-editor"><OfferEditor key={formKey} initial={editing} onSaved={p=>{setEditing(p);refresh();}} onDeleted={()=>{setEditing(null);setFormKey(n=>n+1);refresh();}}/></section></div>
    <PromotionScreen items={preview?[preview]:[]} logo={logo} open={!!preview} onClose={()=>setPreview(null)} onVisit={()=>setPreview(null)}/>
  </>;
}

function OfferEditor({initial,onSaved,onDeleted}:{initial:Promotion|null;onSaved:(p:Promotion)=>void;onDeleted:()=>void}){
  const [saved,setSaved]=useState(initial),[active,setActive]=useState(!!initial?.active),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false);
  const [target,setTarget]=useState(initial?.product_id?'product':initial?.category?'category':'shop'),[category,setCategory]=useState(initial?.category||''),[subcategory,setSubcategory]=useState(initial?.subcategory||'');
  const products=useLoad<Product[]>(target==='product'?'admin/products':null);
  const p=saved;
  return <><h2>{p?'Edit offer':'New offer'}</h2><p className="muted mb">Dates use your device’s time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Offers close automatically at the end time.</p>
    <Form submit={active?'Save and publish offer':'Save hidden offer'} onSave={async(b:any,form:HTMLFormElement)=>{
      setBusy(true);try{
        const values={title:b.title,description:b.description,button_label:b.button_label,starts_at:new Date(b.starts_at).getTime(),ends_at:new Date(b.ends_at).getTime(),category:target==='category'?category:'',subcategory:target==='category'?subcategory:'',product_id:target==='product'?b.product_id:''};
        let current=await api('admin/promotions'+(p?'/'+p.id:''),p?'PATCH':'POST',{...values,active:false,...(p?{version:p.version}:{})});setSaved(current);onSaved(current);
        if(file){const fd=new FormData();fd.append('file',file);current=await api('admin/promotions/'+current.id+'/image','POST',fd);setSaved(current);setFile(null);const input=form.elements.namedItem('artwork') as HTMLInputElement|null;if(input)input.value='';onSaved(current);}
        current=await api('admin/promotions/'+current.id,'PATCH',{...values,active,version:current.version});setSaved(current);onSaved(current);toast.success(active?'Offer published for its scheduled dates':'Offer saved as hidden');
      }catch(error){throw error;}finally{setBusy(false);}
    }}>
      <fieldset disabled={busy} className="offer-fields">
        <Field label="Offer title" name="title" defaultValue={p?.title} maxLength={100} placeholder="Name your current offer" required/>
        <label className="field"><span>Offer details</span><textarea name="description" rows={3} maxLength={500} defaultValue={p?.description} placeholder="Describe the deal and any conditions."/></label>
        <div className="form-pair"><Field label="Starts" name="starts_at" type="datetime-local" required defaultValue={localDate(p?.starts_at||Date.now())}/><Field label="Ends" name="ends_at" type="datetime-local" required defaultValue={localDate(p?.ends_at||Date.now()+7*86400000)}/></div>
        <Field label="Promotion artwork (optional)" name="artwork" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]||null)}/>
        <p className="muted">Portrait artwork works best. JPG, PNG, WebP, GIF or AVIF; up to 20 MB. Your offer stays hidden if an upload fails.</p>
        {p?.image_url&&<img className="offer-edit-image" src={p.image_url} alt="Saved offer artwork"/>}
        <SelectField label="Where the offer opens" value={target} onChange={(e:React.ChangeEvent<HTMLSelectElement>)=>setTarget(e.target.value)}><option value="shop">All products</option><option value="category">A category</option><option value="product">A product</option></SelectField>
        {target==='category'&&<><SelectField label="Category" required value={category} onChange={(e:React.ChangeEvent<HTMLSelectElement>)=>{setCategory(e.target.value);setSubcategory('');}}><option value="" disabled>Select category</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</SelectField><SelectField label="Subcategory" value={subcategory} onChange={(e:React.ChangeEvent<HTMLSelectElement>)=>setSubcategory(e.target.value)}><option value="">View all</option>{(SUBCATEGORIES[category]||[]).map(s=><option key={s.name}>{s.name}</option>)}</SelectField></>}
        {target==='product'&&(products.error?<Loading error={products.error} retry={products.reload}/>:<SelectField label="Product" name="product_id" required defaultValue={p?.product_id||''}><option value="" disabled>{products.loading?'Loading products…':'Select product'}</option>{products.data?.map(item=><option key={item.id} value={item.id}>{item.name}{!item.active?' (hidden)':''}</option>)}</SelectField>)}
        <Field label="Button label" name="button_label" maxLength={40} defaultValue={p?.button_label||'Shop this offer'} required/>
        <div className="between"><span>Publish during these dates</span><Switch checked={active} onCheckedChange={setActive} aria-label="Publish during these dates"/></div>
        <p className="muted">Use the product editor to set sale prices. Publishing an offer does not change product prices.</p>
      </fieldset>
    </Form>
    {p&&<details className="offer-delete"><summary>Delete this offer</summary><p>This removes the offer and its artwork.</p><Action variant="destructive" disabled={busy} onClick={async()=>{await api('admin/promotions/'+p.id,'DELETE');onDeleted();toast.success('Offer deleted');}}><Trash2/> Confirm delete</Action></details>}
  </>;
}
