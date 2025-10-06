import FilterBar from '../FilterBar';

export default function FilterBarExample() {
  return (
    <div>
      <FilterBar
        type="products"
        onSearch={(q) => console.log('Search:', q)}
        onCategoryChange={(c) => console.log('Category:', c)}
        onSortChange={(s) => console.log('Sort:', s)}
      />
    </div>
  );
}
