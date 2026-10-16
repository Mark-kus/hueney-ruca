import axios from "axios";
import Swal from "sweetalert2";
import { supabase } from "utils/supabase";

const uploadImages = async (images, id) => {
    const paths = [];

    for (const file of images) {
        const { data, error } = await supabase.storage
            .from("cabanas_gallery")
            .upload(`${id}/` + file.name, file);

        if (data) {
            paths.push({
                name: file.name,
                path: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cabanas_gallery/${data.path}`
            })
        } else if (error) {
            console.log(error);
            Swal.fire(error.message);
            throw error;
        }
    }

    return paths;
}

/**
 * Alta/baja de cabañas.
 * La creación/actualización del product y price de Stripe vive en el server
 * (/api/cabanas) — la secret key de Stripe nunca se expone al navegador.
 * Acá sólo se suben las imágenes al bucket público (client-side, como antes).
 */
export default async function manageCabin(form, images, id) {
    if (id) {
        const { data: upRoom } = await axios.put("/api/cabanas", {
            form,
            idRoom: id,
        });

        if (images?.length) {
            const newImages = await uploadImages(images, id);
            const { error } = await supabase
                .from("rooms")
                .update({ images: newImages })
                .eq("id", id);
            if (error) console.log(error);
        }

        return upRoom;
    } else {
        const { data: posted } = await axios.post("/api/cabanas", form);
        const room = Array.isArray(posted) ? posted[0] : posted;

        if (images?.length) {
            const newImages = await uploadImages(images, room.id);
            const { error } = await supabase
                .from("rooms")
                .update({ images: newImages })
                .eq("id", room.id);
            if (error) console.log(error);
        }

        return room;
    }
}
