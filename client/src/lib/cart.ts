export interface CartItem {
  productId: string;
  name: string;
  price: number;
  vendorName: string;
  quantity: number;
}

const CART_STORAGE_KEY = 'local-exchange-cart';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function emitCartUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cart-updated'));
  }
}

export function addToCart(item: Omit<CartItem, 'quantity'>): CartItem[] {
  const cart = getCart();
  const existing = cart.find(i => i.productId === item.productId);
  
  let newCart: CartItem[];
  if (existing) {
    newCart = cart.map(i =>
      i.productId === item.productId
        ? { ...i, quantity: i.quantity + 1 }
        : i
    );
  } else {
    newCart = [...cart, { ...item, quantity: 1 }];
  }
  
  saveCart(newCart);
  emitCartUpdate();
  return newCart;
}

export function updateCartQuantity(productId: string, quantity: number): CartItem[] {
  if (quantity <= 0) {
    return removeFromCart(productId);
  }
  
  const cart = getCart();
  const newCart = cart.map(item =>
    item.productId === productId ? { ...item, quantity } : item
  );
  saveCart(newCart);
  emitCartUpdate();
  return newCart;
}

export function removeFromCart(productId: string): CartItem[] {
  const cart = getCart();
  const newCart = cart.filter(item => item.productId !== productId);
  saveCart(newCart);
  emitCartUpdate();
  return newCart;
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_STORAGE_KEY);
  emitCartUpdate();
}

export function getCartSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
