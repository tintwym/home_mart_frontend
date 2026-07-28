import { useState, useEffect, useCallback, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import type { SharedData } from '@/types';

export type CartItem = {
    id: string;
    listing: {
        id: string;
        title: string;
        image_path: string | null;
        image_url?: string | null;
        price: number;
        condition?: string;
        user: { id: string; name: string; region?: string | null };
    };
};

const getInitialLocalCart = (): CartItem[] => {
    if (typeof window === 'undefined') return [];
    try {
        const saved = localStorage.getItem('homemart_cart');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error('Error reading localStorage cart:', e);
        return [];
    }
};

export function useCart() {
    const { auth } = usePage<SharedData>().props;
    const [items, setItems] = useState<CartItem[]>(getInitialLocalCart);
    const [isLoading, setIsLoading] = useState(false);
    const mergedGuestRef = useRef(false);

    // Save to localStorage safely
    const saveLocalCart = useCallback((cartItems: CartItem[]) => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('homemart_cart', JSON.stringify(cartItems));
        } catch (e) {
            console.error('Error saving localStorage cart:', e);
        }
    }, []);

    // Fetch latest items from server
    const fetchItems = useCallback(async () => {
        if (!auth?.user) return;

        setIsLoading(true);
        try {
            const response = await fetch('/cart/json');
            if (response.ok) {
                const data: CartItem[] = await response.json();
                setItems(data);
                saveLocalCart(data);
            }
        } catch (error) {
            console.error('Error fetching cart items:', error);
        } finally {
            setIsLoading(false);
        }
    }, [auth?.user, saveLocalCart]);

    // On login: push guest localStorage cart to the server, then refresh.
    useEffect(() => {
        if (!auth?.user) {
            mergedGuestRef.current = false;
            return;
        }
        if (mergedGuestRef.current) return;
        mergedGuestRef.current = true;

        let cancelled = false;
        (async () => {
            const guest = getInitialLocalCart();
            const guestIds = [
                ...new Set(guest.map((g) => g.listing?.id).filter(Boolean)),
            ] as string[];

            for (const listingId of guestIds) {
                if (cancelled) return;
                try {
                    await fetch(`/api/listings/${listingId}/cart`, {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        body: '{}',
                    });
                } catch {
                    // Skip items that fail (sold/own/gone).
                }
            }

            if (!cancelled) {
                await fetchItems();
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [auth?.user, fetchItems]);

    const addToCart = useCallback(
        (listingId: string) => {
            router.post(
                `/listings/${listingId}/cart`,
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        fetchItems();
                    },
                },
            );
        },
        [fetchItems],
    );

    const removeFromCart = useCallback(
        (listingId: string) => {
            if (!auth?.user) {
                const current = getInitialLocalCart();
                const filtered = current.filter(
                    (item) => item.listing.id !== listingId,
                );
                setItems(filtered);
                saveLocalCart(filtered);
                return;
            }

            router.delete(`/listings/${listingId}/cart`, {
                preserveScroll: true,
                onSuccess: () => {
                    fetchItems();
                },
            });
        },
        [auth?.user, fetchItems, saveLocalCart],
    );

    return {
        items,
        isLoading,
        fetchItems,
        addToCart,
        removeFromCart,
    };
}
