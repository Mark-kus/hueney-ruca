import Swal from "sweetalert2";
import { supabase } from "utils/supabase";
const stripe = require("stripe")(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

const uploadImages = async (images, id) => {
    const totalFiles = images.length;
    let uploadedFiles = 0;

    for (const file of images) {
        const { data, error } = await supabase.storage
            .from("cabanas_gallery")
            .upload(`${id}/` + file.name, file);

        if (data) {
            uploadedFiles++;
        } else if (error) {
            console.log(error);
            Swal.fire(error.message);
            return;
        }
    }

    if (uploadedFiles !== totalFiles) {
        Swal.fire("Algunas imagenes no pudieron cargarse", "", "warning");
    }
}

export default async function manageCabin(form, images, id) {
    //creacion en stripe
    if (id) {
        const { data: upRoom, error } = await supabase
            .from("rooms")
            .update(form)
            .eq("id", id)
            .select(`*`)
            .single();
        if (error) {
            throw error;
        } //Update en stripe
        const productToUpdate = await stripe.products.retrieve(
            upRoom.stripe_product_id
        );
        const oldPriceId = productToUpdate.default_price;
        const newPrice = await stripe.prices.create({
            product: upRoom.stripe_product_id,
            unit_amount: parseInt(form.price) * 100,
            currency: "ars",
        });
        await stripe.products.update(upRoom.stripe_product_id, {
            default_price: newPrice.id,
        });
        await stripe.prices.update(oldPriceId, {
            active: false,
        });

        if (images.length) await uploadImages(images, id)

        return upRoom;
    } else {
        const newCabana = await stripe.products.create({
            name: form.name,
            description: form.description,
            metadata: {
                type: form.type,
                rooms: form.rooms,
                capacity: form.capacity,
                beds: form.beds,
                price_metadata: form.price,
            },
        });
        //Creacion del precio
        const newCabanaPrice = await stripe.prices.create({
            product: newCabana.id,
            unit_amount: parseInt(form.price) * 100,
            currency: "ars",
        });
        ////////////
        const insertPrice = await stripe.products.update(newCabana.id, {
            default_price: newCabanaPrice.id,
        });

        ////////////
        form.stripe_product_id = newCabana.id;
        //Creacion en base de datos
        const { data: postRoom, error } = await supabase
            .from("rooms")
            .insert([form])
            .select();

        if (error) {
            throw error;
        }

        if (images.length) await uploadImages(images, postRoom[0].id)

        return postRoom;
    }
}