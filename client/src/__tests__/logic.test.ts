import { describe, it, expect } from 'vitest';

// Core logic helpers matching the frontend components
export interface TestProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  min_threshold: number;
  status: 'ok' | 'warning' | 'low';
}

export function computeProductStatus(quantity: number, minThreshold: number): 'ok' | 'warning' | 'low' {
  if (quantity < minThreshold) return 'low';
  if (quantity < minThreshold * 1.5) return 'warning';
  return 'ok';
}

export function calculateCartTotal(cart: Record<string, number>, products: TestProduct[]): number {
  return Object.entries(cart).reduce((sum, [productId, qty]) => {
    const prod = products.find(p => p.id === productId);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);
}

export function filterProducts(products: TestProduct[], category: string, searchTerm: string): TestProduct[] {
  return products.filter(product => {
    const matchesCategory = category === 'All' || product.category.toLowerCase() === category.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

export function getLowStockProducts(products: TestProduct[], cart: Record<string, number> = {}): TestProduct[] {
  return products.filter(p => {
    const remaining = p.quantity - (cart[p.id] || 0);
    return remaining < p.min_threshold;
  });
}

describe('StockSense Client Core Logic', () => {
  const sampleProducts: TestProduct[] = [
    { id: 'p1', name: 'Alfonso Mango', category: 'Fruits', price: 150, quantity: 5, min_threshold: 10, status: 'low' },
    { id: 'p2', name: 'Fresh Milk 1L', category: 'Dairy', price: 60, quantity: 12, min_threshold: 10, status: 'warning' },
    { id: 'p3', name: 'Whole Wheat Bread', category: 'Bakery', price: 40, quantity: 30, min_threshold: 10, status: 'ok' },
  ];

  it('correctly calculates product status based on threshold rules', () => {
    expect(computeProductStatus(5, 10)).toBe('low');
    expect(computeProductStatus(12, 10)).toBe('warning');
    expect(computeProductStatus(25, 10)).toBe('ok');
    expect(computeProductStatus(0, 5)).toBe('low');
  });

  it('accurately computes POS cart total price across items', () => {
    const cart = { p1: 2, p2: 3 }; // 2*150 + 3*60 = 300 + 180 = 480
    const total = calculateCartTotal(cart, sampleProducts);
    expect(total).toBe(480);
  });

  it('returns 0 for an empty cart', () => {
    expect(calculateCartTotal({}, sampleProducts)).toBe(0);
  });

  it('filters inventory by category correctly', () => {
    const fruits = filterProducts(sampleProducts, 'Fruits', '');
    expect(fruits.length).toBe(1);
    expect(fruits[0].name).toBe('Alfonso Mango');

    const all = filterProducts(sampleProducts, 'All', '');
    expect(all.length).toBe(3);
  });

  it('filters inventory by search query', () => {
    const searchMatch = filterProducts(sampleProducts, 'All', 'milk');
    expect(searchMatch.length).toBe(1);
    expect(searchMatch[0].id).toBe('p2');
  });

  it('identifies products breaching restock thresholds after cart deduction', () => {
    const cart = { p2: 4 }; // p2 quantity 12 - 4 = 8, min_threshold is 10 -> triggers low stock!
    const low = getLowStockProducts(sampleProducts, cart);
    expect(low.map(p => p.id)).toContain('p1');
    expect(low.map(p => p.id)).toContain('p2');
    expect(low.map(p => p.id)).not.toContain('p3');
  });
});
