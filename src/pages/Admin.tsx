// ...existing code...
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Package, Users, RefreshCw, Trash2, Home } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

// Local types matching backend DTOs
type Product = {
  id: string;
  title: string;
  description: string;
  price: number; // cents
  status: "active" | "sold" | "removed" | string;
  accountId: string;
};

type User = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role: "user" | "admin" | string;
};

export default function Admin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check authentication and admin role - redirect if not authenticated or not admin
  const { data: user, isLoading: isAuthLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", "/api/auth/me");
      } catch (error) {
        // Not authenticated
        return null;
      }
    },
  });

  useEffect(() => {
    if (!isAuthLoading && !user) {
      // Save current path to redirect back after login
      sessionStorage.setItem("postAuthRedirect", "/admin");
      setLocation("/");
    } else if (!isAuthLoading && user && user.role !== "admin") {
      // Not an admin, redirect to home
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access this page.",
      });
      setLocation("/home");
    }
  }, [user, isAuthLoading, setLocation, toast]);

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated or not admin (will redirect)
  if (!user || user.role !== "admin") {
    return null;
  }


  const { data: allProducts = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("DELETE", `/api/admin/products/${productId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({
        title: "Product deleted",
        description: "The product has been permanently deleted",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete product",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role updated",
        description: "User role has been updated successfully",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user role",
      });
    },
  });

  // No authentication logic needed; always show admin panel

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const activeProducts = allProducts.filter(p => p.status === "active");
  const soldProducts = allProducts.filter(p => p.status === "sold");
  const removedProducts = allProducts.filter(p => p.status === "removed");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-foreground" data-testid="text-admin-title">
                Admin Panel
              </h1>
              <Badge variant="secondary" data-testid="badge-admin">
                Admin
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="button-home">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              {/* Log Out button removed for public SPA */}
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="products" data-testid="tab-products">
              Products ({allProducts.length})
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              Users ({allUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>
                  Manage products from all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : allProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No products found
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Active: {activeProducts.length}</span>
                      <span>Sold: {soldProducts.length}</span>
                      <span>Removed: {removedProducts.length}</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allProducts.map((product) => (
                          <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                            <TableCell className="font-medium">{product.title}</TableCell>
                            <TableCell>{formatPrice(product.price)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  product.status === "active"
                                    ? "default"
                                    : product.status === "sold"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {product.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {product.accountId?.slice(0, 8) || "N/A"}...
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteProductMutation.mutate(product.id)}
                                disabled={deleteProductMutation.isPending}
                                data-testid={`button-delete-product-${product.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  Manage user roles and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">{user.email || "N/A"}</TableCell>
                          <TableCell>
                            {user.firstName || user.lastName
                              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {user.role === "user" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateUserRoleMutation.mutate({
                                      userId: user.id,
                                      role: "admin",
                                    })
                                  }
                                  disabled={updateUserRoleMutation.isPending}
                                  data-testid={`button-make-admin-${user.id}`}
                                >
                                  Make Admin
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updateUserRoleMutation.mutate({
                                      userId: user.id,
                                      role: "user",
                                    })
                                  }
                                  disabled={updateUserRoleMutation.isPending}
                                  data-testid={`button-remove-admin-${user.id}`}
                                >
                                  Remove Admin
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
