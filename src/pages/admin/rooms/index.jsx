import Layout from "../../../layouts/DashboardLayout";
import Header from "../../../components/dashboard/PageHeader";
import TableHead from "../../../components/dashboard/tables/TableHead";
import Link from "next/link";
import { supabase } from "utils/supabase";
import axios from "axios";
import { useState, useEffect } from "react";

const table_head = [
  { idx: "image", title: "" },
  { idx: "cabin", title: "Cabaña", width: "220px" },
  {
    idx: "total-booking-2023",
    title: "Reservas totales (2023)",
    width: "150px",
  },
  { idx: "actions", title: "Acciones" },
];

export default function Dashboard({ rooms }) {
  const [roomList, setRoomList] = useState(rooms);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    axios
      .get("/api/booking")
      .then((response) => {
        setBookings(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const totalBookings = (id) => {
    const counter = bookings.filter((booking) => booking.room_id === id).length;
    return counter;
  };

  const handleDelete = async (id) => {
    const confirmation = window.confirm(
      "¿Está seguro que desea eliminar este registro?"
    );
    if (confirmation) {
      await axios.delete(`/api/cabanas/${id}`);
      alert(`La cabana ha sido eliminada correctamente`);
      setRoomList(roomList.filter((room) => room.id !== id));
    }
  };

  return (
    <Layout>
      <Header
        title="Cabañas"
        breadcrumbs={
          <>
            <li>/</li>
            <li className="text-primary">Cabañas</li>
          </>
        }
      >
        <Link
          href="/admin/rooms/create"
          className="inline-flex items-center justify-center rounded-md bg-primary bg-opacity-70 py-1.5 px-4 text-sm text-center font-medium text-white hover:bg-opacity-90"
        >
          Nueva cabaña
        </Link>
      </Header>

      <div className="flex flex-col gap-10">
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default  sm:px-7.5 xl:pb-1">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
              <TableHead data={table_head} />

              <tbody>
                {roomList &&
                  roomList.map((room) => (
                    <tr key={room.id}>
                      <td className="border-b border-[#eee] py-5 px-4">
                        <div className="h-12.5 w-15 rounded-md">
                          <img src="../product-04.png" alt="Product" />
                        </div>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4">
                        <h5 className="font-medium text-black">{room.name}</h5>
                        <p className="text-sm">disponible?</p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4">
                        <p className="text-black">{totalBookings(room.id)}</p>
                      </td>
                      <td className="border-b border-[#eee] py-5 px-4">
                        <div className="flex items-center space-x-3.5">
                          <a
                            className="hover:text-primary"
                            href={`/admin/rooms/edit?id=${room.id}`}
                          >
                            <i className="ri-edit-line text-xl leading-none"></i>
                          </a>
                          <button
                            onClick={() => handleDelete(room.id)}
                            className="hover:text-primary"
                          >
                            <i className="ri-close-circle-line text-xl leading-none"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      rooms: rooms,
    },
  };
}
