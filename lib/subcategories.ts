// Navigation labels only. These do not create products or stock.
export type Subcategory = { name: string; tile: number };
const items = (...values: [string, number][]): Subcategory[] => values.map(([name, tile]) => ({ name, tile }));
export const SUBCATEGORIES: Record<string, Subcategory[]> = {
  'Fashions / Accessories': items(["Women's fashion",1],["Men's fashion",2],['Unisex clothing',3],['Underwear / Pajamas',4],['Shoes',5],['Bags / Accessories',6],["Children's fashion",7],['Watches / Jewellery',8]),
  'Food': items(['Fruit / Vegetables',21],['Meat / Fish',22],['Bakery',23],['Rice / Grains',24],['Drinks',25],['Snacks',26]),
  'Household goods': items(['Cleaning supplies',27],['Laundry care',27],['Towels / Bathroom',28],['Home storage',30],['Household essentials',28]),
  'Digital appliances': items(['TV / Video appliances',9],['Refrigerators',10],['Washers / Dryers',11],['Home appliances',12],['Vacuum cleaners',13],['Seasonal appliances',14],['Beauty / Hair appliances',15],['Health appliances',16],['Kitchen appliances',17],['Laptops',18],['Desktops',19],['Phones / Tablets',20]),
  'Beauty': items(['Skincare',31],['Makeup',32],['Hair care',15],['Bath / Body',31],['Beauty tools',32]),
  'Home decor': items(['Plants / Planters',33],['Lighting',34],['Decorative accessories',33],['Bedding / Cushions',28],['Wall decor',34]),
  'Maternity / Baby / Kids': items(['Maternity essentials',7],['Baby clothing',7],['Feeding',36],['Strollers / Travel',35],['Baby care',31],['Kids essentials',39]),
  'Sports / Leisure': items(['Ball sports',37],['Exercise equipment',38],['Sportswear',3],['Outdoor recreation',37],['Sports accessories',5]),
  'Kitchenware': items(['Cookware',29],['Plates / Bowls',30],['Food containers',30],['Kitchen utensils',29],['Drinkware',36]),
  'Toys / Hobbies': items(['Soft toys',39],['Puzzles / Games',40],['Educational toys',40],['Arts / Crafts',45],['Music hobbies',48]),
  'Automotive': items(['Tyres / Wheels',41],['Oils / Fluids',42],['Car care',27],['Car accessories',41],['Motorcycle accessories',41]),
  'Pet supplies': items(['Pet food',43],['Bowls / Feeding',43],['Leads / Collars',44],['Pet toys',39],['Grooming / Care',44]),
  'Stationery / Office': items(['Notebooks / Paper',45],['Pens / Pencils',45],['Desk supplies',46],['School supplies',45],['Office accessories',46]),
  'Fitness / Sports nutrition': items(['Protein / Supplements',25],['Vitamins',31],['Nutrition snacks',26],['Shakers / Bottles',36],['Fitness accessories',38]),
  'Books / Music / DVDs': items(['Books',47],["Children's books",47],['Study books',47],['Music',48],['Movies / DVDs',9]),
  'Benefits / Service': items(['Home services',27],['Beauty services',32],['Repairs / Installation',19],['Lessons / Training',47],['Gifts / Benefits',8]),
};
