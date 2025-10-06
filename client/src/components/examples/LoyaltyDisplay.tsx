import LoyaltyDisplay from '../LoyaltyDisplay';

export default function LoyaltyDisplayExample() {
  return (
    <div className="p-6 max-w-sm">
      <LoyaltyDisplay balance={150} />
    </div>
  );
}
