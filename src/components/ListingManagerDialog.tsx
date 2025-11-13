import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { Plus, Trash2, FolderOpen, Globe } from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";
import type { Listing } from "../types/listing";
import { ShareProductDialog } from "./ShareProductDialog";

interface ListingManagerDialogProps {
  triggerClassName?: string;
}

export function ListingManagerDialog({ triggerClassName }: ListingManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPickupAddress, setEditPickupAddress] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      return apiRequest("POST", "/api/listings", { name, description, pickupAddress: pickupAddress || undefined, isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings", "mine"] });
      setName("");
      setDescription("");
      setPickupAddress("");
      setIsPublic(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      return apiRequest("PUT", `/api/listings/${editingId}`, {
        name: editName || undefined,
        description: editDescription || undefined,
        pickupAddress: editPickupAddress || undefined,
        isPublic: editIsPublic,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listings", "mine"] });
      setEditingId(null);
      setEditName("");
      setEditDescription("");
      setEditPickupAddress("");
      setEditIsPublic(false);
    },
  });

  const beginEdit = (lst: Listing) => {
    setEditingId(lst.id);
    setEditName(lst.name);
    setEditDescription(lst.description || "");
    setEditPickupAddress(lst.pickupAddress || "");
    setEditIsPublic(lst.isPublic || false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setUpdating(true);
    try {
      await updateMutation.mutateAsync();
    } finally {
      setUpdating(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDescription("");
    setEditPickupAddress("");
    setEditIsPublic(false);
  };


  const deleteMutation = useMutation({
    mutationFn: async (listingId: string) => apiRequest("DELETE", `/api/listings/${listingId}`),
    onMutate: async (listingId) => {
      setDeletingId(listingId);
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/listings", "mine"] });
      
      // Snapshot the previous value
      const previousListings = queryClient.getQueryData(["/api/listings", "mine"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/listings", "mine"], (old: Listing[] = []) =>
        old.filter((listing) => listing.id !== listingId)
      );
      
      return { previousListings };
    },
    onError: (err, listingId, context) => {
      // Rollback to the previous value on error
      queryClient.setQueryData(["/api/listings", "mine"], context?.previousListings);
    },
    onSettled: () => {
      setDeletingId(null);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <FolderOpen className="w-4 h-4 mr-2" /> Manage Listings
        </Button>
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
            <Label htmlFor="listingPickup" className="mt-2">Pickup Address (optional)</Label>
            <Input id="listingPickup" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="123 Main St" />
            <p className="text-[11px] text-primary font-bold">Address is shared only to the buyers you approve.</p>
            <div className="flex items-center justify-between mt-3 p-3 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor="isPublic" className="text-sm font-medium">Make this listing public</Label>
                <p className="text-xs text-muted-foreground">Public listings can be accessed without a key</p>
              </div>
              <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
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
                    {editingId === lst.id ? (
                      <div className="space-y-2">
                        <Label className="text-xs">Name</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        <Label className="text-xs">Description</Label>
                        <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                        <Label className="text-xs">Pickup Address</Label>
                        <Input value={editPickupAddress} onChange={(e) => setEditPickupAddress(e.target.value)} placeholder="123 Main St" />
                        <div className="flex items-center justify-between mt-2 p-2 border rounded">
                          <div className="flex-1">
                            <Label htmlFor={`editPublic-${lst.id}`} className="text-xs font-medium">Public listing</Label>
                            <p className="text-[10px] text-muted-foreground">No key required</p>
                          </div>
                          <Switch id={`editPublic-${lst.id}`} checked={editIsPublic} onCheckedChange={setEditIsPublic} />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" onClick={handleUpdate} disabled={updating || !editName.trim()}>
                            {updating ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={updating}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{lst.name}</p>
                              {lst.isPublic && (
                                <Badge variant="secondary" className="text-xs">
                                  <Globe className="w-3 h-3 mr-1" /> Public
                                </Badge>
                              )}
                            </div>
                            {lst.description && <p className="text-sm text-muted-foreground">{lst.description}</p>}
                            {lst.pickupAddress && (
                              <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Pickup:</span> {lst.pickupAddress}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <ShareProductDialog 
                              listingId={lst.id} 
                              listingKey={lst.key} 
                              listingName={lst.name}
                              variant="icon"
                            />
                            <Button variant="outline" size="icon" onClick={() => beginEdit(lst)} title="Edit">
                              ✎
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="icon" 
                              onClick={() => deleteMutation.mutate(lst.id)}
                              disabled={deletingId === lst.id}
                              title={deletingId === lst.id ? "Deleting..." : "Delete"}
                            >
                              {deletingId === lst.id ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
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
