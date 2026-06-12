import React from "react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-auto grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto items-stretch",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-sm p-4 bg-white border border-gray-200/50 flex flex-col space-y-4",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:-translate-y-1 transition duration-200 mt-auto">
        {icon}
        <div className="font-sans font-semibold text-gray-900 mb-1 mt-2">
          {title}
        </div>
        <div className="font-sans font-normal text-gray-500 text-sm">
          {description}
        </div>
      </div>
    </motion.div>
  );
};
