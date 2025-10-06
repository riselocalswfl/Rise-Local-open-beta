import OrderSummary from '../OrderSummary';

export default function OrderSummaryExample() {
  return (
    <div className="p-6 max-w-md">
      <OrderSummary subtotal={45.97} />
    </div>
  );
}
