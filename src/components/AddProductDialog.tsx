import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Plus, Upload, X } from "lucide-react";
import { ObjectUploader } from "./ObjectUploader";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
// Local product form schema
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import type { Listing } from "../types/listing";

const productFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be 0 or greater"),
  listingId: z.string().min(1, "Please select a listing"),
});

type ProductFormValues = z.infer<typeof productFormSchema>;
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

interface AddProductDialogProps {
  onAddProduct: (product?: any) => void;
  triggerButtonOverride?: React.ReactNode;
}

export function AddProductDialog({ onAddProduct, triggerButtonOverride }: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
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
      title: "",
      description: "",
      price: 0,
      listingId: "",
    },
  });

  const handleRemoveImage = (index: number) => {
    setImageFiles(current => current.filter((_, i) => i !== index));
  };

  const handleFilesAdded = (files: File[]) => {
    if (!files || files.length === 0) return;
    setImageFiles(current => {
      const available = MAX_IMAGES - current.length;
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
    if (imageFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing images",
        description: "Please add at least one image",
      });
      return;
    }

    try {
      setSubmitting(true);
      // Create product first
      const productRes = await apiRequest("POST", "/api/products", {
        title: values.title,
        description: values.description,
        // Backend expects decimal price (e.g., 25.50)
        price: Math.round((values.price || 0) * 100) / 100,
        listingId: values.listingId,
      });
      const productId = productRes.id;

      // Upload images for product
      const formData = new FormData();
      imageFiles.forEach((file) => formData.append("files", file));
      await apiRequest("POST", `/api/products/${productId}/images`, formData);

      toast({
        title: "Product added",
        description: "Your listing has been created successfully",
      });
  onAddProduct(productRes);
      form.reset();
      setImageFiles([]);
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create listing",
      });
    }
    finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButtonOverride ? (
          triggerButtonOverride
        ) : (
          <Button size="sm" variant="default" className="h-9" data-testid="button-add-product">
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
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
                      data-testid="select-listing"
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
            <div className="space-y-2 opacity-100">
              <Label>Product Images <span className="text-xs text-muted-foreground">( {imageFiles.length} / {MAX_IMAGES} )</span></Label>
              {imageFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                      <img src={URL.createObjectURL(file)} alt={`Product ${index + 1}`} className="w-full h-full object-cover" data-testid={`img-product-preview-${index}`} />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => handleRemoveImage(index)}
                        data-testid={`button-remove-image-${index}`}
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
                onDrop={(e) => { e.preventDefault(); handleFilesAdded(Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'))); }}
              >
                Drag & drop images here or select below
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => handleFilesAdded(Array.from(e.target.files || []))}
                disabled={imageFiles.length >= MAX_IMAGES}
                className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
                data-testid="input-file"
              />
              {imageFiles.length >= MAX_IMAGES && (
                <p className="text-xs text-muted-foreground">Maximum of {MAX_IMAGES} images reached.</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Vintage Camera" data-testid="input-title" disabled={submitting} />
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
                    <Textarea {...field} placeholder="Describe the item..." rows={3} data-testid="input-description" disabled={submitting} />
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
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={field.value}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      disabled={submitting}
                      data-testid="input-price"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" data-testid="button-cancel-product">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" data-testid="button-submit-product" disabled={submitting}>
                {submitting ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}