export const CATEGORIES = ['Fashions / Accessories','Food','Household goods','Digital appliances','Beauty','Home decor','Maternity / Baby / Kids','Sports / Leisure','Kitchenware','Toys / Hobbies','Automotive','Pet supplies','Stationery / Office','Fitness / Sports nutrition','Books / Music / DVDs','Benefits / Service'];
export const STATUSES = ['Pending','Confirmed','Packed','On the way','Delivered','Cancelled'];
export type Product = {id:string;name:string;description:string;brand:string;category:string;subcategory?:string;price:number;unit:string;quantity:number;active:number;version:number;image:string|null;image_count:number;images?:Photo[]};
export type Photo = {id:string;product_id:string;object_key:string;content_type:string;position:number};
export type User = {id:string;name:string;email:string;phone:string;role:string;avatar:string|null;recipient:string;address:string;delivery_phone:string;country:string;language:string;notifications:number;gold_requested:number};
export type Order = {id:string;user_id:string;status:string;total:number;delivery_fee:number;currency:string;paid:number;delivery_date:string;created_at:number;recipient:string;address:string;phone:string;items:OrderItem[]};
export type OrderItem = {id:string;product_id:string;name:string;brand:string;price:number;quantity:number;unit:string;image:string|null};
export type CartItem = Product & {cart_quantity:number};
export type ShopSettings = {name:string;currency:string;delivery_fee:number;gold_description:string};
export function money(amount:number,currency='UGX') {return new Intl.NumberFormat('en',{style:'currency',currency,minimumFractionDigits:amount%100===0?0:2,maximumFractionDigits:2}).format(amount/100);}
export function media(key:string|null|undefined) {return key?'/api/media/'+key:'';}
