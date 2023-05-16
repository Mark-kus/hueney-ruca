import { useState, useEffect } from "react";
import { supabase } from "utils/supabase";
import Swal from "sweetalert2";

const CabinGallery = ({ type, name }) => {
  const urlBucket =
    "https://kwmjganrkoyleqdillhu.supabase.co/storage/v1/object/public/cabanas_gallery";
  const newName =
    name && name.startsWith("Cabaña ") ? name.replace("Cabaña ", "") : name;

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageDeleted, setImageDeleted] = useState(false);

  // console.log(files);

  const listFiles = async () => {
    try {
      setLoading(true);

      const { data: files, error } = await supabase.storage
        .from("cabanas_gallery")
        .list(`${type}/${newName}`);

      if (error) {
        console.error(error);
        return [];
      }

      const fileList = files.map((file) => {
        const fileUrl = `${urlBucket}/${type}/${newName}/${file.name}`;
        return {
          name: file.name,
          fileUrl: fileUrl,
        };
      });

      console.log(fileList);
      return fileList;
    } catch (error) {
      Swal.fire(errorSwal);
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (file) => {
    setImageDeleted(true);
    Swal.fire({
      title: "¿Desea eliminar esta imagen para siempre?",
      text: "Ya no se podrá recuperar una vez confirmado",
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      confirmButtonText: "Sí, eliminar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { data, error } = await supabase.storage
          .from("cabanas_gallery")
          .remove(`${type}/${newName}/${file.name}`);

        if (error) {
          console.error(error);
          Swal.fire({
            title: "Error!",
            text: error.message,
            icon: "warning",
          });
          return;
        }

        const newFiles = files.filter((f) => f.name !== file.name);
        setFiles(newFiles);

        Swal.fire({
          title: "Se eliminó la imagen correctamente",
          icon: "success",
        });
      }
    });
  };

  useEffect(() => {
    const getFiles = async () => {
      const fileList = await listFiles();
      setFiles(fileList);
    };
    getFiles();
  }, []);

  const handleSaveChanges = async () => {
    try {
      setLoading(true);

      const { data: existingData, error: existingError } = await supabase
        .from("images")
        .select()
        .eq("alt", name);

      if (existingError) {
        throw new Error(existingError.message);
      }

      let responseData = {};
      if (existingData && existingData.length > 0) {
        responseData = existingData[0];
      }

      const dataJSON = {
        alt: name,
        url: files,
      };

      const { data, error } = await supabase
        .from("images")
        .upsert({ ...responseData, ...dataJSON });

      if (error) {
        throw new Error(error.message);
      }
      Swal.fire({
        title: "Imágenes guardadas correctamente",
        icon: "success",
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Error",
        text: error.message,
        icon: "warning",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Imagenes de la cabaña {name}:</h1>
      {files.length > 1 ? (
        <>
          <div className="flex flex-wrap">
            {files.map((file, index) => (
              <div key={index} className="w-1/4 p-2">
                <img
                  src={`${urlBucket}/${type}/${newName}/${file.name}`}
                  alt={file.name}
                  className="max-w-full rounded-md shadow-sm"
                  width="100px"
                  height="100px"
                />
                <p>{file.name}</p>
                <button
                  onClick={() => handleDelete(file)}
                  className="px-1 py-0.5 bg-red-500 text-white rounded-md hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
          {imageDeleted && (
            <button
              className=" px-1 py-0.5 bg-blue-400 text-white rounded-md"
              onClick={handleSaveChanges}
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          )}
        </>
      ) : (
        <p>No hay imágenes en este bucket</p>
      )}
    </div>
  );
};

export default CabinGallery;
