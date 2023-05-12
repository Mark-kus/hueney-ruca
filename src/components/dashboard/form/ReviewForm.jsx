import { useState } from "react";
import BtnSubmit from "./BtnSubmit";
import Preload from "../PreloadSmall";

export default function ReviewForm({ review }) {
  const [status, setStatus] = useState(false);
  const [inputs, setInputs] = useState({
    username: review?.profiles?.username || "",
    email: review?.profiles?.email || "",
    stars: review?.stars || 3,
    review: review?.review || "",
    approved: review?.approved || true,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs({
      ...inputs,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(true);
    if (review?.id) {
      // actualizar
    } else {
      // crear
    }
  };

  return (
    <div className={status ? "" : ""}>
      <Preload loading={status} />
      <form onSubmit={handleSubmit}>
        <div className="mb-5.5 flex flex-col gap-5.5 sm:flex-row">
          <div className="w-full sm:w-1/2">
            <label
              htmlFor="username"
              className="mb-3 block text-sm font-medium text-black"
            >
              Nombre
            </label>

            <div className="relative">
              <input
                className="w-full rounded border border-stroke bg-gray py-3 px-4.5 font-medium text-black focus:border-primary focus-visible:outline-none"
                type="text"
                name="username"
                id="username"
                value={inputs.username}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="w-full sm:w-1/2">
            <label
              htmlFor="email"
              className="mb-3 block text-sm font-medium text-black"
            >
              E-mail
            </label>

            <input
              className="w-full rounded border border-stroke bg-gray py-3 px-4.5 font-medium text-black focus:border-primary focus-visible:outline-none"
              type="email"
              name="email"
              id="email"
              value={inputs.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex gap-x-6 items-center my-6">
          <label className="block text-sm font-medium text-black">
            Estrellas
          </label>

          <div x-data="{ checkboxToggle: '' }" className="flex gap-x-5">
            {[...Array(5)].map((_, i) => (
              <div key={i + 1} className="relative flex items-center">
                <input
                  type="radio"
                  name="stars"
                  id={i + 1}
                  value={i + 1}
                  className="checked:bg-slate-500 h-5 w-5 mr-1 border cursor-pointer appearance-none rounded-full"
                  onChange={handleChange}
                />
                <label htmlFor={i + 1} className="cursor-pointer select-none">
                  {i + 1}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5.5">
          <label
            className="mb-3 block text-sm font-medium text-black"
            htmlFor="review"
          >
            Comentario
          </label>
          <div className="relative">
            <textarea
              className="w-full rounded border border-stroke bg-gray py-3 pl-4.5 pr-4.5 font-medium text-black focus:border-primary focus-visible:outline-none resize-none"
              name="review"
              id="review"
              rows="6"
              placeholder="Escribe tu comentario aquí"
              value={inputs.review}
              onChange={handleChange}
            ></textarea>
          </div>
        </div>

        <div className="flex gap-x-6 items-center my-6">
          <label className="block text-sm font-medium text-black">
            Aprobado
          </label>

          <div x-data="{ checkboxToggle: '' }" className="flex gap-x-5">
            {["SI", "NO"].map((approved, i) => (
              <div key={i} className="relative flex items-center">
                <input
                  type="radio"
                  name="approved"
                  id={approved}
                  value={approved}
                  className="checked:bg-slate-500 h-5 w-5 mr-1 border cursor-pointer appearance-none rounded-full"
                  onChange={handleChange}
                />
                <label
                  htmlFor={approved}
                  className="cursor-pointer select-none"
                >
                  {approved}
                </label>
              </div>
            ))}
          </div>
        </div>
        <BtnSubmit cancel_url="/admin/reviews" />
      </form>
    </div>
  );
}
