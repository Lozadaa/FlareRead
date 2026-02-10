import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Category, ParsedEpubMeta, ReadingMode } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { CategorySelect } from '@/components/categories/CategorySelect'
import { ReadingModeSelect } from '@/components/categories/ReadingModeSelect'

interface ImportCategoryDialogProps {
  open: boolean
  meta: ParsedEpubMeta
  categories: Category[]
  onCreateCategory: (data: { name: string; color?: string }) => Promise<Category>
  onConfirm: (options: { categoryId: string | null; readingMode: ReadingMode }) => void
  onSkip: () => void
}

export function ImportCategoryDialog({
  open,
  meta,
  categories,
  onCreateCategory,
  onConfirm,
  onSkip
}: ImportCategoryDialogProps): JSX.Element {
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [readingMode, setReadingMode] = useState<ReadingMode>(null)

  const handleConfirm = (): void => {
    onConfirm({ categoryId, readingMode })
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-[460px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Categorize your book</DialogTitle>
          <DialogDescription>
            Choose a category and reading mode before importing.
          </DialogDescription>
        </DialogHeader>

        {/* Book preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
          <div className="w-10 h-14 bg-primary/10 rounded flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary/40" />
          </div>
          <div className="min-w-0">
            <p className="text-ui-sm font-medium truncate">{meta.title}</p>
            {meta.author && (
              <p className="text-ui-xs text-muted-foreground truncate">{meta.author}</p>
            )}
          </div>
        </div>

        {/* Category selection */}
        <div className="space-y-2">
          <label className="text-ui-sm font-medium">Category</label>
          <CategorySelect
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            onCreateCategory={onCreateCategory}
            className="w-full"
          />
        </div>

        {/* Reading mode */}
        <div className="space-y-2">
          <label className="text-ui-sm font-medium">Reading mode</label>
          <ReadingModeSelect value={readingMode} onChange={setReadingMode} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button onClick={handleConfirm}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
