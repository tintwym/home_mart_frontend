import CheckoutC2c from '@/pages/checkout/c2c';

type OrderItem = {
    id: string;
    listing_id: string;
    quantity: number;
    price: number;
    listing: {
        id: string;
        title: string;
        image_path: string | null;
        image_url?: string | null;
        price: number;
        meetup_location?: string | null;
        user?: {
            id: string;
            name?: string;
            region?: string | null;
        } | null;
    };
};

type Order = {
    id: string;
    total: number;
    items: OrderItem[];
};

export default function CheckoutVietnam({ order }: { order: Order }) {
    return <CheckoutC2c order={order} region="VN" />;
}
