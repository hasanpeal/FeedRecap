import React, { useState } from "react";
import Image from "next/image";
import A1 from "@/public/A1.png";
import A2 from "@/public/A2.png";
import A3 from "@/public/A3.png";
import A4 from "@/public/A4.png";
import "@/components/courasel.css";

const Carousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [A1, A2, A3, A4];

  const handlePrev = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <div className="carousel-container">
      <div
        className="carousel-wrapper"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((src, index) => (
          <div className="carousel-item" key={index}>
            <Image src={src} alt={`Slide ${index + 1}`} layout="responsive" />
          </div>
        ))}
      </div>
      <button className="carousel-button prev" onClick={handlePrev}>
        ❮
      </button>
      <button className="carousel-button next" onClick={handleNext}>
        ❯
      </button>
    </div>
  );
};

export default Carousel;
