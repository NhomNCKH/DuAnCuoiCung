// src/components/ImageSlider.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Slide {
  id: number;
  image: string;
  title: string;
  description: string;
  link?: string;
}

interface ImageSliderProps {
  slides: Slide[];
  autoPlay?: boolean;
  interval?: number;
}

export default function ImageSlider({
  slides,
  autoPlay = true,
  interval = 5000,
}: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);
  const router = useRouter();

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + slides.length) % slides.length,
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const handleSlideClick = () => {
    if (slides[currentIndex].link) {
      router.push(slides[currentIndex].link);
    }
  };

  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      nextSlide();
    }, interval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, interval, currentIndex]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden group bg-slate-900">
      {/* Container cho ảnh */}
      <div className="relative w-full h-[280px] md:h-[320px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <Image
              src={slides[currentIndex].image}
              alt={slides[currentIndex].title}
              width={1000}
              height={300}
              className="object-contain w-auto h-full max-h-full"
              priority
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Overlay gradient cho text */}
      <div className="absolute inset-0 bg-black/55 pointer-events-none" />

      {/* Slide Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl md:text-2xl font-bold mb-1">
              {slides[currentIndex].title}
            </h3>
            <p className="text-xs md:text-sm text-white/90 mb-3 line-clamp-2">
              {slides[currentIndex].description}
            </p>
            {slides[currentIndex].link && (
              <button
                onClick={handleSlideClick}
                className="px-4 py-1.5 text-sm bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Tìm hiểu thêm
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100 z-20"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100 z-20"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all ${
              currentIndex === index
                ? "w-6 h-1.5 bg-white rounded-full"
                : "w-1.5 h-1.5 bg-white/50 rounded-full hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Auto-play Toggle */}
      <button
        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
        className="absolute top-3 right-3 p-1.5 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100 z-20 text-white text-xs"
      >
        {isAutoPlaying ? "⏸" : "▶"}
      </button>
    </div>
  );
}
 