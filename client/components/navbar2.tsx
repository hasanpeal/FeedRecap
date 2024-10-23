"use client";
import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
export default function Navbar2() {
  const router = useRouter();
  return (
    <header className="shadow-md bg-base-300 rounded-b-xl">
      <div className=" py-4 px-6 flex">
        {/* <div className="text-xl font-bold text-gray-800 flex-grow">Signez</div> */}
        <Link className="text-xl font-bold text-gray-800 flex-grow" href="/">
          FeedRecap{" "}
        </Link>
        <nav className="space-x-4 buttonss">
          <Link href="/aboutus" className="text-gray-800 font-semibold">About Us</Link>
          <button
            onClick={() => {
              const modal = document.getElementById(
                "contact_modal"
              ) as HTMLDialogElement;
              if (modal) {
                modal.showModal();
              }
            }}
            className="text-gray-800 font-semibold"
          >
            Contact Us
          </button>
        </nav>
      </div>
    </header>
  );
}
