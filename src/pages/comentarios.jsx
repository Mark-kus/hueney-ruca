import axios from "axios";
import Header from "components/Header";
import { useEffect, useState } from "react";
import Slider from "react-slick";

const settings = {
  dots: true,
  infinite: true,
  slidesToShow: 3,
  arrows: false,
  accessibility: true,
	autoplay: true,
	autoplaySpeed: 5000,
	// adaptiveHeight: true,
	responsive: [
		{
			breakpoint: 1024,
			settings: {
				slidesToShow: 2,
				dots: true,
			},
		},
		{
			breakpoint: 600,
			settings: {
				slidesToShow: 1,
				dots: true,
			},
		},
	],
}

export default function Comentario() {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await axios.get("/api/comments");
        setComments(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchComments();
  }, []);

  return (
    <>
      <Header />
      <section className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
					<h2 className="text-brand-green text-4xl font-bold mb-6 mt-8">
            Nuestros huespedes!
          </h2>

          <div className="text-black font-medium text-xl pr-8">
            Nuestros huéspedes son nuestra prioridad, ofrecemos una experiencia
            acogedora, cálida y auténtica para cada uno de nuestros visitantes.
            Queremos que te sientas como en casa!
          </div>

          <Slider {...settings} className="h-[200px] pb-10 mt-14">
            {comments.map((comment, i) => (
              <div
                key={i}
								className="px-8 h-full">
								<div className="text-center h-full">
									<div className="leading-tight">
										{/* {comment.review} */}
										{ `${comment.review.slice(0, 200)}${comment.review.length > 200 ? '...' : ''}` }
									</div>
									
									<div className="flex gap-x-1 justify-center mt-3">
										{[...Array(comment.stars)].map((_, i) => (
											<i key={i} className="ri-star-fill text-brand-yellow"></i>
										))}
									</div>


									{ comment.profiles.full_name ? 
										(<div 
											className="text-brand-green font-semibold text-sm mt-1">
											{ comment.profiles.full_name }
										</div>) : null }
									
								</div>
              </div>
            ))}
          </Slider>
        </div>
      </section>
    </>
  );
}
