import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { lclTemplateService } from '@/services/lclTemplateService';
import { LCLTemplateStructure, LCLSectionDef } from '@/types/lclTemplate';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onTemplateCreated: (template: LCLTemplateStructure) => void;
  defaultSections: LCLSectionDef[];
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  companyId,
  onTemplateCreated,
  defaultSections,
}: CreateTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template name is required.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const template = await lclTemplateService.createStructure({
        company_id: companyId,
        name: name.trim(),
        description: description.trim() || undefined,
        structure_data: {
          sections: defaultSections,
        },
      });

      toast({
        title: 'Success',
        description: `Template "${template.name}" created successfully.`,
      });

      onTemplateCreated(template);
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New LCL Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              placeholder="e.g., Standard Container Kit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Optional description of this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
