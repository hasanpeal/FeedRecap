"use client";
import Link from "next/link";
import React, { useRef } from "react";
import emailjs from "@emailjs/browser";
import toast, { Toaster } from "react-hot-toast";

export default function Footer2() {
  const form = useRef(null);

  const sendEmail = (e: any) => {
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
      <footer className="bg-base-300 text-gray-800 font-semibold py-6 rounded-t-xl">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; {new Date().getFullYear()} FeedRecap. All rights reserved</p>
          <nav className="space-x-4 mt-4">
            <Link href="/aboutus">
              <button>About Us</button>
            </Link>
            <button
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
      <dialog id="contact_modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
              ✕
            </button>
          </form>
          <form ref={form} onSubmit={sendEmail}>
            <label className="block text-left mb-2">Name</label>
            <input
              type="text"
              name="user_name"
              className="input input-bordered w-full mb-4"
            />
            <label className="block text-left mb-2">Email</label>
            <input
              type="email"
              name="user_email"
              className="input input-bordered w-full mb-4"
            />
            <label className="block text-left mb-2">Message</label>
            <textarea
              name="message"
              className="textarea textarea-bordered w-full mb-4"
            ></textarea>
            <button className="btn btn-primary w-full" type="submit">
              Submit
            </button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
