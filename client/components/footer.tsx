"use client";
import Link from "next/link";
import type React from "react";
import { useRef } from "react";
import emailjs from "@emailjs/browser";
import toast, { Toaster } from "react-hot-toast";

export default function Footer() {
  const form = useRef<HTMLFormElement>(null);

  const sendEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (form.current) {
      emailjs
        .sendForm(
          process.env.NEXT_PUBLIC_SERVICE_ID || "",
          process.env.NEXT_PUBLIC_TEMPLATE_ID || "",
          form.current,
          {
            publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY,
          }
        )
        .then(
          () => {
            toast.success("Email sent successfully");
          },
          (error) => {
            console.log("FAILED...", error.text);
            toast.error("Failed to send email");
          }
        );
    }
  };

  return (
    <div>
      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-[#7FFFD4] font-semibold">
              &copy; {new Date().getFullYear()} FeedRecap. All rights reserved
            </p>
          </div>
          <nav className="space-x-6">
            <Link href="/aboutus">
              <button className="text-white hover:text-[#7FFFD4] transition-colors">
                About Us
              </button>
            </Link>
            <button
              className="text-white hover:text-[#7FFFD4] transition-colors"
              onClick={() => {
                const modal = document.getElementById(
                  "contact_modal"
                ) as HTMLDialogElement;
                if (modal) {
                  modal.showModal();
                }
              }}
            >
              Contact Us
            </button>
          </nav>
        </div>
      </footer>

      <Toaster />

      {/* Contact Modal */}
      <dialog
        id="contact_modal"
        className="modal p-4 rounded-lg bg-[#111] border border-gray-800 text-white"
      >
        <div className="modal-box bg-[#111] p-6 w-full max-w-md mx-auto">
          <form method="dialog" className="absolute right-2 top-2">
            <button className="text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg mb-4 text-[#7FFFD4]">Contact Us</h3>
          <form ref={form} onSubmit={sendEmail} className="space-y-4">
            <div>
              <label className="block text-left mb-2 text-gray-300">Name</label>
              <input
                type="text"
                name="user_name"
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] text-white"
                required
              />
            </div>
            <div>
              <label className="block text-left mb-2 text-gray-300">
                Email
              </label>
              <input
                type="email"
                name="user_email"
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] text-white"
                required
              />
            </div>
            <div>
              <label className="block text-left mb-2 text-gray-300">
                Message
              </label>
              <textarea
                name="message"
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7FFFD4] text-white h-32"
                required
              ></textarea>
            </div>
            <button
              className="w-full bg-[#7FFFD4] text-black font-semibold py-2 rounded-md hover:bg-[#00CED1] transition-colors"
              type="submit"
            >
              Submit
            </button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
