import { ChevronDown, Tag } from 'lucide-react';
import { eventCategories } from './createEventHelpers';

interface CategorySelectorProps {
  category: string;
  subcategory: string;
  isOpen: boolean;
  onToggle: () => void;
  onCategoryChange: (categoryName: string) => void;
  onSubcategoryChange: (subcategoryName: string) => void;
  onClose: () => void;
}

export function CategorySelector({
  category,
  subcategory,
  isOpen,
  onToggle,
  onCategoryChange,
  onSubcategoryChange,
  onClose,
}: CategorySelectorProps) {
  const selectedCategory = eventCategories.find((c) => c.name === category);
  const SelectedCategoryIcon = selectedCategory?.icon || Tag;

  return (
    <div>
      <label className="mb-2 block text-2xs font-bold uppercase tracking-[0.12em] text-gray-500">Category</label>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-left text-sm outline-none transition hover:border-purple-200"
      >
        <span className="flex min-w-0 items-center gap-2">
          <SelectedCategoryIcon className="h-4 w-4 shrink-0 text-purple-600" />
          <span className={`truncate ${category ? 'text-gray-900' : 'text-gray-500'}`}>
            {category || 'Select a category'}
            {subcategory ? ` > ${subcategory}` : ''}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg shadow-black/5">
          <div className="grid grid-cols-3 gap-2">
            {eventCategories.map((cat) => {
              const Icon = cat.icon;
              const active = category === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => onCategoryChange(cat.name)}
                  className={`min-h-[76px] rounded-xl border p-2 text-center transition ${
                    active ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-purple-200'
                  }`}
                >
                  <Icon className={`mx-auto mb-2 h-5 w-5 ${active ? 'text-purple-600' : 'text-gray-500'}`} />
                  <span className="block text-xs font-medium leading-tight">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedCategory && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedCategory.subcategories.map((sub) => {
            const active = subcategory === sub.name;
            return (
              <button
                key={sub.name}
                type="button"
                onClick={() => {
                  onSubcategoryChange(sub.name);
                  onClose();
                }}
                className={`create-subcategory-chip inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition ${
                  active ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-purple-200'
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
