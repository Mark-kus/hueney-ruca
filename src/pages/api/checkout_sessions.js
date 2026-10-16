import { requireSession } from "helpers/apiGuard";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // La sesión de checkout la crea siempre un usuario logueado
    const auth = await requireSession(req, res);
    if (!auth) return;

    if (req.method === "POST") {
        const { price_id, night, roomId, booking_id } = req.body;
        try {
            // El price_id debe pertenecer a la cabaña: evita pagar un precio arbitrario
            const { data: room, error } = await auth.supabase
                .from("rooms")
                .select("id, stripe_product_id, suspended, deleted_at")
                .eq("id", roomId)
                .maybeSingle();

            if (error) throw error;
            if (!room || room.suspended || room.deleted_at) {
                return res.status(400).json({ error: "Cabaña no disponible" });
            }

            const product = await stripe.products.retrieve(room.stripe_product_id);
            const defaultPriceId =
                typeof product.default_price === "string"
                    ? product.default_price
                    : product.default_price?.id;

            if (defaultPriceId !== price_id) {
                return res.status(400).json({ error: "Precio inválido" });
            }

            // Create Checkout Sessions from body params.
            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
                        price: price_id,
                        quantity: night,
                    },
                ],
                mode: "payment",
                success_url: `${req.headers.origin}/thank-you?booking_id=${booking_id}&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${req.headers.origin}/checkout/${roomId}`,
            });
            res.json(session);
        } catch (err) {
            res.status(err.statusCode || 500).json(err.message);
        }
    } else if (req.method === "GET") {
        try {
            const session = await stripe.checkout.sessions.retrieve(
                req.query.session_id
            );
            res.json(session);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(500).end("Method Not Allowed");
    }
}
