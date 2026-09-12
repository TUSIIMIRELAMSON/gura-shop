'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Grid2X2 } from 'lucide-react';
import { CATEGORIES, media } from '@/lib/catalog';
import { SUBCATEGORIES } from '@/lib/subcategories';
import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import './categories.css';

type Props = { renderCatalog: (category: string, subcategory: string) => React.ReactNode; revision: number };
type Thumbnail = { category: string; subcategory: string; image: string };
const shortcuts = [0, 1, 3, 4, 6];
const shortLabels = ['Fashion', 'Food', 'Appliances', 'Beauty', 'Baby / Kids'];

function CategoryPicture({ tile, src }: { tile: number; src?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <span className="category-picture" aria-hidden="true">
    {src && !failed
      ? <img src={media(src)} alt="" loading="lazy" onError={() => setFailed(true)} />
      : <span className="category-art" style={{ backgroundPosition: `${((tile - 1) % 8) * 100 / 7}% ${Math.floor((tile - 1) / 8) * 100 / 5}%` }} />}
  </span>;
}

export default function CategoryBrowser({ renderCatalog, revision }: Props) {
  const [selected, setSelected] = useState(CATEGORIES[0]);
  const [results, setResults] = useState<{ category: string; subcategory: string } | null>(null);
  const [photos, setPhotos] = useState<Thumbnail[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const selectedButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    // Browsing stays usable with the bundled category pictures if the network is unavailable.
    api('categories').then(data => { if (live) setPhotos(data); }).catch(() => {});
    return () => { live = false; };
  }, [revision]);
  useEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
    if (selectedButton.current) {
      const button = selectedButton.current, list = button.parentElement!;
      if (button.offsetTop < list.scrollTop) list.scrollTop = button.offsetTop;
      else if (button.offsetTop + button.offsetHeight > list.scrollTop + list.clientHeight)
        list.scrollTop = button.offsetTop + button.offsetHeight - list.clientHeight;
    }
  }, [selected, results]);

  if (results) return <section className="category-results">
    <button className="back-link" onClick={() => setResults(null)}><ArrowLeft size={18} /> Back to {results.category}</button>
    {renderCatalog(results.category, results.subcategory)}
  </section>;

  const subcategories = SUBCATEGORIES[selected] || [];
  const photoFor = (category: string, subcategory: string) => photos.find(p => p.category === category && p.subcategory === subcategory)?.image;
  return <section className="category-page" aria-labelledby="category-title">
    <h1 id="category-title">Categories</h1>
    <nav className="category-shortcuts" aria-label="Popular categories">
      {shortcuts.map((index, i) => <button key={index} onClick={() => setSelected(CATEGORIES[index])}>
        <CategoryPicture tile={SUBCATEGORIES[CATEGORIES[index]][0].tile} />
        <span>{shortLabels[i]}</span>
      </button>)}
    </nav>
    <div className="category-layout">
      <nav className="category-rail" aria-label="All categories">
        {CATEGORIES.map(category => <button key={category} ref={category === selected ? selectedButton : undefined}
          aria-current={category === selected ? 'true' : undefined}
          aria-controls="subcategory-panel" onClick={() => setSelected(category)}>{category}</button>)}
      </nav>
      <div className="subcategory-panel" id="subcategory-panel" ref={panel} tabIndex={0} aria-label={selected}>
        <div className="subcategory-heading">
          <h2>{selected}</h2>
          <Button variant="ghost" onClick={() => setResults({ category: selected, subcategory: '' })}>
            View all <ChevronRight size={16} />
          </Button>
        </div>
        <div className="subcategory-grid">
          {subcategories.map(sub => <button key={sub.name} className="subcategory-link"
            onClick={() => setResults({ category: selected, subcategory: sub.name })}>
            <CategoryPicture tile={sub.tile} src={photoFor(selected, sub.name)} />
            <span>{sub.name}</span>
          </button>)}
        </div>
        <button className="category-view-all" onClick={() => setResults({ category: selected, subcategory: '' })}>
          <Grid2X2 size={18} /> View all {selected.toLowerCase()} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </section>;
}
