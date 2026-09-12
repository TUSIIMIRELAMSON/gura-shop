export type Promotion = {
  id: string; title: string; description: string; button_label: string;
  category: string; subcategory: string; product_id: string | null;
  image_url: string | null; starts_at: number; ends_at: number;
  active: number; version: number; updated_at: number;
};
export function promotionDestination(p: Promotion) {
  if (p.product_id) return 'product/' + encodeURIComponent(p.product_id);
  if (p.category) return 'collection/' + encodeURIComponent(p.category) + '/' + encodeURIComponent(p.subcategory);
  return 'home';
}
