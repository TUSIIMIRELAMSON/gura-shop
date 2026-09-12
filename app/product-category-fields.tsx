'use client';
import React, { useState } from 'react';
import { CATEGORIES } from '@/lib/catalog';
import { SUBCATEGORIES } from '@/lib/subcategories';
import { NativeSelect } from '@/components/ui/native-select';

export default function ProductCategoryFields({ category = '', subcategory = '' }: { category?: string; subcategory?: string }) {
  const [selected, setSelected] = useState(category);
  const [sub, setSub] = useState(subcategory);
  return <div className="form-pair">
    <label className="field"><span>Category</span><NativeSelect name="category" required value={selected}
      onChange={event => { setSelected(event.target.value); setSub(''); }}>
      <option value="" disabled>Select category</option>
      {CATEGORIES.map(name => <option key={name}>{name}</option>)}
    </NativeSelect></label>
    <label className="field"><span>Subcategory (optional)</span><NativeSelect name="subcategory" value={sub} disabled={!selected} onChange={event => setSub(event.target.value)}>
      <option value="">General / View all</option>
      {(SUBCATEGORIES[selected] || []).map(item => <option key={item.name}>{item.name}</option>)}
    </NativeSelect></label>
  </div>;
}
