import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getViewHistory, removeFromHistory, clearViewHistory } from '@/lib/viewHistory';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, X, Trash2, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Listing } from '@/types/listing';
import { Link } from 'wouter';

export function RecentlyViewed() {
  const [history, setHistory] = useState(getViewHistory());
  const [showAll, setShowAll] = useState(false);

  // Refresh history when component mounts or when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setHistory(getViewHistory());
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Fetch listing details for recently viewed items
  const listingIds = history.slice(0, showAll ? 20 : 5).map(item => item.listingId);
  
  const { data: listings = [] } = useQuery<Listing[]>({
    queryKey: ['/api/listings/batch', listingIds],
    queryFn: async () => {
      if (listingIds.length === 0) return [];
      
      // Fetch listings one by one
      const promises = listingIds.map(id => 
        apiRequest('GET', `/api/listings/${id}`).catch(() => null)
      );
      const results = await Promise.all(promises);
      return results.filter((l): l is Listing => l !== null);
    },
    enabled: listingIds.length > 0,
  });

  const handleRemove = (productId: string) => {
    removeFromHistory(productId);
    setHistory(getViewHistory());
  };

  const handleClearAll = () => {
    if (confirm('Clear all recently viewed items?')) {
      clearViewHistory();
      setHistory([]);
    }
  };

  if (history.length === 0) {
    return null;
  }

  const displayCount = showAll ? history.length : Math.min(5, history.length);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Recently Viewed</h2>
          <Badge variant="secondary">{history.length}</Badge>
        </div>
        <div className="flex gap-2">
          {history.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `Show All (${history.length})`}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {history.slice(0, displayCount).map((item) => {
          const product = products.find(p => p.id === item.productId);
          
          if (!product) {
            return (
              <Card key={item.productId} className="opacity-50">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={item.productId} className="group relative hover:shadow-md transition-shadow">
              <button
                onClick={() => handleRemove(item.productId)}
                className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove from history"
              >
                <div className="bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-destructive/10">
                  <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </div>
              </button>

              <a href={`#product-${product.id}`} className="block">
                <CardContent className="p-4">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0].url}
                      alt={product.title}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted rounded-md mb-3 flex items-center justify-center">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                  
                  <h3 className="font-medium text-sm line-clamp-2 mb-1">
                    {product.title}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </span>
                    <Badge variant={product.status === 'AVAILABLE' ? 'default' : 'secondary'} className="text-xs">
                      {product.status}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Viewed {formatDistanceToNow(item.viewedAt, { addSuffix: true })}
                  </p>
                </CardContent>
              </a>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
