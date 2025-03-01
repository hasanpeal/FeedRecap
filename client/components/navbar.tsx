"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="bg-black border-b border-gray-800">
      <div className="py-4 px-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center">
          <span className="text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-white to-[#7FFFD4] bg-clip-text text-transparent">
              Feed
            </span>
            <span className="text-[#7FFFD4]">Recap</span>
          </span>
        </Link>
        <nav className="space-x-4 flex items-center">
          {/* <Link href="/samplenewsletter">
            <button className="text-[#7FFFD4] font-semibold hover:text-white transition-colors">
              Sample Newsletter
            </button>
          </Link> */}
          {/* Show these buttons only on screens larger than "sm" */}
          <div className="hidden sm:flex items-center space-x-4">
            <Link href="/signin">
              <button className="text-[#7FFFD4] font-semibold hover:text-white transition-colors">
                Sign In
              </button>
            </Link>
            <Link href="/signup">
              <button className="bg-[#7FFFD4] text-black font-semibold px-4 py-2 rounded-full hover:bg-[#00CED1] transition-colors">
                Sign Up
              </button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
