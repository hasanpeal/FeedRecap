"use client";
import Link from "next/link";
import React, { useRef } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

export default function Footer2() {
  const form = useRef<HTMLFormElement | null>(null);

  const sendEmail = async (e: any) => {
    e.preventDefault();

    if (!form.current) return;

    const formEl = form.current as HTMLFormElement;
    const name = (formEl.elements.namedItem("user_name") as HTMLInputElement)
      ?.value;
    const email = (formEl.elements.namedItem("user_email") as HTMLInputElement)
      ?.value;
    const message = (formEl.elements.namedItem("message") as HTMLTextAreaElement)
      ?.value;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER}/contact`,
        { name, email, message },
        { headers: { Authorization: token ? `Bearer ${token}` : "" } }
      );
      toast.success("Email sent successfully");
      const modal = document.getElementById("contact_modal") as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      console.error("FAILED...", error);
      toast.error("Failed to send email");
    }
  };

  return (
    <div>
      {/* Footer */}
      <footer className="bg-base-300 text-gray-800 font-semibold py-6 rounded-t-xl">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>&copy; {new Date().getFullYear()} FeedRecap. All rights reserved</p>
          <nav className="space-x-4 mt-4">
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
