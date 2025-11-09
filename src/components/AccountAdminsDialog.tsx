import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Users, Plus, Trash2 } from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface AdminUser { id?: string; email: string; firstName?: string | null; lastName?: string | null; }

export function AccountAdminsDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  // Fetch current user (if needed for display) – no longer needed for accountId when backend derives it.
  const { data: me } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try { return await apiRequest("GET", "/api/auth/me"); } catch { return null; }
    },
  });

  // Fetch admins list without passing accountId (backend resolves from JWT).
  const { data: admins = [], refetch } = useQuery<AdminUser[]>({
    queryKey: ["/api/account/admin/list"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", "/api/account/admin/list");
      } catch {
        return [];
      }
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/account/admin/add", { userEmail: email });
    },
    onSuccess: () => {
      setEmail("");
      toast({ title: "Admin added", description: "They can now manage your listings." });
    refetch();
  queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to add admin" });
    }
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (userEmail: string) => {
      return apiRequest("POST", "/api/account/admin/remove", { userEmail });
    },
    onSuccess: () => {
      toast({ title: "Admin removed", description: "They no longer have manage access." });
    refetch();
  queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Error", description: e?.message || "Failed to remove admin" });
    }
  });

  const canSubmit = /.+@.+\..+/.test(email);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9" data-testid="button-manage-admins">
          <Users className="w-4 h-4 mr-2" /> Manage Admins
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account Admins</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground" data-testid="text-admin-helper">
            Invite trusted family or friends as admins so they can add items, manage listings, and help coordinate pickups.
          </p>
          <div>
            <Label>Add by email</Label>
            <div className="flex gap-2 mt-1">
              <Input placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Button onClick={() => addAdminMutation.mutate()} disabled={!canSubmit || addAdminMutation.isPending}>
                <Plus className="w-4 h-4 mr-1" /> {addAdminMutation.isPending ? 'Adding...' : 'Add'}
              </Button>
            </div>
            {/* No accountId needed; backend derives from auth cookie */}
          </div>

          <div>
            <Label className="mb-2 block">Current admins</Label>
            {admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admins yet.</p>
            ) : (
              <ul className="divide-y border rounded-md">
                {admins.map((a, idx) => (
                  <li key={a.email || idx} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="shrink-0">Admin</Badge>
                      <span className="truncate">{a.email}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeAdminMutation.mutate(a.email)} title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
