import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { X, Pencil } from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import type { Listing } from "../types/listing";
import type { Product, ProductImage } from "@/pages/Home";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const productFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  listingId: z.string().min(1, "Please select a listing"),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface EditProductDialogProps {
  product: Product;
  onUpdate: () => void;
  trigger?: React.ReactNode;
}

export function EditProductDialog({ product, onUpdate, trigger }: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>(product.images || []);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const MAX_IMAGES = 3;
  const { toast } = useToast();

  const { data: listings = [] } = useQuery<Listing[]>({
    queryKey: ["/api/listings", "mine"],
    queryFn: async () => apiRequest("GET", "/api/listings/account/me"),
    staleTime: 60_000,
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: product.title,
      description: product.description,
      price: product.price,
      listingId: product.listingId || "",
    },
  });

  // Reset form when product changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: product.title,
        description: product.description,
        price: product.price,
        listingId: product.listingId || "",
      });
      setExistingImages(product.images || []);
      setImageFiles([]);
      setDeletedImageIds([]);
    }
  }, [open, product, form]);

  const handleRemoveExistingImage = (imageId: string) => {
    setExistingImages(current => current.filter(img => img.id !== imageId));
    setDeletedImageIds(current => [...current, imageId]);
  };

  const handleRemoveNewImage = (index: number) => {
    setImageFiles(current => current.filter((_, i) => i !== index));
  };

  const handleFilesAdded = (files: File[]) => {
    if (!files || files.length === 0) return;
    setImageFiles(current => {
      const totalImages = existingImages.length + current.length;
      const available = MAX_IMAGES - totalImages;
      const accepted = files.slice(0, Math.max(available, 0));
      const next = [...current, ...accepted];
      if (files.length > accepted.length) {
        toast({
          variant: "destructive",
          title: `Image limit reached`,
          description: `Only ${MAX_IMAGES} images allowed per item. Extra ${files.length - accepted.length} file(s) ignored.`,
        });
      }
      return next;
    });
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: ProductFormValues) => {
    const totalImages = existingImages.length + imageFiles.length;
    if (totalImages === 0) {
      toast({
        variant: "destructive",
        title: "Missing images",
        description: "Please add at least one image",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Update product details
      await apiRequest("PATCH", `/api/products/${product.id}`, {
        title: values.title,
        description: values.description,
        price: Math.round((values.price || 0) * 100) / 100,
        listingId: values.listingId,
      });

      // Delete removed images
      for (const imageId of deletedImageIds) {
        try {
          await apiRequest("DELETE", `/api/products/${product.id}/images/${imageId}`, {});
        } catch (error) {
          console.error("Failed to delete image:", imageId, error);
        }
      }

      // Upload new images if any
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append("files", file));
        await apiRequest("POST", `/api/products/${product.id}/images`, formData);
      }

      toast({
        title: "Product updated",
        description: "Your changes have been saved successfully",
      });
      
      onUpdate();
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update product",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalImageCount = existingImages.length + imageFiles.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          data-testid={`button-edit-product-${product.id}`}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>
      )}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="listingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing</FormLabel>
                  <FormControl>
                    <select
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      data-testid="select-listing-edit"
                    >
                      <option value="">Select a listing</option>
                      {listings.map((lst) => (
                        <option key={lst.id} value={lst.id}>{lst.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Product Images <span className="text-xs text-muted-foreground">( {totalImageCount} / {MAX_IMAGES} )</span></Label>
                {(existingImages.length > 0 || imageFiles.length > 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeletedImageIds(existingImages.map(img => img.id));
                      setExistingImages([]);
                      setImageFiles([]);
                    }}
                    className="h-7 text-xs"
                    data-testid="button-clear-all-images-edit"
                  >
                    Clear All
                  </Button>
                )}
              </div>
              
              {(existingImages.length > 0 || imageFiles.length > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  {/* Existing images */}
                  {existingImages.map((image) => (
                    <div key={image.id} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                      <img 
                        src={image.url} 
                        alt="Product" 
                        className="w-full h-full object-cover" 
                        data-testid={`img-existing-${image.id}`}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => handleRemoveExistingImage(image.id)}
                        data-testid={`button-remove-existing-${image.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* New images */}
                  {imageFiles.map((file, index) => (
                    <div key={`new-${index}`} className="relative aspect-square rounded-md overflow-hidden bg-muted border-2 border-primary">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={`New ${index + 1}`} 
                        className="w-full h-full object-cover" 
                        data-testid={`img-new-preview-${index}`}
                      />
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                        NEW
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => handleRemoveNewImage(index)}
                        data-testid={`button-remove-new-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div
                className="mt-2 rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground"
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  handleFilesAdded(Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'))); 
                }}
              >
                Drag & drop images here or select below
              </div>
              
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => {
                  handleFilesAdded(Array.from(e.target.files || []));
                  e.target.value = '';
                }}
                className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                data-testid="input-file-edit"
              />
              
              {totalImageCount >= MAX_IMAGES && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Maximum of {MAX_IMAGES} images reached. Remove some to add different ones.
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Vintage Camera" data-testid="input-title-edit" disabled={submitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe the item..." rows={3} data-testid="input-description-edit" disabled={submitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={field.value === undefined || field.value === null ? '' : String(field.value)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                          field.onChange('');
                        } else {
                          field.onChange(v);
                        }
                      }}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== '') {
                          const num = Number(v);
                          if (!isNaN(num)) field.onChange(Number(num.toFixed(2)));
                        }
                      }}
                      disabled={submitting}
                      data-testid="input-price-edit"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)} 
                className="flex-1" 
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                data-testid="button-submit-edit" 
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
