import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { Copy, Plus, Trash2, QrCode } from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";
import type { Listing } from "../types/listing";

interface ListingManagerDialogProps {
  triggerClassName?: string;
}

export function ListingManagerDialog({ triggerClassName }: ListingManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: listings = [], isLoading } = useQuery<Listing[]>({
    queryKey: ["/api/listings", "mine"],
    queryFn: async () => {
      // Assuming account is derived from auth; backend will infer current user
      const res = await apiRequest("GET", "/api/listings/account/me");
      return res;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/listings", { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings", "mine"] });
      setName("");
      setDescription("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (listingId: string) => apiRequest("DELETE", `/api/listings/${listingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings", "mine"] });
    },
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createMutation.mutateAsync();
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>Manage Listings</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Listings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="listingName">Listing Name</Label>
            <Input id="listingName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Neighborhood Yard Sale" />
            <Label htmlFor="listingDesc">Description (optional)</Label>
            <Input id="listingDesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Helps people know what this is for" />
            <Button onClick={handleCreate} disabled={creating || !name.trim()} className="mt-2">
              <Plus className="w-4 h-4 mr-2" /> Create Listing
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No listings yet. Create your first one above.</p>
            ) : (
              listings.map((lst) => (
                <Card key={lst.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lst.name}</p>
                        {lst.description && <p className="text-sm text-muted-foreground">{lst.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => copyToClipboard(lst.key)}>
                          <Copy className="w-4 h-4 mr-1" /> Copy Key
                        </Button>
                        <a
                          href={`/api/listings/${lst.id}/qrcode`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center"
                        >
                          <Button variant="outline" size="icon" title="QR Code">
                            <QrCode className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(lst.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Key: <code className="select-all">{lst.key}</code>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ListingManagerDialog;
