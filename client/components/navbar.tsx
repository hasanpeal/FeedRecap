"use client";
import Link from "next/link";
import React from "react";

export default function Navbar() {
  return (
    <header className="bg-white shadow-md">
      <div className=" py-4 px-6 flex">
        <Link href="/" className="text-xl font-bold text-gray-800 flex-grow">
          FeedRecap
        </Link>
        <nav className="space-x-4 buttonss">
          <Link href="/signin">
            <button className="text-gray-800 font-semibold sButton">
              Sign In
            </button>
          </Link>
          <Link href="/signup">
            <button className="text-gray-800 font-semibold">Sign Up</button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
