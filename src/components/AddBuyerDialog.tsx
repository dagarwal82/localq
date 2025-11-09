import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserPlus } from "lucide-react";
import type { BuyerInterest } from "@/pages/Home";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
  offerPrice: z.number().min(0).optional().nullable(),
  isFree: z.boolean().optional(),
}).refine((data) => data.isFree || (data.offerPrice !== null && data.offerPrice !== undefined), {
  message: "Offer price is required when not looking for free",
  path: ["offerPrice"],
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
      isFree: false,
    },
  });

  const isFree = form.watch("isFree");

  const handleSubmit = (values: BuyerFormValues) => {
    const pickupDate = new Date(values.pickupTime);
    onAddBuyer({
      pickupTime: pickupDate.toISOString(),
      offerPrice: values.isFree ? 0 : (values.offerPrice !== null && values.offerPrice !== undefined ? Math.round(values.offerPrice * 100) : 0),
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
                    <Input {...field} type="datetime-local" data-testid="input-pickup-time" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isFree"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Looking for Free</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            form.setValue("offerPrice", null);
                          }
                        }}
                        data-testid="switch-free"
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            {!isFree && (
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
            )}

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
