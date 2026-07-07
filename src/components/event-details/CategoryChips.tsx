interface CategoryOption {
  id: string;
  name: string;
  chipName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  subcategories?: string[];
}

interface CategoryChipsProps {
  categories: CategoryOption[];
  selectedCategory: string;
  selectedSubcategory: string;
  onCategorySelect: (categoryId: string) => void;
  onSubcategorySelect: (subcategory: string) => void;
}

export function CategoryChips({ categories, selectedCategory, selectedSubcategory, onCategorySelect, onSubcategorySelect }: CategoryChipsProps) {
  return (
    <div className="mt-2">
      <div className="-mx-3 overflow-x-auto px-3 pb-1 scrollbar-hide">
        <div className="flex w-max items-center gap-1.5">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onCategorySelect(category.id)}
                className={`event-category-chip flex h-[1.65rem] flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'border-gray-950 bg-gray-950 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary hover:bg-primary hover:text-white'
                }`}
              >
                {Icon && <Icon className="h-[0.8rem] w-[0.8rem]" />}
                <span>{category.chipName || category.name}</span>
              </button>
            );
          })}
        </div>

      {selectedCategory !== 'all' && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-900 text-sm">
              {categories.find(c => c.id === selectedCategory)?.name} Subcategories:
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories
              .find(c => c.id === selectedCategory)?.subcategories?.map((subcategory) => (
                <button
                  key={subcategory}
                  onClick={() => onSubcategorySelect(subcategory)}
                  className={`event-subcategory-chip flex h-[1.65rem] flex-shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold transition-all ${
                    selectedSubcategory === subcategory
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-primary hover:bg-primary hover:text-white'
                  }`}
                >
                  {subcategory}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
