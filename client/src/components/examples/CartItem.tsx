import CartItem from '../CartItem';

export default function CartItemExample() {
  return (
    <div className="p-6 max-w-2xl">
      <CartItem
        id="1"
        name="Sourdough Bread"
        vendorName="Artisan Bakery"
        price={8.99}
        quantity={2}
        onUpdateQuantity={(id, qty) => console.log(`Update ${id} to ${qty}`)}
        onRemove={(id) => console.log(`Remove ${id}`)}
      />
    </div>
  );
}
