import React from "react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex w-52 flex-col content-center gap-4">
        <div className="skeleton h-60 w-full"></div>
        <div className="skeleton h-2 w-28"></div>
        <div className="skeleton h-2 w-full"></div>
        <div className="skeleton h-2 w-full"></div>
      </div>
    </div>
  );
}
