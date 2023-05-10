import { useState, useEffect } from 'react'
import gsap from 'gsap'
import Header from '../components/Header'

import Datepicker from '../components/form/Datepicker'
import GuestsSelector from 'components/form/GuestsSelector'
import Link from 'next/link'
import ChatBot from 'components/chatBot/ChatBot'

export default function Home() {

	const [filters, setFilters] = useState({
		guests: 0,
		checkin: null,
		checkout: null,
	})

	const handleFilter = (e) => {
		e.preventDefault();
	}



	useEffect(() => {
		gsap.set('#headerMain', { opacity: 0 })
		gsap.set('#introText', { opacity: 0 })
		gsap.set('#searchForm', { opacity: 0 })
		gsap.set('#landing', { backgroundSize: '150%' })
		gsap.set('#whats-app-icon', { y: 100 })

		gsap.to('#loaderScreenLogo', { opacity: 0, scale: .6, duration: 1.5, delay: 1.5 })
		gsap.to('#loaderScreen', { opacity: 0, duration: 1.5, delay: 2 })
		gsap.set('#loaderScreen', { display: 'none', delay: 2.5 })
		gsap.to('#landing', { backgroundSize: '100%', duration: 1.5, delay: 2 })
		gsap.to('#headerMain', { opacity: 1, y: 0, duration: .7, delay: 2.2 })
		gsap.to('#introText', { opacity: 1, duration: .7, delay: 2.4 })
		gsap.to('#searchForm', { opacity: 1, duration: .7, delay: 2.6 })
		gsap.to('#whats-app-icon', { y: 0, duration: .3, delay: 3.6 })
	}, [])



	return (
		<div
			id="landing"
			className="w-screen h-screen relative overflow-hidden">
				
				<div 
					id="loaderScreen"
					className="bg-brand-olive fixed inset-0 grid place-content-center z-999">
					<img
						id="loaderScreenLogo"
						src="/brand.svg"
						alt="Hueney Ruca"
						className="w-32 md:w-48" />
				</div>

				<Header background="transparent" />

				<div className="bg-black bg-opacity-20 h-screen px-6 grid grid-cols-1 place-content-center inset-0 absolute">
					<div className="max-w-sm mx-auto md:max-w-3xl">
						<h2
							id="introText"
							className="text-white text-3xl font-bold leading-none select-none 
							sm:text-4xl 
							md:text-5xl md:leading-tight">
							Disfrutá tus vacaciones en nuestro complejo de cabañas
						</h2>

						<div 
							id="searchForm"
							className="bg-white w-full mt-8 rounded-lg md:mt-14">
							<form
								method="post"
								onSubmit={handleFilter}
								className="grid md:flex md:justify-stretched">
									<div className="flex flex-1 items-center gap-x-2 md:basis-32">
											<span className="text-gray-400 text-sm leading-none font-medium w-20 pl-4 md:hidden">
													Personas
											</span>
											<GuestsSelector
													bottom="10"
													filterSetter={setFilters}
													filters={filters}
											/>
									</div>

									<div
											className="border-t border-gray-200 flex-1
								flex items-center gap-x-1
								md:border-l md:basis-32"
									>
											<span className="text-gray-400 text-xs leading-none font-medium w-20 pl-4 md:hidden">
													Desde
											</span>
											<Datepicker
													minDate={new Date()}
													setDate={(e) =>
															setFilters({
																	...filters,
																	checkin: new Date(e),
																	checkout:
																			new Date(e) > filters.checkout
																					? new Date(e)
																					: filters.checkout,
															})
													}
											/>
									</div>

									<div
											className="border-t border-gray-200 flex-1 
								flex items-center gap-x-1 
								md:border-l"
									>
											<span className="text-gray-400 text-xs leading-none font-medium w-20 pl-4 md:hidden">
													Hasta
											</span>
											<Datepicker
													minDate={filters.checkin}
													defaultDate={
															filters.checkout ?? filters.checkin
													}
													setDate={(e) =>
															setFilters({
																	...filters,
																	checkout: new Date(e),
															})
													}
											/>
									</div>

									<div className="px-4 py-2.5 flex-1 text-right">
											<Link
													href={{
															pathname: "/search",
															query: {
																	guests: filters.guests,
																	checkin:
																			filters.checkin === null
																					? undefined
																					: JSON.stringify(
																								filters.checkin
																						),
																	checkout:
																			filters.checkout === null
																					? undefined
																					: JSON.stringify(
																								filters.checkout
																						),
															}, // the data
													}}
											>
													<button className="btn-yellow w-full !rounded md:w-auto">
															Buscar
													</button>
											</Link>
									</div>
							</form>
						</div>
					</div>
				</div>

				<ChatBot />
		</div>
	);
}
