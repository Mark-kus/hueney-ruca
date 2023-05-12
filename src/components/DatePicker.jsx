import { addDays } from "helpers/dateProcessing";
import React, { useEffect, useState } from "react";
import Datepicker from "react-tailwindcss-datepicker";

export default function DatePicker({ filters, setFilters, disabledDates }) {
    //fechas Iniciales y estado del componente importado
    const [dates, setDates] = useState({
        startDate: new Date(),
        endDate: addDays(new Date(), 1),
    });
    //console.log(disabledDates);
    //Interaccion entre las fechas del componente y las externas
    useEffect(() => {
        setFilters({
            ...filters,
            checkin: dates.startDate,
            checkout: dates.endDate,
        });
    }, [dates]);

    const handleDateChange = (newDates) => {
        //console.log(newDates);
        setDates(newDates);
    };
    return (
        <div>
            <Datepicker
                value={dates}
                onChange={handleDateChange}
                disabledDates={disabledDates.map((el) => {
                    return { startDate: el.checkin, endDate: el.checkout };
                })}
            />
        </div>
    );
}
