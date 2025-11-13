import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { UserPlus } from "lucide-react";
import type { BuyerInterest } from "@/pages/Home";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Helper function to get minimum pickup time (10 minutes from now, rounded to 10-minute interval)
const getMinPickupTime = () => {
  const now = new Date();
  // Add 10 minutes
  now.setMinutes(now.getMinutes() + 10);
  // Round up to nearest 10 minute interval
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 10) * 10;
  now.setMinutes(roundedMinutes);
  now.setSeconds(0);
  now.setMilliseconds(0);
  
  // Convert to local datetime-local format
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

// Helper to round a datetime string to nearest 10-minute interval
const roundToTenMinutes = (datetimeStr: string) => {
  if (!datetimeStr) return datetimeStr;
  
  const date = new Date(datetimeStr);
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 10) * 10;
  date.setMinutes(roundedMinutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

interface AddBuyerDialogProps {
  productId: string;
  onAddBuyer: (buyer: Omit<BuyerInterest, "id" | "productId" | "createdAt">) => void;
}

const buyerFormSchema = z.object({
  buyerName: z.string().min(1, "Buyer name is required"),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Please enter a valid phone number in E.164 format (e.g., +12345678901)").optional().or(z.literal("")),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  smsOptIn: z.boolean().optional(),
  pickupTime: z.string().min(1, "Pickup time is required"),
  offerPrice: z.number().min(0, "Offer price must be 0 or greater").optional().nullable(),
}).refine((data) => data.phone || data.email, {
  message: "Please provide at least one contact method",
  path: ["phone"],
});

type BuyerFormValues = z.infer<typeof buyerFormSchema>;

export function AddBuyerDialog({ productId, onAddBuyer }: AddBuyerDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<BuyerFormValues>({
    resolver: zodResolver(buyerFormSchema),
    defaultValues: {
      buyerName: "",
      phone: "",
      email: "",
      smsOptIn: false,
      pickupTime: "",
      offerPrice: null,
    },
  });

  const handleSubmit = (values: BuyerFormValues) => {
    const pickupDate = new Date(values.pickupTime);
    onAddBuyer({
      pickupTime: pickupDate.toISOString(),
      offerPrice: (values.offerPrice !== null && values.offerPrice !== undefined ? Math.round(values.offerPrice * 100) : 0),
      status: "active",
      buyerEmail: values.email || undefined,
      hideMe: false,
    });

    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="w-full" data-testid={`button-add-buyer-${productId}`}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Buyer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Interested Buyer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="buyerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter buyer's name" data-testid="input-buyer-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" placeholder="+1234567890" data-testid="input-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="buyer@example.com" data-testid="input-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="smsOptIn"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Receive SMS Notifications</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-sms-opt-in"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pickupTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Time</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="datetime-local" 
                      min={getMinPickupTime()}
                      step="600"
                      onChange={(e) => {
                        const rounded = roundToTenMinutes(e.target.value);
                        field.onChange(rounded);
                      }}
                      data-testid="input-pickup-time" 
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Must be at least 10 minutes from now, in 10-minute intervals
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="offerPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Price ($)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                      data-testid="input-offer-price"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" data-testid="button-cancel-buyer">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" data-testid="button-submit-buyer">
                Add to Queue
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
