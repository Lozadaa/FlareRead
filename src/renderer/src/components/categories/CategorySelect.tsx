import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316' // orange
]

interface CategorySelectProps {
  categories: Category[]
  value: string | null
  onChange: (categoryId: string | null) => void
  onCreateCategory: (data: { name: string; color?: string }) => Promise<Category>
  placeholder?: string
  className?: string
}

export function CategorySelect({
  categories,
  value,
  onChange,
  onCreateCategory,
  placeholder = 'Select category...',
  className
}: CategorySelectProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])

  const selectedCategory = categories.find((c) => c.id === value)

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return
    const created = await onCreateCategory({ name: newName.trim(), color: newColor })
    onChange(created.id)
    setCreating(false)
    setNewName('')
    setNewColor(PRESET_COLORS[0])
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between font-normal transition-all duration-200',
            'hover:border-primary/30 hover:shadow-[0_2px_8px_-2px_hsla(var(--primary),0.08)]',
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedCategory ? (
              <>
                {selectedCategory.color && (
                  <span
                    className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/5"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                )}
                <span className="text-foreground">{selectedCategory.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        {creating ? (
          <div className="p-4 space-y-3">
            <p className="text-ui-sm font-medium text-foreground">New category</p>
            <Input
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setCreating(false)
              }}
              autoFocus
              className="focus:border-primary/40"
            />
            {/* Color swatches with larger hit targets */}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={cn(
                      'w-7 h-7 rounded-lg transition-all duration-200',
                      'hover:scale-110',
                      newColor === color
                        ? 'ring-2 ring-offset-2 ring-offset-popover ring-primary scale-110'
                        : 'ring-1 ring-black/10'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreating(false)
                  setNewName('')
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                Create
              </Button>
            </div>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandList>
              <CommandEmpty>No categories found.</CommandEmpty>
              <CommandGroup>
                {categories
                  .filter((c) => c.id !== 'uncategorized')
                  .map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      onSelect={() => {
                        onChange(category.id === value ? null : category.id)
                        setOpen(false)
                      }}
                      className="gap-2"
                    >
                      <span className="flex items-center gap-2.5 flex-1">
                        {category.color && (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/5"
                            style={{ backgroundColor: category.color }}
                          />
                        )}
                        <span className="text-ui-sm">{category.name}</span>
                      </span>
                      {value === category.id && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={() => setCreating(true)} className="gap-2">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <Plus className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-ui-sm">Create new category</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}
